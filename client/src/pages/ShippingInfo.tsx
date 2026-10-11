import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { Truck, Clock, Shield, Globe } from "lucide-react";

const ShippingInfo = () => {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const res = await api.get("/settings/shipping_info");
        setContent(res || "");
      } catch (err) {
        console.error("Failed to fetch shipping policy:", err);
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
            We provide fast, secure, and fully tracked delivery services to all our customers. All items are meticulously packed in our signature luxury boxes to ensure they arrive in pristine condition.
          </p>
          <h3 className="text-xl font-bold mt-8 mb-4 text-foreground">Delivery Timeline</h3>
          <p className="text-muted-foreground leading-relaxed">
            - **Inside Dhaka:** Delivered within 24 to 48 hours.
            <br />
            - **Outside Dhaka:** Delivered within 3 to 5 business days via trusted premium courier services.
          </p>
          <h3 className="text-xl font-bold mt-8 mb-4 text-foreground">Tracking Your Order</h3>
          <p className="text-muted-foreground leading-relaxed">
            Once your order is dispatched, you will receive a confirmation SMS and email with your tracking number. You can monitor your shipment directly from our carriers' tracking portals.
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
            src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2000&auto=format&fit=crop" 
            alt="Shipping and Logistics" 
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
              Logistics & Delivery
            </span>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
              Shipping Information
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
                <Truck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-semibold tracking-wider uppercase text-foreground mb-1">Direct Courier</h4>
                <p className="text-xs text-muted-foreground">Hand-delivered safely with high reliability.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10 shrink-0">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-semibold tracking-wider uppercase text-foreground mb-1">Fast Delivery</h4>
                <p className="text-xs text-muted-foreground">Within 24 to 48 hours for inside Dhaka.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10 shrink-0">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-semibold tracking-wider uppercase text-foreground mb-1">Insured Packages</h4>
                <p className="text-xs text-muted-foreground">Any transit damages are covered entirely by us.</p>
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

export default ShippingInfo;
