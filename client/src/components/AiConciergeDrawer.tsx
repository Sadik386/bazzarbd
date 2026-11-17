import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { PipecatClient } from "@pipecat-ai/client-js";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CheckCircle2,
  Loader2,
  Mic,
  PhoneOff,
  Send,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogTitle, SheetContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { API_URL, getVoiceConnectEndpoint } from "@/lib/api";
import { formatBDT, getImageUrl, shortOrderCode } from "@/lib/format";
import { useCartStore } from "@/stores/cartStore";
import {
  useConciergeStore,
  type VoiceDisplayedProduct,
  type VoiceOrderConfirmed,
} from "@/stores/conciergeStore";
import { cn } from "@/lib/utils";

const QUICK_PROMPTS = [
  { label: "Casual shirts under ৳2,000", prompt: "Suggest your best casual shirts under 2000 BDT" },
  { label: "Trending pieces", prompt: "What are your featured and trending apparel pieces right now?" },
  { label: "Track an order", prompt: "Help me check the status of my order" },
  { label: "বাংলায় সাহায্য চাই", prompt: "আমার জন্য আরামদায়ক কিছু কালেকশন সাজেস্ট করুন" },
];

interface ToolProductCard {
  id?: string;
  name: string;
  slug?: string;
  price?: number;
  base_price?: number;
  image?: string | null;
  images?: string[];
}

interface ToolOrderResult {
  success?: boolean;
  found?: boolean;
  orderId?: string;
  orderNumber?: string;
  totalAmount?: number;
  status?: string;
  message?: string;
}

function extractToolRenderables(parts: unknown[] | undefined) {
  const products: ToolProductCard[] = [];
  let orderCard: ToolOrderResult | null = null;

  if (!Array.isArray(parts)) return { products, orderCard };

  for (const raw of parts) {
    if (!raw || typeof raw !== "object") continue;
    const part = raw as Record<string, unknown>;
    const type = typeof part.type === "string" ? part.type : "";
    if (!type.startsWith("tool-") && type !== "dynamic-tool") continue;
    if (part.state !== "output-available") continue;

    const output = part.output;
    if (Array.isArray(output)) {
      for (const item of output) {
        if (item && typeof item === "object" && "name" in item && "slug" in item) {
          products.push(item as ToolProductCard);
        }
      }
    } else if (output && typeof output === "object") {
      const obj = output as Record<string, unknown>;
      if ("found" in obj && obj.found === true && "slug" in obj && "name" in obj) {
        products.push(obj as unknown as ToolProductCard);
      }
      if ("orderId" in obj && (obj.success === true || obj.found === true)) {
        orderCard = obj as unknown as ToolOrderResult;
      }
    }
  }

  return { products, orderCard };
}

