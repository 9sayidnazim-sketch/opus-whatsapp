import { db } from "@/api/client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import BiometricsSettings from "@/components/settings/BiometricsSettings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  Fingerprint,
  Send,
  Users,
  User,
  CheckCircle,
  Clock,
  Trash2,
  Megaphone,
  AlertTriangle,
  Info,
  Gift,
  TrendingUp,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { showBrowserNotification, getNotificationPermission, requestNotificationPermission } from "@/utils/notifications";

// Notification type config
const NOTIF_TYPES = [
  { value: "info",    label: "Information",   icon: Info,         color: "text-blue-400",   bg: "bg-blue-950/40 border-blue-900/40" },
  { value: "alert",   label: "Alert",         icon: AlertTriangle,color: "text-amber-400",  bg: "bg-amber-950/40 border-amber-900/40" },
  { value: "success", label: "Good News",     icon: Gift,         color: "text-emerald-400",bg: "bg-emerald-950/40 border-emerald-900/40" },
  { value: "promo",   label: "Announcement",  icon: Megaphone,    color: "text-[#B5F13E]",  bg: "bg-[#B5F13E]/5 border-[#B5F13E]/20" },
  { value: "insight", label: "Insight",       icon: TrendingUp,   color: "text-purple-400", bg: "bg-purple-950/40 border-purple-900/40" },
];

const AUDIENCE_OPTIONS = [
  { value: "all",    label: "Everyone",           icon: Users },
  { value: "owner",  label: "Head of Household",  icon: User },
  { value: "member", label: "Family Members",     icon: Users },
];

const TYPE_MAP = Object.fromEntries(NOTIF_TYPES.map(t => [t.value, t]));

function typeConfig(val) {
  return TYPE_MAP[val] || NOTIF_TYPES[0];
}

