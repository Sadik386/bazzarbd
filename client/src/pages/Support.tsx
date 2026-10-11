import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Mail, Phone, MapPin, MessageSquare, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";

const Support = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await api.post("/support/contact", formData);
      setIsSuccess(true);
      toast({
        title: "Message Sent!",
        description: "We've received your message and will get back to you soon.",
      });
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message. Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gray-50/50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-gray-900 sm:text-5xl tracking-tight mb-4"
          >
            How can we help?
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-600 max-w-2xl mx-auto"
          >
            Have a question about our products, orders, or anything else? Our team is here to help you.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Contact Info */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-none shadow-sm overflow-hidden">
                <CardContent className="p-6 space-y-8">
                  <h3 className="text-xl font-semibold mb-6">Contact Information</h3>
                  
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-black text-white rounded-xl">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Email Us</p>
                      <p className="font-medium">thelagaristore@gmail.com</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-black text-white rounded-xl">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Call Us / WhatsApp</p>
                      <p className="font-medium">+880 1884-469251</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-black text-white rounded-xl">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Visit Us</p>
                      <p className="font-medium">Dhaka, Bangladesh</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 bg-black text-white rounded-2xl shadow-xl"
            >
              <h4 className="text-lg font-semibold mb-2">Shopping with us?</h4>
              <p className="text-gray-400 text-sm mb-4">Check your order status or track your package in your account dashboard.</p>
              <Link to="/orders" className="block w-full">
                <Button variant="outline" className="w-full border-gray-700 text-white hover:bg-gray-800 bg-transparent">
                  Go to My Orders
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border-none shadow-xl overflow-hidden bg-white">
                <CardContent className="p-8">
                  {isSuccess ? (
                    <div className="py-12 text-center">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-600 mb-6">
                        <CheckCircle className="w-10 h-10" />
                      </div>
                      <h2 className="text-2xl font-bold mb-2">Message Sent Successfully!</h2>
                      <p className="text-gray-600 mb-8">Thank you for reaching out. Our team will get back to you within 24 hours.</p>
                      <Button 
                        onClick={() => setIsSuccess(false)}
                        className="bg-black hover:bg-gray-800 text-white rounded-full px-8"
                      >
                        Send Another Message
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Full Name</label>
                          <Input 
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="John Doe" 
                            required 
                            className="rounded-xl border-gray-200 focus:ring-black focus:border-black"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Email Address</label>
                          <Input 
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="john@example.com" 
                            required 
                            className="rounded-xl border-gray-200 focus:ring-black focus:border-black"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Subject</label>
                        <Input 
                          name="subject"
                          value={formData.subject}
                          onChange={handleChange}
                          placeholder="What is this about?" 
                          required 
                          className="rounded-xl border-gray-200 focus:ring-black focus:border-black"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Your Message</label>
                        <Textarea 
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          placeholder="Tell us how we can help..." 
                          required 
                          rows={6}
                          className="rounded-xl border-gray-200 focus:ring-black focus:border-black resize-none"
                        />
                      </div>

                      <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full bg-black hover:bg-gray-800 text-white h-14 rounded-xl font-semibold text-lg transition-all active:scale-[0.98] disabled:opacity-70"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Sending Message...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <span>Send Message</span>
                            <Send className="w-5 h-5" />
                          </div>
                        )}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
