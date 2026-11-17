import os
import json
from loguru import logger
from dotenv import load_dotenv

# Load env variables
env_candidates = [
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.env"),
    os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"),
    "server/.env",
    "./server/.env",
    ".env",
    "../.env",
]
for env_candidate in env_candidates:
    if os.path.exists(env_candidate):
        load_dotenv(env_candidate, override=True)
        break

from pipecat.adapters.schemas.function_schema import FunctionSchema
from pipecat.adapters.schemas.tools_schema import ToolsSchema
from pipecat.frames.frames import LLMRunFrame, InputTextRawFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.worker import PipelineParams, PipelineWorker, ProcessorUnusablePolicy
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    UserTurnMessageAddedMessage,
    AssistantTurnStoppedMessage,
)
from pipecat.runner.types import RunnerArguments
from pipecat.services.google.gemini_live.llm import GeminiLiveLLMService
from pipecat.services.llm_service import FunctionCallParams
from pipecat.transports.base_transport import BaseTransport, TransportParams
from pipecat.transports.smallwebrtc.connection import SmallWebRTCConnection
from pipecat.transports.smallwebrtc.transport import SmallWebRTCTransport
from pipecat.workers.runner import WorkerRunner

from db_tools import create_order, search_products, get_order_status, get_store_policies

SYSTEM_INSTRUCTION = """
You are BazzarAI's friendly, conversational, and energetic AI Voice Salesman in Bangladesh (ভয়েস সেলসম্যান).
Speak naturally, warmly, and politely in colloquial Bengali (বাংলা) or English, seamlessly adapting to the customer's language.

Interactive Screen & Product Display (সরাসরি স্ক্রিনে ছবি ও প্রোডাক্ট প্রদর্শন):
You are directly connected to the customer's display!
Whenever the customer asks to see products, pictures, photos, or asks what shirts, jackets, pants, hoodies, or items are available (e.g. "ছবি দেখাও", "শার্ট দেখাও", "কি কি শার্ট আছে", "কম দামের প্রোডাক্ট দেখাও", "জ্যাকেট দেখাও", "প্যান্ট দেখাও", "show me pictures", "show me shirts", "কি কি প্রোডাক্ট আছে"):
1. You MUST IMMEDIATELY call the `searchProducts` tool with the appropriate query or category (such as "shirt", "t-shirt", "jacket", "pant", "hoodie", "low price", or specific item name).
2. The system will INSTANTLY fetch the real products and HD photos from the database and visually display them on the customer's screen in interactive cards!
3. Confidently and warmly tell the customer in colloquial Bengali that you are displaying them on their screen right now (e.g., "অবশ্যই! আমি আপনার স্ক্রিনে দারুণ কিছু শার্টের ছবি ও কালেকশন দেখাচ্ছি। দেখুন তো কোনটা পছন্দ হয়?").
4. Mention 1 or 2 featured item names and prices warmly in 1-2 spoken sentences.
5. CRITICAL RULE: NEVER say "দুঃখিত, আমি ভয়েস অ্যাসিস্ট্যান্ট, সরাসরি ছবি দেখাতে পারছি না" or "ছবি দেখাতে পারব না". You CAN and DO display photos and products on their screen via `searchProducts`!

Live Screen Awareness:
You have real-time visual awareness of what the customer is currently looking at on their screen via live page context updates and the `getPageContext` tool.
When the customer asks about "this product", "what am I looking at?", "how much is this?", "available sizes", "what is on this page?", or says "send this to me":
- Refer immediately to the active product and page details or call `getPageContext`.
- Quote exact product names, prices in Bangladeshi Taka (৳/BDT), available sizes, and in-stock counts from this page context.

Your responsibilities:
1. Help customers browse, search, and choose products in the catalog.
2. Quote prices accurately in Bangladeshi Taka (৳/BDT).
3. Delivery policy:
   - Inside Dhaka (ঢাকা সিটি): ৳60 delivery charge, arrives in 24-48 hours.
   - Outside Dhaka (ঢাকার বাইরে): ৳120 delivery charge, arrives in 2-4 business days.
   - Cash on Delivery (ক্যাশ অন ডেলিভারি) available nationwide, plus bKash and card payment.
4. Ordering Process:
   When a customer expresses interest in buying or confirming an order, guide them warmly to provide:
   - Full Name (নাম)
   - 11-digit Phone Number (মোবাইল নম্বর e.g. 017xxxxxxxx)
   - Delivery Address (পূর্ণ ঠিকানা ও শহর/জেলা)
   - Product name and quantity (if they say "this product" / "এটা অর্ডার দিন", use the product currently open on screen).
5. Immediately execute the `createOrder` tool as soon as these details are collected. Once placed, share the order short code (e.g. #ORD-XXXXXX) and total bill with delivery charge.
6. Keep your spoken responses concise (1 to 3 spoken sentences) for natural, fluid spoken dialogue.
"""

