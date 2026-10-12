import React, { useState, useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  X,
  Send,
  Sparkles,
  ShoppingBag,
  Package,
  ExternalLink,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { API_URL } from "@/lib/api";
import { cloudinaryUrl } from "@/lib/cloudinary";

const SUGGESTED_PROMPTS = [
  { label: "👟 Shoes under 3000৳", prompt: "Recommend the best casual shoes under 3000 taka" },
  { label: "🔥 Trending collections", prompt: "What are the most popular trending items right now?" },
  { label: "📦 Track order status", prompt: "Can you help me check the status of my order?" },
  { label: "বাংলায় সাহায্য চাই", prompt: "আমার জন্য কিছু আকর্ষণীয় কালেকশন সাজেস্ট করুন" },
];

const INITIAL_WELCOME = {
  id: "welcome",
  role: "assistant" as const,
  content:
    "👋 Hi there! I'm your **BazzarBD AI Shopping Concierge**.\n\nLooking for something special, shopping under a budget, or need help tracking an order? Ask me anything!",
  parts: [
    {
      type: "text",
      text:
        "👋 Hi there! I'm your **BazzarBD AI Shopping Concierge**.\n\nLooking for something special, shopping under a budget, or need help tracking an order? Ask me anything!",
    },
  ],
};

function getMessageText(message: any): string {
  if (typeof message.content === "string" && message.content) {
    return message.content;
  }
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((p: any) => p && p.type === "text" && typeof p.text === "string")
      .map((p: any) => p.text)
      .join("");
  }
  return "";
}

