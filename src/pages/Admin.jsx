import { isSupabaseConfigured, db } from "@/api/client";
import { useState, useEffect } from "react";
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
import WhatsAppConnection from "@/components/settings/WhatsAppConnection";
import AIAgentSettings from "@/components/admin/AIAgentSettings";
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
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Key,
  Layers,
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
  const [activeTab, setActiveTab] = useState("ai");
  const [form, setForm] = useState({
    title: "",
    body: "",
    type: "info",
    audience: "all",
    url: "",
  });
  const [sending, setSending] = useState(false);
  const [permState, setPermState] = useState(() => getNotificationPermission());
  const [paymentWall, setPaymentWall] = useState(false);

  // Load payment wall setting from localStorage or DB
  useEffect(() => {
    const saved = localStorage.getItem('fuloozi_payment_wall');
    if (saved !== null) {
      setPaymentWall(saved === 'true');
    }
  }, []);

  const handleTogglePaymentWall = () => {
    const nextVal = !paymentWall;
    setPaymentWall(nextVal);
    localStorage.setItem('fuloozi_payment_wall', String(nextVal));
    toast.success(`Payment wall ${nextVal ? 'enabled' : 'disabled'}`);
  };

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
  const { data: history = [] } = useQuery({
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
              Admin & Infrastructure Center
            </h1>
            <Badge className="bg-[#B5F13E]/15 text-[#B5F13E] border-[#B5F13E]/30 text-[10px] font-bold uppercase tracking-wider">
              Superuser
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage AI agents, WhatsApp Evolution Gateway, biometric security, push broadcasts, and platform layers.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-secondary/60 p-1 border border-border/60 rounded-xl flex flex-wrap sm:grid sm:grid-cols-5 h-auto sm:h-12 w-full gap-1">
          {/* Tab 1: AI Agent */}
          <TabsTrigger
            value="ai"
            className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-[#B5F13E] flex items-center justify-center gap-1.5 transition-all py-2 sm:py-0 flex-1 sm:flex-initial"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Agent</span>
          </TabsTrigger>

          {/* Tab 2: WhatsApp Gateway */}
          <TabsTrigger
            value="whatsapp"
            className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-[#B5F13E] flex items-center justify-center gap-1.5 transition-all py-2 sm:py-0 flex-1 sm:flex-initial"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp Gateway</span>
          </TabsTrigger>

          {/* Tab 3: Passkeys & Biometrics */}
          <TabsTrigger
            value="passkeys"
            className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-[#B5F13E] flex items-center justify-center gap-1.5 transition-all py-2 sm:py-0 flex-1 sm:flex-initial"
          >
            <Fingerprint className="w-3.5 h-3.5" />
            <span>Passkeys</span>
          </TabsTrigger>

          {/* Tab 4: Push Notifications */}
          <TabsTrigger
            value="notifications"
            className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-[#B5F13E] flex items-center justify-center gap-1.5 transition-all py-2 sm:py-0 flex-1 sm:flex-initial"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Broadcasts</span>
          </TabsTrigger>

          {/* Tab 5: Platform Layer */}
          <TabsTrigger
            value="platform"
            className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:text-[#B5F13E] flex items-center justify-center gap-1.5 transition-all py-2 sm:py-0 flex-1 sm:flex-initial"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Platform</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: AI Agent Hub */}
        <TabsContent value="ai" className="space-y-6 mt-0">
          <AIAgentSettings />
        </TabsContent>

        {/* TAB 2: WhatsApp Evolution Gateway */}
        <TabsContent value="whatsapp" className="space-y-6 mt-0">
          <WhatsAppConnection />
        </TabsContent>

        {/* TAB 3: Passkeys & Biometrics */}
        <TabsContent value="passkeys" className="space-y-6 mt-0">
          {import.meta.env.DEV && !isSupabaseConfigured ? (
            <BiometricsSettings />
          ) : (
            <p className="text-sm text-muted-foreground">Device passkeys are configured via the secure hardware module.</p>
          )}
        </TabsContent>

        {/* TAB 4: Push Broadcasts */}
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

          {/* Compose Form */}
          <Card className="shadow-none border-border bg-card">
            <CardHeader className="p-5 border-b border-border/80">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Send className="w-4 h-4 text-[#B5F13E]" />
                Dispatch Broadcast Notification
              </CardTitle>
              <CardDescription className="text-xs">
                Send an immediate push alert to household members across desktop and mobile browsers.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleSend} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-foreground font-medium">Notification Title</Label>
                  <Input
                    placeholder="e.g. DEWA Bill Settlement Required"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="bg-secondary/40 border-border text-xs text-foreground focus:ring-[#B5F13E]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-foreground font-medium">Message Body</Label>
                  <Textarea
                    placeholder="e.g. Electricity bill for March (AED 680) is due in 3 days. Please review and settle."
                    value={form.body}
                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                    className="bg-secondary/40 border-border text-xs text-foreground resize-none h-20 focus:ring-[#B5F13E]"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-foreground font-medium">Alert Classification</Label>
                    <Select value={form.type} onValueChange={(val) => setForm({ ...form, type: val })}>
                      <SelectTrigger className="bg-secondary/40 border-border text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NOTIF_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value} className="text-xs">
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-foreground font-medium">Audience</Label>
                    <Select value={form.audience} onValueChange={(val) => setForm({ ...form, audience: val })}>
                      <SelectTrigger className="bg-secondary/40 border-border text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AUDIENCE_OPTIONS.map((a) => (
                          <SelectItem key={a.value} value={a.value} className="text-xs">
                            {a.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={sending}
                    className="fuloozi-btn-primary px-5 py-2 text-xs font-semibold shadow-lime disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {sending ? "Delivering..." : "Dispatch Broadcast"}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* History */}
          <Card className="shadow-none border-border bg-card">
            <CardHeader className="p-5 border-b border-border/80">
              <CardTitle className="text-base font-semibold text-foreground">Delivery Log</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No notifications in history yet.</p>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {history.map((n) => {
                      const tc = typeConfig(n.type);
                      const NIcon = tc.icon;
                      return (
                        <motion.div
                          key={n.id}
                          initial={{ opacity: 0, y: -8 }}
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

        {/* TAB 5: Platform & Monetization */}
        <TabsContent value="platform" className="space-y-6 mt-0">
          <Card className="rounded-2xl border-border bg-card">
            <CardHeader className="p-5 border-b border-border/80 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#B5F13E]/15 rounded-xl text-[#B5F13E]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Octapus Platform Integration</CardTitle>
                  <CardDescription className="text-xs">Standard platform connection layer & monetization gateway</CardDescription>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                Active
              </span>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Premium Payment Wall</p>
                  <p className="text-xs text-muted-foreground">Toggle access gating for premium financial features</p>
                </div>
                <button
                  type="button"
                  onClick={handleTogglePaymentWall}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    paymentWall ? 'bg-[#B5F13E]' : 'bg-secondary'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                      paymentWall ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Key className="w-3.5 h-3.5 text-[#B5F13E]" />
                  <span>Platform Webhook Endpoint:</span>
                </div>
                <code className="text-[11px] text-[#B5F13E] font-mono bg-card px-2 py-0.5 rounded-md border border-border">
                  /api/whatsapp
                </code>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