function StatusBadge({ status }) {
  if (status === "sent") return (
    <Badge className="bg-emerald-950/60 text-emerald-400 border border-emerald-900/40 text-[11px]">
      <CheckCircle className="w-3 h-3 mr-1" /> Delivered
    </Badge>
  );
  if (status === "scheduled") return (
    <Badge className="bg-amber-950/60 text-amber-400 border border-amber-900/40 text-[11px]">
      <Clock className="w-3 h-3 mr-1" /> Scheduled
    </Badge>
  );
  return (
    <Badge className="bg-secondary text-muted-foreground border border-border text-[11px]">
      {status}
    </Badge>
  );
}

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("notifications");
  const [form, setForm] = useState({
    title: "",
    body: "",
    type: "info",
    audience: "all",
    url: "",
  });
  const [sending, setSending] = useState(false);
  const [permState, setPermState] = useState(() => getNotificationPermission());

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setPermState(perm);
    if (perm === 'granted') {
      toast.success("Browser push notifications enabled!");
    } else if (perm === 'denied') {
      toast.error("Notifications are blocked in your browser settings");
    }
  };

  // Load notification history from local db
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["AdminNotification"],
    queryFn: () => db.entities.AdminNotification.list("-created_date"),
  });

  // Stats
  const sentCount = history.filter(n => n.status === "sent").length;
  const totalCount = history.length;

  const sendMutation = useMutation({
    mutationFn: async (payload) => {
      // 1. Fire browser push notification
      const delivered = await showBrowserNotification({
        title: payload.title,
        body: payload.body,
        url: payload.url || "/dashboard",
        tag: `admin-${Date.now()}`,
      });
      // 2. Persist to history
      return db.entities.AdminNotification.create({
        title: payload.title,
        body: payload.body,
        type: payload.type,
        audience: payload.audience,
        url: payload.url || "/dashboard",
        status: delivered ? "sent" : "failed",
        sent_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["AdminNotification"] });
      toast.success("Notification sent successfully!");
      setForm({ title: "", body: "", type: "info", audience: "all", url: "" });
    },
    onError: () => toast.error("Failed to send notification"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.AdminNotification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["AdminNotification"] });
      toast.success("Removed from history");
    },
  });

  async function handleSend(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Title and message are required");
      return;
    }
    if (permState !== "granted") {
      const perm = await requestNotificationPermission();
      setPermState(perm);
      if (perm !== "granted") {
        toast.error("Please allow browser notifications to deliver push alerts");
        return;
      }
    }
    setSending(true);
    try {
      await sendMutation.mutateAsync(form);
    } finally {
      setSending(false);
    }
  }

  const cfg = typeConfig(form.type);
  const TypeIcon = cfg.icon;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold font-heading tracking-tight text-foreground">
              Admin Control Center
            </h1>
            <Badge className="bg-[#B5F13E]/15 text-[#B5F13E] border-[#B5F13E]/30 text-[10px] font-bold uppercase tracking-wider">
              Superuser
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage household notifications, device passkeys, and biometric security policies.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-secondary/60 p-1 border border-border/60 rounded-xl grid grid-cols-2 max-w-md h-11">
          <TabsTrigger
            value="notifications"
            className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-[#B5F13E] flex items-center justify-center gap-2 transition-all"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Push Notifications</span>
          </TabsTrigger>
          <TabsTrigger
            value="passkeys"
            className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-[#B5F13E] flex items-center justify-center gap-2 transition-all"
          >
            <Fingerprint className="w-3.5 h-3.5" />
            <span>Passkeys & Biometrics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-8 mt-0">
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "Total Sent", value: sentCount, icon: CheckCircle, color: "text-emerald-400" },
          { label: "In History", value: totalCount, icon: Bell, color: "text-[#B5F13E]" },
          { label: "Notifications", value: permState === "granted" ? "Active" : "Off", icon: Bell, color: permState === "granted" ? "text-[#B5F13E]" : "text-red-400" },
        ].map((stat) => (
          <Card key={stat.label} className="shadow-none border-border bg-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/60">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground leading-tight">{stat.label}</p>
                <p className="text-xl font-bold text-foreground leading-tight">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Permission warning */}
      {permState !== "granted" && (
        <Card className="border-amber-900/40 bg-amber-950/20 shadow-none">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-300">Browser push notifications are currently off</p>
                <p className="text-xs text-amber-400/70 mt-0.5">
                  Enable browser notifications to deliver dedicated notifications directly to users.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRequestPermission}
              className="fuloozi-btn-primary px-3.5 py-1.5 text-xs font-semibold shrink-0"
            >
              Enable Now
            </button>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Compose form — 3 cols */}
        <Card className="lg:col-span-3 shadow-none border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="w-4 h-4 text-[#B5F13E]" />
              Compose Notification
            </CardTitle>
            <CardDescription className="text-xs">
              Write a message and choose who receives it
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSend} className="space-y-5">
              {/* Type + Audience */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTIF_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          <span className="flex items-center gap-2">
                            <t.icon className={`w-3.5 h-3.5 ${t.color}`} />
                            {t.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Audience</Label>
                  <Select value={form.audience} onValueChange={(v) => setForm(f => ({ ...f, audience: v }))}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIENCE_OPTIONS.map(a => (
                        <SelectItem key={a.value} value={a.value}>
                          <span className="flex items-center gap-2">
                            <a.icon className="w-3.5 h-3.5 text-muted-foreground" />
                            {a.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Budget Warning"
                  className="h-10 text-sm"
                  maxLength={80}
                  required
                />
                <p className="text-[11px] text-muted-foreground text-right">{form.title.length}/80</p>
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Message</Label>
                <Textarea
                  value={form.body}
                  onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))}
                  placeholder="Write your message here..."
                  className="text-sm resize-none"
                  rows={4}
                  maxLength={240}
                  required
                />
                <p className="text-[11px] text-muted-foreground text-right">{form.body.length}/240</p>
              </div>

              {/* Optional URL */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Deep link <span className="font-normal">(optional)</span>
                </Label>
                <Input
                  value={form.url}
                  onChange={(e) => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="/bills  or  /budgets"
                  className="h-10 text-sm font-mono"
                />
              </div>

              {/* Send button */}
              <Button
                type="submit"
                disabled={sending || !form.title.trim() || !form.body.trim()}
                className="w-full h-11 bg-[#B5F13E] text-[#121417] hover:bg-[#a3d937] font-semibold text-sm"
              >
                {sending ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Sending…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" /> Send Notification
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Live Preview — 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="shadow-none border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground font-medium">Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <motion.div
                key={form.type}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`rounded-xl border p-4 space-y-2 ${cfg.bg}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 p-1.5 rounded-lg bg-background/40`}>
                    <TypeIcon className={`w-4 h-4 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${cfg.color} leading-tight`}>
                      {form.title || "Notification title"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {form.body || "Your message will appear here…"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-muted-foreground">
                    → {AUDIENCE_OPTIONS.find(a => a.value === form.audience)?.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">Just now</span>
                </div>
              </motion.div>
            </CardContent>
          </Card>

          {/* Quick templates */}
          <Card className="shadow-none border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground font-medium">Quick Templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { type: "alert",   title: "Budget Warning",     body: "You've used over 80% of your monthly food budget. Check your spending." },
                { type: "success", title: "Goal Reached! 🎉",   body: "Your savings goal has been fully funded. Well done!" },
                { type: "info",    title: "Bill Due Soon",       body: "A bill is due in the next 3 days. Review your upcoming payments." },
                { type: "promo",   title: "Monthly Summary",     body: "Your household finance report for this month is ready." },
              ].map((tpl) => {
                const tc = typeConfig(tpl.type);
                const TIcon = tc.icon;
                return (
                  <button
                    key={tpl.title}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, title: tpl.title, body: tpl.body, type: tpl.type }))}
                    className="w-full text-left rounded-lg border border-border hover:border-[#B5F13E]/40 hover:bg-secondary/40 p-3 transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <TIcon className={`w-3.5 h-3.5 ${tc.color}`} />
                      <span className="text-xs font-medium text-foreground group-hover:text-[#B5F13E] transition-colors">
                        {tpl.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{tpl.body}</p>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Notification History */}
      <Card className="shadow-none border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Notification History
            </CardTitle>
            <Badge className="bg-secondary text-muted-foreground border border-border text-[11px]">
              {totalCount} total
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 rounded-lg bg-secondary/40 animate-pulse" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No notifications sent yet</p>
              <p className="text-xs opacity-60 mt-1">Use the form above to send your first message</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {history.map((n) => {
                  const tc = typeConfig(n.type);
                  const NIcon = tc.icon;
                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border bg-secondary/20 hover:bg-secondary/40 transition-colors group"
                    >
                      <div className={`mt-0.5 p-1.5 rounded-lg ${tc.bg}`}>
                        <NIcon className={`w-3.5 h-3.5 ${tc.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-foreground leading-tight truncate">
                            {n.title}
                          </p>
                          <StatusBadge status={n.status} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.body}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[11px] text-muted-foreground">
                            → {AUDIENCE_OPTIONS.find(a => a.value === n.audience)?.label || n.audience}
                          </span>
                          {n.sent_at && (
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(n.sent_at).toLocaleString("en-AE", {
                                month: "short", day: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteMutation.mutate(n.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                        title="Remove from history"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="passkeys" className="space-y-6 mt-0">
          <BiometricsSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

