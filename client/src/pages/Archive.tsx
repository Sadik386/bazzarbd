import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Lock, ArrowRight, History, Star, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const Archive = () => {
  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-8">
              <Lock className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold tracking-[0.2em] text-primary uppercase">The Vault</span>
            </div>
            <h1 className="text-5xl md:text-8xl font-bold tracking-tighter mb-8 italic">
              THE ARCHIVE
            </h1>
            <p className="text-xl md:text-2xl text-white/40 max-w-2xl mx-auto leading-relaxed font-light">
              A curated collection of past masterpieces, limited runs, and vault pieces. 
              History, <span className="text-white italic">reimagined.</span>
            </p>
          </motion.div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-32">
          {[
            { 
              year: "2024", 
              title: "Monochrome Series", 
              desc: "The original minimalist collection that defined our silhouette.",
              img: "https://images.unsplash.com/photo-1515347619252-60a4bdad858a?q=80&w=800&auto=format&fit=crop"
            },
            { 
              year: "2025", 
              title: "Summer Solstice", 
              desc: "Lightweight fabrics meets architectural design.",
              img: "https://images.unsplash.com/photo-1550614000-4895a10e1bfd?q=80&w=800&auto=format&fit=crop"
            },
            { 
              year: "Vault", 
              title: "Experimental Lab", 
              desc: "One-of-one prototypes and unreleased concepts.",
              img: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=800&auto=format&fit=crop"
            }
          ].map((item, idx) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-neutral-900"
            >
              <img 
                src={item.img} 
                alt={item.title} 
                className="w-full h-full object-cover opacity-50 grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 p-8 w-full">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold tracking-widest text-primary uppercase">{item.year}</span>
                </div>
                <h3 className="text-2xl font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-white/40 mb-6 line-clamp-2">{item.desc}</p>
                <button className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-all duration-300">
                  View Story <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <div className="absolute top-6 right-6">
                <Lock className="w-4 h-4 text-white/20" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-white/10 pt-20">
          {[
            { icon: History, title: "Legacy Pieces", desc: "Every item in the archive tells a story of our evolution." },
            { icon: Star, title: "Limited Release", desc: "Access to exclusive restocks of vaulted designs." },
            { icon: Clock, title: "Coming Soon", desc: "Our next archival drop is scheduled for late 2026." },
          ].map((feat, idx) => (
            <div key={idx} className="space-y-4">
              <feat.icon className="w-6 h-6 text-primary opacity-50" />
              <h4 className="text-lg font-bold">{feat.title}</h4>
              <p className="text-sm text-white/40 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>

        {/* Final CTA */}
        <div className="mt-32 text-center py-24 rounded-[3rem] bg-neutral-900/50 border border-white/5">
          <h2 className="text-3xl font-bold mb-6 italic">Stay updated on the next vault opening.</h2>
          <div className="max-w-md mx-auto flex gap-4">
             <input 
               type="email" 
               placeholder="Enter your email..." 
               className="flex-1 bg-black/50 border-white/10 rounded-full px-6 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
             />
             <Button className="rounded-full px-8 h-12 font-bold">Notify Me</Button>
          </div>
          <Link to="/" className="inline-block mt-12 text-xs font-medium text-white/20 hover:text-primary transition-colors">
            Return to Active Collection
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Archive;