def format_page_context(context_dict: dict) -> str:
    if not isinstance(context_dict, dict):
        return str(context_dict)
    
    parts = []
    path = context_dict.get("pathname", "")
    if path:
        parts.append(f"Page Path: {path}")
    
    product = context_dict.get("product")
    if isinstance(product, dict) and product.get("title"):
        title = product.get("title", "")
        price = product.get("selectedPrice") or product.get("basePrice", 0)
        selected_var = product.get("selectedVariant", "")
        stock = product.get("stockCount", 0)
        in_stock = product.get("inStock", True)
        desc = product.get("description", "")
        
        variant_strs = []
        for v in product.get("variants", []):
            variant_strs.append(f"{v.get('name')}: {v.get('stock')} in stock")
        variants_summary = ", ".join(variant_strs) if variant_strs else "None"
        
        parts.append(
            f"Active Product: '{title}', Price: ৳{price} BDT. "
            f"Selected Size: {selected_var} ({stock} in stock). "
            f"All Sizes: [{variants_summary}]. "
            f"Status: {'In Stock' if in_stock else 'Out of Stock'}. "
            f"Description: {desc}"
        )
    else:
        title = context_dict.get("pageTitle", "")
        if title:
            parts.append(f"Page Title: {title}")
    
    cart = context_dict.get("cart")
    if isinstance(cart, dict) and cart.get("itemCount", 0) > 0:
        parts.append(f"Cart: {cart.get('itemCount')} items, Subtotal: ৳{cart.get('subtotal')} BDT")
    
    return " | ".join(parts)