export const AiSalesmanWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages: rawMessages,
    sendMessage,
    status,
  } = useChat({
    transport: new DefaultChatTransport({
      api: `${API_URL}/ai/chat`,
    }),
  });

  const messages = rawMessages && rawMessages.length > 0 ? rawMessages : [INITIAL_WELCOME];
  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const queryText = (input || "").trim();
    if (!queryText || isLoading) return;

    setInput("");
    try {
      await sendMessage({ text: queryText } as any);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  return (
    <>
      {/* ── Floating Launcher Button ────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.8 }}
            className="hidden sm:flex items-center gap-2 bg-[#1a1a1a]/90 backdrop-blur-md text-white text-xs px-3.5 py-2 rounded-full border border-white/10 shadow-2xl pointer-events-none"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
            <span>AI Shopping Concierge</span>
          </motion.div>
        )}

        <motion.button
          id="ai-salesman-toggle-button"
          onClick={() => setIsOpen((prev) => !prev)}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          className="relative group p-4 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 text-white shadow-xl shadow-orange-500/30 border border-white/20 transition-all duration-300"
          aria-label="Toggle AI Salesman Chat"
        >
          {/* Subtle glowing animated ring */}
          <span className="absolute -inset-1 rounded-full bg-gradient-to-tr from-amber-400 to-rose-400 opacity-40 blur-md group-hover:opacity-75 animate-pulse transition duration-500" />

          <div className="relative flex items-center justify-center">
            {isOpen ? (
              <X className="w-6 h-6 transition-transform rotate-0 group-hover:rotate-90 duration-200" />
            ) : (
              <Bot className="w-6 h-6 animate-bounce-subtle" />
            )}
          </div>
        </motion.button>
      </div>

      {/* ── Chat Drawer / Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="ai-salesman-drawer"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed bottom-24 right-4 sm:right-6 z-50 w-[92vw] sm:w-[420px] h-[600px] max-h-[80vh] flex flex-col bg-[#121214]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-neutral-100"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-[#18181b] via-[#1f1f23] to-[#18181b] border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                    <Bot className="w-5 h-5" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#121214]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-sm tracking-wide text-white">
                    <span>Lumina AI Concierge</span>
                    <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                      Live
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400">Powered by pgvector & Gemini AI</p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close Chat"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
              {messages.map((message) => {
                const isUser = message.role === "user";
                const messageText = getMessageText(message);

                // Collect tool results either from toolInvocations or parts
                const toolInvocations = (message as any).toolInvocations || [];
                const toolParts = Array.isArray((message as any).parts)
                  ? (message as any).parts.filter(
                      (p: any) =>
                        p && (p.type === "tool-result" || p.toolName || (p.type && p.type.startsWith("tool-")))
                    )
                  : [];

                const displayedToolInvocations =
                  toolInvocations.length > 0
                    ? toolInvocations
                    : toolParts.map((tp: any) => ({
                        toolName:
                          tp.toolName || (tp.type?.startsWith("tool-") ? tp.type.replace("tool-", "") : ""),
                        result: tp.result ?? tp.output,
                      }));

                return (
                  <div
                    key={message.id}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-start gap-2.5 max-w-[85%]">
                      {!isUser && (
                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 mt-0.5">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div
                        className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                          isUser
                            ? "bg-gradient-to-tr from-orange-600 to-amber-600 text-white rounded-br-none shadow-md shadow-orange-600/20"
                            : "bg-[#1f1f23]/90 text-neutral-200 border border-white/5 rounded-bl-none shadow-sm"
                        }`}
                      >
                        {messageText && <div className="whitespace-pre-wrap">{messageText}</div>}

                        {/* Render Tool Invocations if present */}
                        {displayedToolInvocations.map((toolInvocation: any, idx: number) => {
                          const toolResult = "result" in toolInvocation ? toolInvocation.result : null;

                          if (
                            (toolInvocation.toolName === "searchProducts" ||
                              toolInvocation.toolName === "recommendUnderBudget") &&
                            Array.isArray(toolResult) &&
                            toolResult.length > 0
                          ) {
                            return (
                              <div key={idx} className="mt-2 space-y-2">
                                <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                                  <ShoppingBag className="w-3.5 h-3.5" />
                                  <span>Matched Products:</span>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                  {toolResult.map((prod: any) => (
                                    <Link
                                      key={prod.id || prod.slug}
                                      to={`/product/${prod.slug}`}
                                      onClick={() => setIsOpen(false)}
                                      className="group flex items-center gap-3 p-2 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 hover:border-amber-500/40 transition-all duration-200"
                                    >
                                      {prod.image ? (
                                        <img
                                          src={cloudinaryUrl(prod.image, 100, 100)}
                                          alt={prod.name}
                                          className="w-12 h-12 object-cover rounded-lg border border-white/5 shrink-0"
                                        />
                                      ) : (
                                        <div className="w-12 h-12 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
                                          <ShoppingBag className="w-5 h-5 text-neutral-500" />
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-white truncate group-hover:text-amber-400 transition-colors">
                                          {prod.name}
                                        </p>
                                        <p className="text-xs font-bold text-amber-400 mt-0.5">
                                          ৳{prod.price?.toLocaleString()}
                                        </p>
                                      </div>
                                      <ExternalLink className="w-3.5 h-3.5 text-neutral-500 group-hover:text-amber-400 transition-colors shrink-0" />
                                    </Link>
                                  ))}
                                </div>
                              </div>
                            );
                          }

                          if (toolInvocation.toolName === "getOrderStatus" && toolResult) {
                            if (!toolResult.found) {
                              return (
                                <div
                                  key={idx}
                                  className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300"
                                >
                                  {toolResult.message || "Order not found."}
                                </div>
                              );
                            }

                            return (
                              <div
                                key={idx}
                                className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1.5 text-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-white flex items-center gap-1.5">
                                    <Package className="w-3.5 h-3.5 text-emerald-400" />
                                    Order #{toolResult.orderId.slice(-6).toUpperCase()}
                                  </span>
                                  <span className="capitalize px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[11px] border border-emerald-500/30">
                                    {toolResult.status}
                                  </span>
                                </div>
                                <div className="text-neutral-400 text-[11px] pt-1">
                                  Courier: <span className="text-white">{toolResult.courier}</span> • Total:{" "}
                                  <span className="text-amber-400 font-bold">
                                    ৳{toolResult.totalAmount?.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            );
                          }

                          return null;
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-neutral-400 pl-9">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>AI assistant is thinking...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Prompt Chips */}
            {messages.length <= 2 && (
              <div className="px-4 py-2 border-t border-white/5 bg-black/20">
                <p className="text-[11px] text-neutral-400 mb-1.5 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" /> Quick suggestions:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_PROMPTS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handlePromptClick(item.prompt)}
                      className="text-xs px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Input Bar */}
            <form
              onSubmit={handleSubmit}
              className="p-3 bg-[#18181b] border-t border-white/10 flex items-center gap-2"
            >
              <input
                id="ai-salesman-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask for items, budget, or order status..."
                className="flex-1 bg-black/40 text-sm text-white placeholder-neutral-500 px-4 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-amber-500/50 transition-colors"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all shadow-md shadow-orange-500/20"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AiSalesmanWidget;
