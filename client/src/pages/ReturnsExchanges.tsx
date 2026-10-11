import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { RotateCcw, HelpCircle, CheckCircle, ShieldAlert, ShieldCheck } from "lucide-react";

const ReturnsExchanges = () => {
  const [content, setContent] = useState<string>("");
  const [returnDays, setReturnDays] = useState<number>(7);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const res = await api.get<string>("/settings/returns_exchanges");
        setContent(res || "");

        const days = await api.get<number>("/settings/return_days");
        if (days) setReturnDays(Number(days));
      } catch (err) {
        console.error("Failed to fetch returns policy:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicy();
  }, []);

  const renderContent = (text: string) => {
    if (!text) {
      return (
        <div className="space-y-6">
          <p className="text-muted-foreground leading-relaxed">
            We want you to be completely satisfied with your purchase. If you are not entirely happy with an item, we offer a straightforward, hassle-free return and exchange policy.
          </p>
          <h3 className="text-xl font-bold mt-8 mb-4 text-foreground">{returnDays}-Day Guarantee</h3>
          <p className="text-muted-foreground leading-relaxed">
            You can return or exchange any item within **{returnDays} days** of delivery. To be eligible, the product must be unworn, unwashed, and in its original packaging with all tags still attached.
          </p>
          <h3 className="text-xl font-bold mt-8 mb-4 text-foreground">How to Start</h3>
          <p className="text-muted-foreground leading-relaxed">
            Simply contact our Support Team or WhatsApp us at **+880 1884-469251** with your order ID. We will coordinate a pickup at your convenience.
          </p>
        </div>
      );
    }

    return text.split("\n\n").map((block, i) => {
      const trimmed = block.trim();
      if (trimmed.startsWith("#")) {
        return (
          <h3 key={i} className="text-xl font-bold mt-8 mb-4 text-foreground border-b border-border/20 pb-2">
            {trimmed.replace(/^#+\s*/, "").trim()}
          </h3>
        );
      }
      if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        return (
          <ul key={i} className="list-disc list-inside space-y-3 my-6 text-muted-foreground pl-4">
            {trimmed.split("\n").map((li, idx) => (
              <li key={idx} className="leading-relaxed">
                {li.replace(/^[-*]\s*/, "").trim()}
              </li>
            ))}
          </ul>
        );
      }
      return (
        <p key={i} className="text-muted-foreground leading-relaxed my-4 text-justify font-light text-base">
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <section className="relative h-[45vh] flex items-center justify-center overflow-hidden border-b border-border/20">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=2000&auto=format&fit=crop" 
            alt="Returns and Customer Support" 
            className="w-full h-full object-cover brightness-[0.35] scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background" />
        </div>
        
        <div className="container relative z-10 text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold tracking-[0.25em] uppercase mb-4">
              Our Guarantee
            </span>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
              Returns & Exchanges
            </h1>
          </motion.div>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="py-12 bg-muted/20 border-b border-border/10">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10 shrink-0">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-semibold tracking-wider uppercase text-foreground mb-1">Order With Confidence</h4>
                <p className="text-xs text-muted-foreground">Review product details before placing your order.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10 shrink-0">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-semibold tracking-wider uppercase text-foreground mb-1">Easy Process</h4>
                <p className="text-xs text-muted-foreground">Pickups coordinated by us right at your door.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10 shrink-0">
                <ShieldAlert className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-semibold tracking-wider uppercase text-foreground mb-1">Quality Guaranteed</h4>
                <p className="text-xs text-muted-foreground">Replacements for any manufacturer defects.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Policy */}
      <section className="py-20 container mx-auto px-4 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="prose prose-slate dark:prose-invert max-w-none"
        >
          {loading ? (
            <div className="space-y-4 py-8">
              <div className="h-4 bg-muted rounded-full w-3/4 animate-pulse" />
              <div className="h-4 bg-muted rounded-full w-5/6 animate-pulse" />
              <div className="h-4 bg-muted rounded-full w-2/3 animate-pulse" />
            </div>
          ) : (
            renderContent(content)
          )}
        </motion.div>
      </section>
    </div>
  );
};

export default ReturnsExchanges;
