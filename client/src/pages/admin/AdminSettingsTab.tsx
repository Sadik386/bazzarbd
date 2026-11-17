import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useVacationMode } from "@/hooks/useCatalog";
import { api } from "@/lib/api";

export function AdminSettingsTab() {
  const queryClient = useQueryClient();
  const { data: vacation } = useVacationMode();

  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (vacation) {
      setEnabled(Boolean(vacation.enabled));
      setMessage(vacation.message || "");
    }
  }, [vacation]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/settings", {
        key: "vacation_mode",
        value: { enabled, message: message.trim() },
      });
      toast.success("Storefront settings saved");
      queryClient.invalidateQueries({ queryKey: ["setting", "vacation_mode"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Storefront Availability & Vacation Mode</CardTitle>
        <CardDescription>
          Temporarily pause public shopping routes during stocktaking or Eid holidays while keeping Admin access live.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Enable Vacation Mode</p>
              <p className="text-xs text-muted-foreground">
                Public storefront routes will show your maintenance notice.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vac-msg">Visitor notice message</Label>
            <Textarea
              id="vac-msg"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="We are taking a short Eid holiday break and will reopen on..."
            />
          </div>

          <Button type="submit" isLoading={saving}>
            Save settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