export function AiConciergeDrawer() {
  const isOpen = useConciergeStore((s) => s.isOpen);
  const setOpen = useConciergeStore((s) => s.setOpen);
  const pageContext = useConciergeStore((s) => s.pageContext);
  const voiceProducts = useConciergeStore((s) => s.voiceProducts);
  const setVoiceProducts = useConciergeStore((s) => s.setVoiceProducts);
  const voiceOrder = useConciergeStore((s) => s.voiceOrder);
  const setVoiceOrder = useConciergeStore((s) => s.setVoiceOrder);

  const cartItems = useCartStore((s) => s.items);
  const cartSubtotal = useCartStore((s) => s.subtotal());

  const [input, setInput] = useState("");
  const [voiceConnected, setVoiceConnected] = useState(false);
  const [voiceConnecting, setVoiceConnecting] = useState(false);
  const [voiceTranscripts, setVoiceTranscripts] = useState<
    Array<{ id: string; role: "user" | "assistant"; text: string }>
  >([]);

  const pcClientRef = useRef<PipecatClient | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: `${API_URL}/ai/chat`,
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (isOpen) {
      scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, voiceTranscripts, voiceProducts, voiceOrder, isOpen]);

  // Sync live page & cart context to Pipecat WebRTC session whenever connected
  const pushLiveContext = (client: PipecatClient | null) => {
    if (!client) return;
    try {
      const payload = {
        pathname: pageContext.pathname,
        product: pageContext.product,
        searchQuery: pageContext.searchQuery,
        cart: {
          itemCount: cartItems.reduce((acc, i) => acc + i.quantity, 0),
          subtotal: cartSubtotal,
          items: cartItems.map((i) => ({
            name: i.name,
            variant: i.variantName,
            quantity: i.quantity,
            price: i.unitPrice,
          })),
        },
      };
      client.sendClientMessage("page_context_update", payload);
    } catch {
      // Ignore if data channel is closing
    }
  };

  useEffect(() => {
    if (voiceConnected && pcClientRef.current) {
      pushLiveContext(pcClientRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceConnected, pageContext.pathname, pageContext.product, cartItems, cartSubtotal]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    try {
      await sendMessage({ text });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reach concierge");
    }
  };

  const toggleVoice = async () => {
    if (voiceConnected && pcClientRef.current) {
      await pcClientRef.current.disconnect();
      pcClientRef.current = null;
      setVoiceConnected(false);
      return;
    }

    setVoiceConnecting(true);
    try {
      const [{ PipecatClient: PipecatClientCtor }, { SmallWebRTCTransport }] = await Promise.all([
        import("@pipecat-ai/client-js"),
        import("@pipecat-ai/small-webrtc-transport"),
      ]);
      const client = new PipecatClientCtor({
        transport: new SmallWebRTCTransport(),
        enableMic: true,
        enableCam: false,
        callbacks: {
          onConnected: () => {
            setVoiceConnected(true);
            setTimeout(() => pushLiveContext(client), 350);
          },
          onDisconnected: () => {
            setVoiceConnected(false);
            pcClientRef.current = null;
          },
          onTrackStarted: (track) => {
            if (track.kind === "audio" && audioRef.current) {
              audioRef.current.srcObject = new MediaStream([track]);
              audioRef.current.play().catch(() => {});
            }
          },
          onUserTranscript: (data) => {
            if (data?.final && data?.text?.trim()) {
              setVoiceTranscripts((prev) => [
                ...prev.slice(-18),
                { id: `u-${Date.now()}`, role: "user", text: data.text.trim() },
              ]);
            }
          },
          onBotTranscript: (data) => {
            const text = typeof data === "string" ? data : data?.text;
            if (text?.trim()) {
              setVoiceTranscripts((prev) => [
                ...prev.slice(-18),
                { id: `b-${Date.now()}`, role: "assistant", text: text.trim() },
              ]);
            }
          },
          onServerMessage: (raw) => {
            if (!raw || typeof raw !== "object") return;
            const msg = raw as Record<string, unknown>;
            if (msg.type === "products_displayed" && Array.isArray(msg.products)) {
              setVoiceProducts(msg.products as VoiceDisplayedProduct[]);
            } else if (msg.type === "order_confirmed" && msg.order) {
              const ord = msg.order as VoiceOrderConfirmed;
              setVoiceOrder(ord);
              toast.success(`Order ${ord.orderCode || shortOrderCode(ord.orderId || ord.id)} confirmed`);
            }
          },
        },
      });
      pcClientRef.current = client;
      await client.connect({ webrtcUrl: getVoiceConnectEndpoint() });
      toast.success("Live voice concierge connected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not connect voice assistant");
      setVoiceConnected(false);
    } finally {
      setVoiceConnecting(false);
    }
  };

  return (
    <>
      <audio ref={audioRef} autoPlay className="hidden" />

      {!isOpen && (
        <button
          id="ai-salesman-toggle-button"
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open BazzarBD AI Shopping Concierge"
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2.5 rounded-full border border-border bg-foreground px-4 py-3 text-xs font-medium text-background shadow-lg transition-all hover:bg-primary active:scale-[0.98]"
        >
          <Sparkles className="h-4 w-4 text-primary-foreground" />
          <span>Atelier Concierge</span>
        </button>
      )}

      <Dialog open={isOpen} onOpenChange={setOpen}>
        <SheetContent side="right" className="max-w-[440px] p-0">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-card px-5 py-4">
            <div className="min-w-0">
              <DialogTitle className="font-display text-2xl font-normal leading-none">
                Atelier Concierge
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs">
                Ask in English, বাংলা, or Banglish — or talk live via voice.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={voiceConnected ? "destructive" : "outline"}
                onClick={toggleVoice}
                disabled={voiceConnecting}
                className="h-8 gap-1.5 text-xs"
              >
                {voiceConnecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : voiceConnected ? (
                  <PhoneOff className="h-3.5 w-3.5" />
                ) : (
                  <Mic className="h-3.5 w-3.5" />
                )}
                <span>{voiceConnected ? "End voice" : voiceConnecting ? "Linking..." : "Voice"}</span>
              </Button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close concierge"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Live Voice Status & Context Pill */}
          {voiceConnected && (
            <div className="flex items-center justify-between border-b border-border bg-primary/10 px-5 py-2 text-xs text-primary">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Volume2 className="h-3.5 w-3.5 animate-pulse" />
                Live Voice Active {pageContext.product ? `· Viewing ${pageContext.product.title}` : ""}
              </span>
              <span className="text-[11px] opacity-80">Context synced</span>
            </div>
          )}

          {/* Conversation Stream */}
          <div className="flex-1 space-y-4 overflow-y-auto bg-background/60 px-5 py-4">
            {messages.length === 0 && voiceTranscripts.length === 0 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-card p-4 text-sm text-foreground/90 leading-relaxed">
                  Welcome to BazzarBD. I can search fabrics and sizes, recommend pieces under a budget in BDT, track orders, or place a Cash on Delivery order directly for you.
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Quick prompts</p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_PROMPTS.map((q) => (
                      <button
                        key={q.label}
                        type="button"
                        onClick={() => sendMessage({ text: q.prompt })}
                        className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:border-primary hover:text-primary"
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Chat Messages + Tool Cards */}
            {messages.map((m) => {
              const textContent = (m.parts || [])
                .filter((p): p is { type: "text"; text: string } => p.type === "text" && "text" in p)
                .map((p) => p.text)
                .join("");

              const { products, orderCard } = extractToolRenderables(m.parts as unknown[]);

              return (
                <div key={m.id} className="space-y-2.5">
                  {textContent && (
                    <div className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[88%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                          m.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "border border-border bg-card text-foreground"
                        )}
                      >
                        {m.role === "user" ? (
                          <span className="whitespace-pre-wrap">{textContent}</span>
                        ) : (
                          <div className="prose prose-sm max-w-none text-foreground prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-foreground">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{textContent}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {products.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {products.slice(0, 4).map((p, i) => (
                        <Link
                          key={`${p.id || p.slug || i}`}
                          to={p.slug ? `/product/${p.slug}` : "/products"}
                          onClick={() => setOpen(false)}
                          className="group overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/50"
                        >
                          <div className="aspect-[4/3] overflow-hidden bg-secondary">
                            <img
                              src={getImageUrl(p.image || p.images?.[0])}
                              alt={p.name}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                          <div className="p-2">
                            <p className="truncate text-xs font-medium text-foreground">{p.name}</p>
                            <p className="tabular-price mt-0.5 text-xs text-primary">
                              {formatBDT(p.price ?? p.base_price)}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {orderCard?.orderId && (
                    <div className="rounded-xl border border-success/30 bg-success/5 p-3.5 text-xs">
                      <div className="flex items-center gap-2 font-medium text-success">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Order {orderCard.orderNumber || shortOrderCode(orderCard.orderId)}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-foreground">
                        <span>{orderCard.status || "Confirmed"}</span>
                        {orderCard.totalAmount !== undefined && (
                          <span className="tabular-price font-semibold">
                            {formatBDT(orderCard.totalAmount)}
                          </span>
                        )}
                      </div>
                      <Link
                        to={`/order/${orderCard.orderId}`}
                        onClick={() => setOpen(false)}
                        className="mt-2 inline-block font-medium text-primary underline underline-offset-2"
                      >
                        View order receipt & invoice
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Live Voice Transcripts */}
            {voiceTranscripts.map((vt) => (
              <div key={vt.id} className={cn("flex", vt.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[88%] rounded-xl px-3.5 py-2 text-xs leading-relaxed",
                    vt.role === "user"
                      ? "bg-primary/90 text-primary-foreground"
                      : "border border-border bg-card text-foreground"
                  )}
                >
                  <span className="mr-1.5 opacity-60">{vt.role === "user" ? "You:" : "Voice:"}</span>
                  {vt.text}
                </div>
              </div>
            ))}

            {/* Voice-pushed Product Cards */}
            {voiceProducts.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] font-medium text-muted-foreground">Shown from voice concierge</p>
                <div className="grid grid-cols-2 gap-2">
                  {voiceProducts.slice(0, 4).map((vp, idx) => (
                    <Link
                      key={vp.id || vp._id || idx}
                      to={`/product/${vp.slug}`}
                      onClick={() => setOpen(false)}
                      className="overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/50"
                    >
                      <div className="aspect-[4/3] bg-secondary">
                        <img
                          src={getImageUrl(vp.image || vp.product_images?.[0]?.url)}
                          alt={vp.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="p-2">
                        <p className="truncate text-xs font-medium">{vp.name}</p>
                        <p className="tabular-price mt-0.5 text-xs text-primary">
                          {formatBDT(vp.base_price)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Voice-confirmed Order Card */}
            {voiceOrder && (
              <div className="rounded-xl border border-success/30 bg-success/5 p-3.5 text-xs">
                <div className="flex items-center gap-2 font-medium text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    Voice Order Confirmed ({voiceOrder.orderCode || shortOrderCode(voiceOrder.orderId || voiceOrder.id)})
                  </span>
                </div>
                {(voiceOrder.totalAmount ?? voiceOrder.total_amount) !== undefined && (
                  <p className="tabular-price mt-1 font-medium text-foreground">
                    Total: {formatBDT(voiceOrder.totalAmount ?? voiceOrder.total_amount)}
                  </p>
                )}
                {(voiceOrder.orderId || voiceOrder.id) && (
                  <Link
                    to={`/order/${voiceOrder.orderId || voiceOrder.id}`}
                    onClick={() => setOpen(false)}
                    className="mt-2 inline-block font-medium text-primary underline underline-offset-2"
                  >
                    Open order receipt
                  </Link>
                )}
              </div>
            )}

            {isLoading && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1.5 text-xs">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Composing reply...
                </Badge>
              </div>
            )}

            <div ref={scrollEndRef} />
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border bg-card p-3.5">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about sizes, fabrics, or order status..."
              className="h-10"
            />
            <Button type="submit" size="icon" className="h-10 w-10 shrink-0" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </SheetContent>
      </Dialog>
    </>
  );
}
