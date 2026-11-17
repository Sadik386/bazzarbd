import os
import re
import random
import json
import secrets
from datetime import datetime, timezone
from dotenv import load_dotenv
import asyncpg
from loguru import logger

# Load environment from server/.env or .env
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

PG_CONNECTION_STRING = (
    os.getenv("PG_CONNECTION_STRING")
    or os.getenv("DATABASE_URL")
    or "postgresql://bazzar_user:bazzar_password@localhost:5432/bazzar_vectors"
)

_pool: asyncpg.Pool | None = None

async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(dsn=PG_CONNECTION_STRING, min_size=1, max_size=10)
        logger.info("Connected to PostgreSQL pool for Voice Service.")
    return _pool

async def create_order(
    customer_name: str,
    phone_number: str,
    delivery_address: str,
    product_name: str,
    quantity: int = 1,
    payment_method: str = "cash_on_delivery"
):
    try:
        pool = await get_pool()
        escaped_query = f"%{product_name.strip()}%"

        product_row = None
        async with pool.acquire() as conn:
            # 1. Search product by name or description
            row = await conn.fetchrow(
                """
                SELECT doc FROM products 
                WHERE name ILIKE $1 
                   OR name_bn ILIKE $1 
                   OR short_description ILIKE $1 
                LIMIT 1
                """,
                escaped_query
            )
            if not row:
                row = await conn.fetchrow("SELECT doc FROM products WHERE is_featured = true LIMIT 1")
            if not row:
                row = await conn.fetchrow("SELECT doc FROM products LIMIT 1")

            if row:
                product_data = json.loads(row["doc"]) if isinstance(row["doc"], str) else row["doc"]
            else:
                product_data = {}

            price = float(product_data.get("base_price", 1250))
            item_qty = max(1, int(quantity or 1))
            subtotal = price * item_qty

            is_dhaka = bool(re.search(r"dhaka|ঢাকা", delivery_address, re.IGNORECASE))
            shipping_cost = 60 if is_dhaka else 120
            total_amount = round(subtotal + shipping_cost, 2)

            product_id = product_data.get("_id", secrets.token_hex(12))
            variant_sku = "DEF-VAR-1"
            variant_title = "Standard"
            variants = product_data.get("product_variants", [])
            if variants and len(variants) > 0:
                variant_sku = variants[0].get("sku", "DEF-VAR-1")
                variant_title = variants[0].get("variant_name", "Standard")

            order_item = {
                "product_id": product_id,
                "variant_id": variant_sku,
                "quantity": item_qty,
                "unit_price": price,
                "product_name": product_data.get("name", product_name),
                "variant_name": variant_title
            }

            tracking_id = f"TRK-{random.randint(100000, 999999)}"
            courier_name = "Pathao Courier" if is_dhaka else "Steadfast Courier"
            order_id = secrets.token_hex(12)
            now_iso = datetime.now(timezone.utc).isoformat()

            shipping_addr = {
                "full_name": customer_name,
                "address": delivery_address,
                "city": "Dhaka" if is_dhaka else "Outside Dhaka",
                "notes": "Pipecat AI Voice Agent Order"
            }

            order_doc = {
                "_id": order_id,
                "guest_email": None,
                "status": "confirmed",
                "total_amount": total_amount,
                "shipping_cost": shipping_cost,
                "delivery_method": "Express Delivery (Dhaka)" if is_dhaka else "Standard Nationwide",
                "phone_number": phone_number,
                "shipping_address": shipping_addr,
                "order_items": [order_item],
                "payment_method": payment_method,
                "tracking_id": tracking_id,
                "courier_name": courier_name,
                "createdAt": now_iso,
                "updatedAt": now_iso
            }

            await conn.execute(
                """
                INSERT INTO orders (
                    _id, user_id, guest_email, status, total_amount, discount_amount,
                    shipping_cost, delivery_method, coupon_code, shipping_address,
                    phone_number, order_items, payment_method, courier_name,
                    tracking_id, doc, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """,
                order_id,
                None,
                None,
                "confirmed",
                total_amount,
                0.0,
                shipping_cost,
                "Express Delivery (Dhaka)" if is_dhaka else "Standard Nationwide",
                None,
                json.dumps(shipping_addr),
                phone_number,
                json.dumps([order_item]),
                payment_method,
                courier_name,
                tracking_id,
                json.dumps(order_doc)
            )

        short_code = f"#ORD-{order_id[-6:].upper()}"
        order_data = {
            "success": True,
            "orderId": order_id,
            "orderNumber": short_code,
            "trackingId": tracking_id,
            "customerName": customer_name,
            "phoneNumber": phone_number,
            "deliveryAddress": delivery_address,
            "productName": order_item["product_name"],
            "quantity": item_qty,
            "price": price,
            "subtotal": subtotal,
            "shippingCost": shipping_cost,
            "totalAmount": total_amount,
            "paymentMethod": "Cash on Delivery (ক্যাশ অন ডেলিভারি)" if payment_method == "cash_on_delivery" else "Online Payment",
            "estimatedDelivery": "24-48 Hours" if is_dhaka else "2-4 Days",
            "courier": courier_name
        }

        return {
            "success": True,
            "orderNumber": short_code,
            "productName": order_item["product_name"],
            "totalAmount": total_amount,
            "estimatedDelivery": order_data["estimatedDelivery"],
            "message": f"অর্ডার {short_code} সফলভাবে কনফার্ম ও সেভ হয়েছে। মোট বিল ৳{total_amount}।",
            "order_data": order_data
        }
    except Exception as e:
        logger.error(f"Error in create_order: {e}")
        return {"success": False, "error": str(e)}