def build_tools(on_order_confirmed_callback=None, get_context_callback=None, on_products_displayed_callback=None):
    async def create_order_handler(params: FunctionCallParams):
        args = params.arguments
        customer_name = args.get("customerName", "")
        phone_number = args.get("phoneNumber", "")
        delivery_address = args.get("deliveryAddress", "")
        product_name = args.get("productName", "")
        quantity = int(args.get("quantity", 1))
        payment_method = args.get("paymentMethod", "cash_on_delivery")

        # Fallback to current page product if not explicitly specified
        if (not product_name or product_name.lower() in ["this", "it", "product", "this product", "এটা", "এই প্রোডাক্ট"]) and get_context_callback:
            ctx = get_context_callback()
            if isinstance(ctx, dict) and ctx.get("product", {}).get("title"):
                product_name = ctx["product"]["title"]

        logger.info(f"Tool create_order called: {customer_name}, {phone_number}, {product_name}")
        result = await create_order(
            customer_name=customer_name,
            phone_number=phone_number,
            delivery_address=delivery_address,
            product_name=product_name,
            quantity=quantity,
            payment_method=payment_method
        )

        if result.get("success") and on_order_confirmed_callback and "order_data" in result:
            await on_order_confirmed_callback(result["order_data"])

        # Return sanitized summary for Gemini to speak
        await params.result_callback({
            "success": result.get("success", False),
            "orderNumber": result.get("orderNumber", ""),
            "productName": result.get("productName", ""),
            "totalAmount": result.get("totalAmount", 0),
            "estimatedDelivery": result.get("estimatedDelivery", ""),
            "message": result.get("message", "Order processed.")
        })

    async def search_products_handler(params: FunctionCallParams):
        query = params.arguments.get("query", "")
        logger.info(f"Tool search_products called with query: {query}")
        result = await search_products(query)
        if result.get("found") and on_products_displayed_callback and "products" in result:
            logger.info(f"Broadcasting {len(result['products'])} displayed products to client")
            await on_products_displayed_callback(result["products"], query)
        await params.result_callback(result)

    async def get_order_status_handler(params: FunctionCallParams):
        order_id = params.arguments.get("orderId")
        phone_number = params.arguments.get("phoneNumber")
        logger.info(f"Tool get_order_status called: id={order_id}, phone={phone_number}")
        result = await get_order_status(order_id=order_id, phone_number=phone_number)
        await params.result_callback(result)

    async def get_store_policies_handler(params: FunctionCallParams):
        topic = params.arguments.get("topic")
        logger.info(f"Tool get_store_policies called: topic={topic}")
        result = get_store_policies(topic=topic)
        await params.result_callback(result)

    async def get_page_context_handler(params: FunctionCallParams):
        logger.info("Tool getPageContext called by LLM")
        ctx = get_context_callback() if get_context_callback else {}
        summary = format_page_context(ctx)
        logger.info(f"Returning getPageContext summary: {summary}")
        await params.result_callback({
            "success": True,
            "pageContext": ctx,
            "summary": summary or "Customer is browsing general store pages."
        })

    create_order_func = FunctionSchema(
        name="createOrder",
        description="Places and saves a confirmed customer order in the store database when the customer gives their name, phone number, address, and product name.",
        properties={
            "customerName": {"type": "string", "description": "Customer full name"},
            "phoneNumber": {"type": "string", "description": "11-digit Bangladeshi mobile number e.g. 017xxxxxxxx"},
            "deliveryAddress": {"type": "string", "description": "Full street and delivery address with district or city"},
            "productName": {"type": "string", "description": "The product title or search term ordered"},
            "quantity": {"type": "integer", "description": "Quantity to order (defaults to 1)"},
            "paymentMethod": {
                "type": "string",
                "enum": ["cash_on_delivery", "online_payment"],
                "description": "Payment method selected by the customer"
            }
        },
        required=["customerName", "phoneNumber", "deliveryAddress", "productName"],
        handler=create_order_handler,
    )

    search_products_func = FunctionSchema(
        name="searchProducts",
        description="Searches the store catalog from database and IMMEDIATELY displays interactive product cards with photos, images, and prices on the customer's screen. Call this whenever the customer asks to see products, pictures, shirts, hoodies, jackets, pants, or asks what items are available.",
        properties={
            "query": {"type": "string", "description": "Search keyword, category, or filter (e.g. 'shirt', 't-shirt', 'jacket', 'pant', 'hoodie', 'low price', 'daily steel', 'performance ivory')"}
        },
        required=["query"],
        handler=search_products_handler,
    )

    get_order_status_func = FunctionSchema(
        name="getOrderStatus",
        description="Retrieves status and tracking details for an existing order by short order code (e.g. #ORD-XXXXXX) or phone number.",
        properties={
            "orderId": {"type": "string", "description": "Order ID or short code"},
            "phoneNumber": {"type": "string", "description": "Customer phone number"}
        },
        required=[],
        handler=get_order_status_handler,
    )

    get_store_policies_func = FunctionSchema(
        name="getStorePolicies",
        description="Provides delivery times, courier options, shipping fees, and return policies.",
        properties={
            "topic": {"type": "string", "description": "delivery, payment, or return"}
        },
        required=[],
        handler=get_store_policies_handler,
    )

    get_page_context_func = FunctionSchema(
        name="getPageContext",
        description="Retrieves live details about the exact webpage, product, pricing in BDT, available sizes, in-stock count, or shopping cart currently visible on the customer's screen.",
        properties={},
        required=[],
        handler=get_page_context_handler,
    )

    return ToolsSchema(
        standard_tools=[
            create_order_func,
            search_products_func,
            get_order_status_func,
            get_store_policies_func,
            get_page_context_func,
        ]
    )


