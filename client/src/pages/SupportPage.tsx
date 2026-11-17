import { useState } from "react";
import { toast } from "sonner";
import { Mail, MapPin, MessageSquare } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { BRAND } from "@/lib/format";
import { useAuthStore } from "@/stores/authStore";

export function SupportPage() {
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState(user?.display_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await api.post<{ message: string; ticketId: string }>("/support/contact", {
        name: name.trim(),
        email: email.trim(),
        subject: subject.trim() || "Storefront Inquiry",
        message: message.trim(),
      });
      toast.success(res.message || "Support ticket opened — we will reply by email");
      setSubject("");
      setMessage("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] space-y-14 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl space-y-3 border-b border-border pb-6">
        <h1 className="font-display text-4xl text-foreground sm:text-5xl">Customer Care</h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Need sizing help, courier updates, or exchange support? Send a direct note to our Dhaka support desk or browse common questions below.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-12">
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-border bg-card p-6 sm:p-8 lg:col-span-7"
        >
          <h2 className="font-display text-2xl text-foreground">Open a Support Ticket</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sup-name">Your name</Label>
              <Input
                id="sup-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sup-email">Email address</Label>
              <Input
                id="sup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sup-subject">Subject</Label>
            <Input
              id="sup-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Order inquiry, exchange request, or sizing question"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sup-msg">Message</Label>
            <Textarea
              id="sup-msg"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Include your Order ID if asking about an existing parcel..."
              required
            />
          </div>

          <Button type="submit" size="lg" isLoading={sending}>
            Send message
          </Button>
        </form>

        <div className="space-y-8 lg:col-span-5">
          <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-2xl text-foreground">Studio Desk</h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-primary" />
                <span>{BRAND.supportEmail}</span>
              </p>
              <p className="flex items-center gap-2.5">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span>Saturday – Thursday, 10:00 AM – 8:00 PM BST</span>
              </p>
              <p className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{BRAND.city}</span>
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="mb-2 font-display text-2xl text-foreground">Frequently Asked</h2>
            <Accordion type="single" collapsible>
              <AccordionItem value="q1">
                <AccordionTrigger>How long does Dhaka delivery take?</AccordionTrigger>
                <AccordionContent>
                  Inside Dhaka orders arrive within 24–48 hours via Steadfast or Pathao courier. Outside Dhaka takes 2–4 business days.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q2">
                <AccordionTrigger>Can I inspect my parcel before paying?</AccordionTrigger>
                <AccordionContent>
                  Yes. Cash on Delivery orders can be verified for correct size and item count at delivery.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q3">
                <AccordionTrigger>How do size exchanges work?</AccordionTrigger>
                <AccordionContent>
                  Unworn garments with tags intact can be exchanged within 7 days of delivery by opening a ticket here.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>
    </div>
  );
}