async def search_products(query: str):
    try:
        pool = await get_pool()
        q = (query or "").lower().strip()

        is_low_price = bool(re.search(r"কম\s*দাম|কমদামি|সস্তা|কমদামে|বাজেট|budget|cheap|low\s*price", q))
        is_high_price = bool(re.search(r"বেশি\s*দাম|দামি|premium|expensive|high\s*price", q))

        cleaned = re.sub(
            r"ছবি|ফটো|পিকচার|পিক|দেখাও|দেখা|দেখতে\s*চাই|আছে\s*কি|কি\s*কি|কী\s*কী|প্লিজ|এর\s*দাম|প্রোডাক্ট|পণ্য|কালেকশন|show|photo|picture|image|products?|please",
            "",
            q
        ).strip()

        order_by = "base_price ASC" if is_low_price else ("base_price DESC" if is_high_price else "is_featured DESC, _id ASC")

        rows = []
        async with pool.acquire() as conn:
            # 1. Try exact cleaned query term first
            if cleaned and len(cleaned) > 2:
                pattern = f"%{cleaned}%"
                rows = await conn.fetch(
                    f"""
                    SELECT doc FROM products 
                    WHERE name ILIKE $1 
                       OR name_bn ILIKE $1 
                       OR short_description ILIKE $1 
                    ORDER BY {order_by}
                    LIMIT 6
                    """,
                    pattern
                )

            # 2. Category keyword mapping if no rows matched
            if not rows:
                cat_term = None
                if re.search(r"টি[- ]?শার্ট|টিশার্ট|শার্ট|shirt|t-shirt", q):
                    cat_term = "shirt"
                elif re.search(r"প্যান্ট|প্যান্টস|pant|pants|trouser", q):
                    cat_term = "pant"
                elif re.search(r"জ্যাকেট|কোট|jacket|coat", q):
                    cat_term = "jacket"
                elif re.search(r"হুডি|hoodie", q):
                    cat_term = "hoodie"

                if cat_term:
                    rows = await conn.fetch(
                        f"""
                        SELECT doc FROM products 
                        WHERE name ILIKE $1 
                           OR name_bn ILIKE $1 
                           OR short_description ILIKE $1 
                        ORDER BY {order_by}
                        LIMIT 6
                        """,
                        f"%{cat_term}%"
                    )

            # 3. Fallback to featured or general collection
            if not rows:
                rows = await conn.fetch(f"SELECT doc FROM products ORDER BY {order_by} LIMIT 6")

            if not rows:
                rows = await conn.fetch("SELECT doc FROM products LIMIT 6")

        formatted = []
        for r in rows:
            p = json.loads(r["doc"]) if isinstance(r["doc"], str) else r["doc"]
            images = p.get("product_images", [])
            img = images[0].get("url") if images and len(images) > 0 else None
            formatted.append({
                "id": str(p.get("_id")),
                "name": p.get("name"),
                "name_bn": p.get("name_bn") or p.get("name"),
                "price": float(p.get("base_price", 0)),
                "slug": p.get("slug") or str(p.get("_id")),
                "image": img,
                "description": p.get("short_description") or p.get("description", ""),
                "inStock": (p.get("total_stock") or 10) > 0
            })

        return {
            "found": len(formatted) > 0,
            "count": len(formatted),
            "products": formatted
        }
    except Exception as e:
        logger.error(f"Error in search_products: {e}")
        return {"error": "Failed to search products", "details": str(e)}

async def get_order_status(order_id: str | None = None, phone_number: str | None = None):
    try:
        pool = await get_pool()
        order_doc = None

        async with pool.acquire() as conn:
            if order_id:
                clean = order_id.replace("#", "").replace("ORD-", "").strip().lower()
                row = await conn.fetchrow("SELECT doc FROM orders WHERE _id = $1", clean)
                if not row and len(clean) == 6:
                    row = await conn.fetchrow("SELECT doc FROM orders WHERE lower(right(_id, 6)) = $1 ORDER BY created_at DESC LIMIT 1", clean)
                if row:
                    order_doc = json.loads(row["doc"]) if isinstance(row["doc"], str) else row["doc"]

            if not order_doc and phone_number:
                row = await conn.fetchrow("SELECT doc FROM orders WHERE phone_number = $1 ORDER BY created_at DESC LIMIT 1", phone_number)
                if row:
                    order_doc = json.loads(row["doc"]) if isinstance(row["doc"], str) else row["doc"]

        if not order_doc:
            return {"found": False, "message": "কোন অর্ডার পাওয়া যায়নি।"}

        order_id_str = str(order_doc.get("_id", ""))
        return {
            "found": True,
            "orderNumber": f"#ORD-{order_id_str[-6:].upper()}",
            "status": order_doc.get("status", "confirmed"),
            "totalAmount": order_doc.get("total_amount"),
            "trackingId": order_doc.get("tracking_id", "TRK-Pending"),
            "courier": order_doc.get("courier_name", "Pathao / Steadfast")
        }
    except Exception as e:
        logger.error(f"Error in get_order_status: {e}")
        return {"error": "Failed to check order status", "details": str(e)}

def get_store_policies(topic: str | None = None):
    return {
        "delivery": {
            "insideDhaka": "৳60, Delivered within 24-48 hours",
            "outsideDhaka": "৳120, Delivered in 2-4 business days across Bangladesh"
        },
        "payment": "Cash on Delivery (ক্যাশ অন ডেলিভারি) available nationwide, plus bKash & Cards.",
        "returnPolicy": "7-day hassle-free replacement or refund guarantee."
    }