async def run_pipecat_agent(
    transport: BaseTransport,
    runner_args: RunnerArguments,
    on_event_callback=None
):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set in environment!")

    session_page_context: dict = {}

    def get_current_context():
        return session_page_context

    async def notify_client_order(order_data):
        if on_event_callback:
            await on_event_callback({"type": "order_confirmed", "order": order_data})

    async def notify_client_products(products, query=""):
        if on_event_callback:
            await on_event_callback({
                "type": "products_displayed",
                "products": products,
                "query": query
            })

    tools = build_tools(
        on_order_confirmed_callback=notify_client_order,
        get_context_callback=get_current_context,
        on_products_displayed_callback=notify_client_products
    )

    llm = GeminiLiveLLMService(
        api_key=api_key,
        settings=GeminiLiveLLMService.Settings(
            model="models/gemini-3.8-live",
            system_instruction=SYSTEM_INSTRUCTION,
            voice="Aoede",
        ),
        tools=tools,
    )

    context = LLMContext()
    user_aggregator, assistant_aggregator = LLMContextAggregatorPair(context)

    pipeline = Pipeline(
        [
            transport.input(),
            user_aggregator,
            llm,
            transport.output(),
            assistant_aggregator,
        ]
    )

    worker = PipelineWorker(
        pipeline,
        params=PipelineParams(
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
        idle_timeout_secs=300,
        enable_rtvi=True,
        processor_unusable_policy=ProcessorUnusablePolicy.END,
    )

    runner = WorkerRunner(handle_sigint=False)
    await runner.add_workers(worker)

    @transport.event_handler("on_client_connected")
    async def on_client_connected(trans, client):
        logger.info("WebRTC Client connected to Pipecat session")
        context.add_message({
            "role": "developer",
            "content": "Greet the customer warmly in colloquial Bengali and let them know you are BazzarAI's voice assistant ready to help."
        })
        await worker.queue_frames([LLMRunFrame()])

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(trans, client):
        logger.info("WebRTC Client disconnected from Pipecat session")
        await runner.cancel()

    @transport.event_handler("on_app_message")
    async def on_app_message(trans, message, sender):
        logger.info(f"App message received from {sender}: {message}")
        user_text = None
        if isinstance(message, dict):
            data = message.get("data")
            if isinstance(data, dict):
                inner_type = data.get("t")
                if inner_type == "page_context_update":
                    payload = data.get("d", {})
                    session_page_context.clear()
                    session_page_context.update(payload)
                    summary = format_page_context(payload)
                    logger.info(f"Live page context updated: {summary}")
                    context.add_message({
                        "role": "developer",
                        "content": f"[Live Screen Context Update]: The customer is currently viewing: {summary}"
                    })
                    return
                elif inner_type == "user_text":
                    user_text = data.get("d", {}).get("text") or data.get("text")
                else:
                    user_text = data.get("content") or (data.get("d", {}).get("text") if isinstance(data.get("d"), dict) else None) or data.get("text")
            elif isinstance(data, str):
                user_text = data

            if not user_text and "text" in message:
                user_text = message.get("text")
        elif isinstance(message, str):
            user_text = message

        if user_text:
            logger.info(f"Injecting user text to Gemini Live: {user_text}")
            await worker.queue_frames([InputTextRawFrame(text=user_text)])

    @user_aggregator.event_handler("on_user_turn_message_added")
    async def on_user_turn(aggregator, message: UserTurnMessageAddedMessage):
        logger.info(f"User transcript: {message.content}")
        if on_event_callback:
            await on_event_callback({"type": "transcript", "role": "user", "text": message.content})

    @assistant_aggregator.event_handler("on_assistant_turn_stopped")
    async def on_assistant_turn(aggregator, message: AssistantTurnStoppedMessage):
        logger.info(f"Assistant transcript: {message.content}")
        if on_event_callback:
            await on_event_callback({"type": "transcript", "role": "assistant", "text": message.content})

    await runner.run()
