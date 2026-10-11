import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Save, Image as ImageIcon, Trash2, Mail, Palmtree } from "lucide-react";
import ImageUpload from "./ImageUpload";
import { Switch } from "@/components/ui/switch";

const AdminSettings = () => {
  const [banners, setBanners] = useState<any[]>([]);
  const [deliveryOptions, setDeliveryOptions] = useState<any[]>([
    { name: "Inside Dhaka", cost: 60 }, 
    { name: "Outside Dhaka", cost: 120 }
  ]);
  const [shippingInfo, setShippingInfo] = useState<string>("");
  const [returnsExchanges, setReturnsExchanges] = useState<string>("");
  const [returnDays, setReturnDays] = useState<number>(7);
  const [smtpConfig, setSmtpConfig] = useState<any>({
    host: "",
    port: 587,
    user: "",
    pass: "",
    fromName: ""
  });
  const [vacationMode, setVacationMode] = useState<{ enabled: boolean; message: string }>({
    enabled: false,
    message: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const b = await api.get("/settings/banners");
        if (b) setBanners(b);

        const d = await api.get("/settings/delivery_options");
        if (d && Array.isArray(d)) setDeliveryOptions(d);

        const sInfo = await api.get("/settings/shipping_info");
        if (sInfo) setShippingInfo(sInfo);

        const rEx = await api.get("/settings/returns_exchanges");
        if (rEx) setReturnsExchanges(rEx);

        const days = await api.get("/settings/return_days");
        if (days) setReturnDays(Number(days));

        const smtp = await api.get("/settings/smtp_config");
        if (smtp) setSmtpConfig(smtp);

        const vac = await api.get("/settings/vacation_mode");
        if (vac) setVacationMode(vac);
      } catch (err) {
        console.error("Failed to fetch settings");
      }
    };
    fetchSettings();
  }, []);

  const saveBanners = async () => {
    try {
      await api.post("/settings", { key: "banners", value: banners });
      toast({ title: "Banners updated" });
    } catch (err) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const saveDeliveryOptions = async () => {
    try {
      await api.post("/settings", { key: "delivery_options", value: deliveryOptions });
      toast({ title: "Delivery options updated" });
    } catch (err) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const saveShippingInfo = async () => {
    try {
      await api.post("/settings", { key: "shipping_info", value: shippingInfo });
      toast({ title: "Shipping Info updated" });
    } catch (err) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const saveReturnsExchanges = async () => {
    try {
      await api.post("/settings", { key: "returns_exchanges", value: returnsExchanges });
      toast({ title: "Returns & Exchanges updated" });
    } catch (err) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const saveReturnDays = async () => {
    try {
      await api.post("/settings", { key: "return_days", value: returnDays });
      toast({ title: "Return Window days updated" });
    } catch (err) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const saveSmtpConfig = async () => {
    try {
      await api.post("/settings", { key: "smtp_config", value: smtpConfig });
      toast({ title: "Email Settings updated", description: "The server will use these settings for future emails." });
    } catch (err) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const saveVacationMode = async () => {
    try {
      await api.post("/settings", { key: "vacation_mode", value: vacationMode });
      toast({ title: "Vacation Mode updated successfully" });
    } catch (err) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const addBanner = () => {
    setBanners([...banners, { title: "", subtitle: "", image: "", link: "" }]);
  };

  const updateBanner = (index: number, field: string, value: string) => {
    const updated = [...banners];
    updated[index] = { ...updated[index], [field]: value };
    setBanners(updated);
  };

  const removeBanner = (index: number) => {
    setBanners(banners.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-8">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-sm font-bold tracking-widest uppercase flex items-center gap-2">
            <ImageIcon className="w-4 h-4" /> Homepage Banners
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {banners.map((banner, i) => (
            <div key={i} className="p-4 border border-border/20 rounded-xl space-y-4 bg-muted/20 relative">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => removeBanner(i)} 
                className="absolute top-2 right-2 text-destructive h-8 w-8 hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Title</Label>
                    <Input value={banner.title} onChange={(e) => updateBanner(i, "title", e.target.value)} placeholder="e.g. Summer Collection" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Subtitle</Label>
                    <Input value={banner.subtitle} onChange={(e) => updateBanner(i, "subtitle", e.target.value)} placeholder="e.g. Up to 50% Off" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Link URL</Label>
                    <Input value={banner.link} onChange={(e) => updateBanner(i, "link", e.target.value)} placeholder="/shop/category" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Banner Image</Label>
                  <ImageUpload 
                    maxImages={1}
                    currentImages={banner.image ? [banner.image] : []}
                    onUploadComplete={(url) => updateBanner(i, "image", url)}
                    onDeleteImage={() => updateBanner(i, "image", "")}
                  />
                  {banner.image && (
                    <div className="mt-2">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Image URL (Read-only)</Label>
                      <Input value={banner.image} readOnly className="text-[10px] bg-muted/50 mt-1" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button variant="outline" onClick={addBanner} className="gap-2 text-xs">
              <ImageIcon className="w-4 h-4" /> ADD NEW BANNER
            </Button>
            <Button onClick={saveBanners} className="gap-2 text-xs bg-primary hover:bg-primary/90">
              <Save className="w-4 h-4" /> SAVE ALL BANNERS
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-sm font-bold tracking-widest uppercase">Delivery Methods</CardTitle>
          <p className="text-[10px] text-muted-foreground mt-1">Configure your shipping options (e.g., Inside vs Outside Dhaka).</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {deliveryOptions.map((opt, i) => (
              <div key={i} className="p-4 border border-border/20 rounded-xl space-y-4 bg-muted/10">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Option {i + 1} Name</Label>
                  <Input 
                    value={opt.name} 
                    onChange={(e) => {
                      const updated = [...deliveryOptions];
                      updated[i] = { ...updated[i], name: e.target.value };
                      setDeliveryOptions(updated);
                    }} 
                    placeholder="e.g. Inside Dhaka" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Cost (৳)</Label>
                  <Input 
                    type="number"
                    value={opt.cost} 
                    onChange={(e) => {
                      const updated = [...deliveryOptions];
                      updated[i] = { ...updated[i], cost: Number(e.target.value) };
                      setDeliveryOptions(updated);
                    }} 
                    placeholder="60" 
                  />
                </div>
              </div>
            ))}
          </div>
          <Button onClick={saveDeliveryOptions} className="gap-2 text-xs bg-primary hover:bg-primary/90">
            <Save className="w-4 h-4" /> SAVE DELIVERY OPTIONS
          </Button>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-sm font-bold tracking-widest uppercase">Shipping Info Policy</CardTitle>
          <p className="text-[10px] text-muted-foreground mt-1">Edit the customer-facing Shipping Information policy content (Markdown supported).</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            value={shippingInfo}
            onChange={(e) => setShippingInfo(e.target.value)}
            className="w-full h-48 p-4 bg-muted/20 border border-border/30 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/50 text-foreground font-sans resize-y"
            placeholder="Write your shipping policy here..."
          />
          <Button onClick={saveShippingInfo} className="gap-2 text-xs bg-primary hover:bg-primary/90">
            <Save className="w-4 h-4" /> SAVE SHIPPING INFO
          </Button>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-sm font-bold tracking-widest uppercase flex items-center gap-2">
            <Save className="w-4 h-4" /> Returns & Exchanges Settings
          </CardTitle>
          <p className="text-[10px] text-muted-foreground mt-1">Configure your return policy markdown content and return duration period.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Return Window Period (Days)</Label>
            <div className="flex gap-4">
              <Input 
                type="number"
                value={returnDays}
                onChange={(e) => setReturnDays(Number(e.target.value))}
                placeholder="7"
                className="max-w-[200px]"
              />
              <Button onClick={saveReturnDays} className="gap-2 text-xs bg-primary hover:bg-primary/90">
                <Save className="w-4 h-4" /> SAVE RETURN DAYS
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Returns & Exchanges Policy (Markdown)</Label>
            <textarea
              value={returnsExchanges}
              onChange={(e) => setReturnsExchanges(e.target.value)}
              className="w-full h-48 p-4 bg-muted/20 border border-border/30 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/50 text-foreground font-sans resize-y"
              placeholder="Write your returns policy here..."
            />
            <Button onClick={saveReturnsExchanges} className="gap-2 text-xs bg-primary hover:bg-primary/90">
              <Save className="w-4 h-4" /> SAVE RETURNS POLICY
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-sm font-bold tracking-widest uppercase flex items-center gap-2">
            <Palmtree className="w-4 h-4 text-[#ff4d00]" /> Vacation Mode Settings
          </CardTitle>
          <p className="text-[10px] text-muted-foreground mt-1">Activate vacation mode to temporarily show a holiday closure page and block access to storefront paths.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border border-border/20 rounded-xl bg-muted/10">
            <div className="space-y-0.5">
              <Label className="text-xs uppercase font-bold text-foreground">Enable Vacation Mode</Label>
              <p className="text-[10px] text-muted-foreground">When enabled, store visitors will see the custom holiday page.</p>
            </div>
            <Switch
              checked={vacationMode.enabled}
              onCheckedChange={(checked) => setVacationMode({ ...vacationMode, enabled: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Custom Vacation Message</Label>
            <textarea
              value={vacationMode.message}
              onChange={(e) => setVacationMode({ ...vacationMode, message: e.target.value })}
              className="w-full h-24 p-4 bg-muted/20 border border-border/30 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary/50 text-foreground font-sans resize-y"
              placeholder="We are temporarily away on holiday. Ordering is temporarily paused, but we will return soon!"
            />
          </div>

          <Button onClick={saveVacationMode} className="gap-2 text-xs bg-primary hover:bg-primary/90">
            <Save className="w-4 h-4" /> SAVE VACATION MODE SETTINGS
          </Button>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-sm font-bold tracking-widest uppercase flex items-center gap-2">
            <Mail className="w-4 h-4" /> Email Configuration (SMTP)
          </CardTitle>
          <p className="text-[10px] text-muted-foreground mt-1">Configure your email server for sending notifications and password resets.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">SMTP Host</Label>
              <Input 
                value={smtpConfig.host} 
                onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })} 
                placeholder="e.g. smtp.gmail.com" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">SMTP Port</Label>
              <Input 
                type="number"
                value={smtpConfig.port} 
                onChange={(e) => setSmtpConfig({ ...smtpConfig, port: Number(e.target.value) })} 
                placeholder="587 or 465" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">SMTP User (Email)</Label>
              <Input 
                value={smtpConfig.user} 
                onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })} 
                placeholder="your-email@gmail.com" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">SMTP Password / App Password</Label>
              <Input 
                type="password"
                value={smtpConfig.pass} 
                onChange={(e) => setSmtpConfig({ ...smtpConfig, pass: e.target.value })} 
                placeholder="••••••••••••••••" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Sender Name</Label>
              <Input 
                value={smtpConfig.fromName} 
                onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })} 
                placeholder="e.g. ঠেলাগাড়ী" 
              />
            </div>
          </div>
          <Button onClick={saveSmtpConfig} className="gap-2 text-xs bg-primary hover:bg-primary/90">
            <Save className="w-4 h-4" /> SAVE EMAIL SETTINGS
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
