import { motion } from "framer-motion";
import { 
  Shirt, 
  ShoppingBag, 
  Truck, 
  RotateCcw, 
  ShieldCheck, 
  Globe, 
  Users, 
  MapPin, 
  Award,
  ChevronDown,
  Scissors,
  Zap,
  Target
} from "lucide-react";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

const About = () => {
  const [returnDays, setReturnDays] = useState<number>(7);

  useEffect(() => {
    const fetchReturnDays = async () => {
      try {
        const days = await api.get("/settings/return_days");
        if (days) setReturnDays(Number(days));
      } catch (err) {
        console.error("Failed to fetch return days:", err);
      }
    };
    fetchReturnDays();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };
  const stats = [
    { label: "Happy Customers", value: "50,000+", icon: Users },
    { label: "Orders Shipped", value: "120,000+", icon: Truck },
    { label: "Fabric Quality", value: "100%", icon: Shirt },
    { label: "Days Return", value: String(returnDays), icon: RotateCcw },
    { label: "Local Artisans", value: "150+", icon: Scissors },
    { label: "Experience", value: "9 Years", icon: Award },
  ];

  const categories = [
    { name: "Premium T-Shirts", icon: Shirt, description: "Crafted from the finest organic cotton for unparalleled comfort and durability." },
    { name: "Luxury Hoodies", icon: Shirt, description: "Heavyweight fleece and meticulous stitching for those chilly Dhaka evenings." },
    { name: "Tailored Pants", icon: Shirt, description: "The perfect blend of style and mobility, designed for the modern lifestyle." },
    { name: "Seasonal Jackets", icon: Shirt, description: "Statement pieces that protect you from the elements without compromising on style." },
    { name: "Essentials", icon: ShoppingBag, description: "High-quality accessories that complement your daily rotation." },
  ];

  const features = [
    { title: "Direct to You", desc: "No middleman, radically low prices for premium quality.", icon: Zap },
    { title: "Premium Materials", desc: "Italian leather, GIZA cotton, and sustainably sourced silk.", icon: ShieldCheck },
    { title: "Radical Transparency", desc: "We show you exactly what it costs to make our products.", icon: Target },
    { title: `${returnDays}-Day Returns`, desc: "We stand by our quality. Simple returns if it's not right.", icon: RotateCcw },
    { title: "Sustainable Future", desc: "Committed to ethical manufacturing and reducing waste.", icon: Globe },
    { title: "Crafted in BD", desc: "Proudly supporting and showcasing local craftsmanship.", icon: MapPin },
  ];

  const faqs = [
    { q: "What makes Thelagari unique?", a: "Thelagari is built on the principle of 'Luxury Essentials, Honestly Priced.' We bypass traditional retail markups by working directly with the best factories and selling directly to you." },
    { q: "Are your materials sustainably sourced?", a: "Yes, we prioritize organic cotton, recycled polyester, and ethical leather sourcing in all our collections." },
    { q: "How do you handle returns?", a: `We offer a flexible ${returnDays}-day return and exchange policy. If you're not completely satisfied with your purchase, you can return it for a refund or exchange.` },
    { q: "Where are your products made?", a: "Our products are designed in Dhaka and crafted in world-class factories that uphold the highest standards of labor and quality." },
    { q: "Do you have physical stores?", a: "While we primarily operate online to keep costs low, we occasionally host pop-up experiences and showrooms in major cities." },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=2000&auto=format&fit=crop" 
            alt="The Lagari Lifestyle" 
            className="w-full h-full object-cover brightness-[0.4]"
          />

          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background" />
        </div>
        
        <div className="container relative z-10 text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block px-4 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-[0.2em] uppercase mb-6">
              Premium Fashion & Lifestyle
            </span>
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-6">
              Thelagari
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-light">
              Luxury essentials, <span className="text-foreground font-medium italic">honestly priced.</span> 
              Reimagining the modern wardrobe with a commitment to quality.
            </p>
          </motion.div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <ChevronDown className="w-6 h-6 text-muted-foreground animate-bounce" />
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-24 border-y border-border/30 bg-card/50">
        <div className="container px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-12">
            {stats.map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <stat.icon className="w-5 h-5 text-primary mx-auto mb-4 opacity-50" />
                <h3 className="text-3xl font-bold mb-1">{stat.value}</h3>
                <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-32 container px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-4xl font-bold tracking-tight">Radical Quality. <br/>Radical Value.</h2>
            <div className="space-y-6 text-muted-foreground leading-relaxed text-lg">
              <p>
                At **Thelagari**, we believe that premium quality shouldn't come at a premium price. 
                Traditional retail markups are often 5-10x the cost of production. We do things differently.
              </p>
              <p>
                By working directly with the world's best garment factories and using the same high-quality 
                fabrics as luxury labels, we bring you essentials that last longer and feel better, 
                all while maintaining an honest price point.
              </p>
            </div>
            <div className="pt-4 flex gap-4">
              <Link to="/products">
                <Button className="rounded-full px-8 h-12 font-semibold">Our Collection</Button>
              </Link>
              <Button 
                variant="outline" 
                className="rounded-full px-8 h-12 font-semibold"
                onClick={() => scrollToSection("difference")}
              >
                Read our Mission
              </Button>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative rounded-2xl overflow-hidden aspect-[4/5] shadow-2xl"
          >
            <img 
              src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=1000&auto=format&fit=crop" 
              alt="The Lagari Craftsmanship" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition-colors duration-500" />
          </motion.div>
        </div>
      </section>

      {/* Core Principles */}
      <section id="difference" className="py-32 bg-secondary/30 relative">
        <div className="container px-4">
          <div className="text-center mb-24">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">The Thelagari Difference</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Founded on the belief that everyday essentials should be extraordinary.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
            {features.map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="space-y-4"
              >
                <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center shadow-sm">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Collection Focus */}
      <section className="py-32 container px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 flex flex-col justify-center space-y-6">
            <h2 className="text-3xl font-bold">Uncompromising <br/>Design</h2>
            <p className="text-muted-foreground leading-relaxed">
              We focus on the details that matter: the weight of the fabric, the curve of the collar, 
              and the durability of the seams.
            </p>
          </div>
          {categories.slice(0, 2).map((cat) => (
            <Card key={cat.name} className="border-none bg-card shadow-lg hover:shadow-xl transition-shadow overflow-hidden group">
              <CardContent className="p-0">
                <div className="p-8 space-y-4">
                   <h3 className="text-xl font-bold">{cat.name}</h3>
                   <p className="text-sm text-muted-foreground leading-relaxed">{cat.description}</p>
                </div>
                <div className="h-64 bg-muted overflow-hidden">
                  <img 
                    src={cat.name === "Premium T-Shirts" ? "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=800&auto=format&fit=crop" : "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=800&auto=format&fit=crop"} 
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-32 bg-background">
        <div className="container px-4 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left font-semibold">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 container px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
           <h2 className="text-4xl md:text-6xl font-bold tracking-tight">Experience the difference of Thelagari quality.</h2>
           <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
             Join thousands of customers who have elevated their daily rotation with our honestly priced luxury essentials.
           </p>
           <div className="pt-8">
             <Button asChild size="lg" className="rounded-full px-12 h-14 text-lg font-bold">
               <Link to="/products">Shop the Collection</Link>
             </Button>
           </div>
        </div>
      </section>
    </div>
  );
};

export default About;
