import React from "react";
import { motion } from "framer-motion";
import { Palmtree, Calendar, Mail, Compass } from "lucide-react";

interface VacationProps {
  message?: string;
}

const Vacation: React.FC<VacationProps> = ({ message }) => {
  const displayMessage = message || "We are currently away on holiday. All ordering capabilities are temporarily paused, but we will be back soon with fresh drops!";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d] text-white relative overflow-hidden select-none">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[#ff4d00]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

      {/* Decorative lines representing clothing hanger or abstract shapes */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="container max-w-xl mx-auto px-6 text-center z-10 space-y-8">
        {/* Brand Name */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-block"
        >
          <span className="text-2xl font-black tracking-[0.3em] text-[#ff4d00] uppercase">
            ঠেলাগাড়ী
          </span>
        </motion.div>

        {/* Dynamic Graphic Container */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
          className="relative w-32 h-32 mx-auto bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center shadow-2xl backdrop-blur-md"
        >
          <Palmtree className="w-16 h-16 text-[#ff4d00] stroke-[1.5] animate-bounce" style={{ animationDuration: "3s" }} />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
            className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center"
          >
            <Compass className="w-4 h-4 text-white/80" />
          </motion.div>
        </motion.div>

        {/* Main Text */}
        <div className="space-y-4">
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-4xl sm:text-5xl font-black tracking-tight leading-none text-white uppercase"
          >
            TEMPORARILY CLOSED
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-[#e2c19d] text-xs font-black tracking-[0.2em] uppercase flex items-center justify-center gap-2"
          >
            <Calendar className="w-3.5 h-3.5" /> ON VACATION
          </motion.p>
        </div>

        {/* Message Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="p-6 sm:p-8 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-md shadow-xl text-center space-y-4"
        >
          <p className="text-sm sm:text-base text-gray-300 leading-relaxed font-medium">
            {displayMessage}
          </p>
        </motion.div>

        {/* Footer Support */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-xs text-gray-500 font-medium space-y-2 pt-6 border-t border-white/5"
        >
          <p>For urgent inquiries or order follow-ups, contact customer service at:</p>
          <a
            href="mailto:support@thelagari.com"
            className="inline-flex items-center gap-2 text-white/80 hover:text-[#ff4d00] transition-colors font-semibold"
          >
            <Mail className="w-3.5 h-3.5" /> support@thelagari.com
          </a>
        </motion.div>
      </div>
    </div>
  );
};

export default Vacation;
