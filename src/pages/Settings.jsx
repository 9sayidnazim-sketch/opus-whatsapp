import { db, whatsappURL } from "@/api/client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bell, Save, ShieldCheck, Key, Sliders, Send } from "lucide-react";
import toast from "react-hot-toast";

import NotificationToggle from "../components/settings/NotificationToggle";
import NotificationThreshold from "../components/settings/NotificationThreshold";
import WhatsAppConnection from "../components/settings/WhatsAppConnection";
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendTestPushNotification
} from "@/utils/notifications";

const defaultSettings = {
  currency: "AED",
  budget_alerts_enabled: true,
  budget_alert_threshold: 80,
  goal_deadline_alerts_enabled: true,
  goal_deadline_days: 7,
  large_transaction_alerts_enabled: true,
  large_transaction_threshold: 1000,
  bill_due_alerts_enabled: true,
  bill_due_days_before: 2,
  bill_due_day_alert: true,
  weekly_summary_enabled: true,
  weekly_summary_day: "sunday",
  monthly_summary_enabled: true,
  monthly_summary_day: 1,
  // Octapus platform standard layer
  octapus_payment_wall_enabled: false,
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState(null);
  const [browserPermission, setBrowserPermission] = useState(() => getNotificationPermission());

  const handleEnableNotifications = async () => {
    const perm = await requestNotificationPermission();
    setBrowserPermission(perm);
    if (perm === 'granted') {
      toast.success("Browser push notifications enabled!");
      await sendTestPushNotification();
    } else if (perm === 'denied') {
      toast.error("Notifications are blocked in your browser settings");
    }
  };

  const handleTestNotification = async () => {
    const ok = await sendTestPushNotification();
    if (ok) {
      toast.success("Test push notification dispatched!");
    } else {
      toast.error("Please allow notification permission in your browser");
    }
  };

  const { data: settingsList, isLoading, isError } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: () => db.entities.NotificationSettings.list(),
  });

  useEffect(() => {
    if (settingsList) {
      setSettings({
        ...defaultSettings,
        ...(settingsList[0] || {})
      });
    }
  }, [settingsList]);

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.NotificationSettings.create(data),
    onSuccess: (newSettings) => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      setSettings(newSettings);
      toast.success("Settings saved successfully");
    },
    onError: () => toast.error("Could not save settings"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.NotificationSettings.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast.success("Settings saved successfully");
    },
    onError: () => toast.error("Could not save settings"),
  });

  const handleSave = () => {
    if (!settings || updateMutation.isPending || createMutation.isPending) return;
    if (settings.id) updateMutation.mutate({ id: settings.id, data: settings });
    else createMutation.mutate(settings);
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (isError) return (
    <div className="p-8 text-center text-sm text-destructive">
      Could not load settings from your ledger.
    </div>
  );

  if (isLoading || !settings) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 text-center text-sm text-muted-foreground">
        Loading preferences...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-6">
      {/* Page Title */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Settings & Integrations
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Configure currency, automated alert thresholds, and bot connections
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending || createMutation.isPending}
          className="fuloozi-btn-primary inline-flex h-10 items-center gap-2 px-5 text-xs sm:text-sm font-semibold shadow-lime disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {updateMutation.isPending || createMutation.isPending ? "Saving..." : "Save Preferences"}
        </button>
      </div>

      {/* WhatsApp Integration */}
      <WhatsAppConnection whatsappURL={whatsappURL} />

      {/* Browser Web Push Notifications */}
      <Card className="rounded-2xl border-border bg-card">
        <CardHeader className="p-5 border-b border-border/80 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#B5F13E]/15 rounded-xl text-[#B5F13E]">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold">Browser Push Notifications</CardTitle>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  browserPermission === 'granted'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : browserPermission === 'denied'
                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                }`}>
                  {browserPermission === 'granted' ? 'Active' : browserPermission === 'denied' ? 'Blocked' : 'Action Required'}
                </span>
              </div>
              <CardDescription className="text-xs">
                Real-time native desktop and mobile notifications for due bills and budget alerts
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-secondary/40 border border-border/60">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {browserPermission === 'granted'
                  ? 'Push notifications are enabled'
                  : 'Enable instant browser push'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {browserPermission === 'granted'
                  ? 'You will receive alerts on this device even when the tab is backgrounded.'
                  : 'Grant browser permission to receive timely reminders for utility bills & monthly limits.'}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {browserPermission !== 'granted' ? (
                <button
                  type="button"
                  onClick={handleEnableNotifications}
                  className="fuloozi-btn-primary px-4 py-2 text-xs font-semibold shadow-lime inline-flex items-center gap-1.5"
                >
                  <Bell className="w-3.5 h-3.5" /> Enable Notifications
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleTestNotification}
                  className="px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5 text-[#B5F13E]" /> Send Test Push
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground pt-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#B5F13E]" />
              <span>Bill Due Reminders (3 days prior)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Budget Limits (&ge; 80% threshold)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>Savings Milestone Updates</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ledger Preferences */}
      <Card className="rounded-2xl border-border bg-card">
        <CardHeader className="p-5 border-b border-border/80 flex flex-row items-center gap-3">
          <div className="p-2.5 bg-secondary rounded-xl text-foreground">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Ledger & Currency Preferences</CardTitle>
            <CardDescription className="text-xs">Base currency for records and reports</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">Base Currency</p>
              <p className="text-xs text-muted-foreground">Default currency used across all household ledgers</p>
            </div>
            <select
              value={settings.currency || "AED"}
              onChange={(e) => handleChange("currency", e.target.value)}
              className="h-10 px-3 rounded-xl bg-secondary border border-border text-xs sm:text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-[#B5F13E]"
            >
              <option value="AED">AED — United Arab Emirates Dirham (د.إ)</option>
              <option value="USD">USD — US Dollar ($)</option>
              <option value="EUR">EUR — Euro (€)</option>
              <option value="SAR">SAR — Saudi Riyal (ر.س)</option>
              <option value="GBP">GBP — British Pound (£)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Budget Alerts */}
      <Card className="rounded-2xl border-border bg-card">
        <CardHeader className="p-5 border-b border-border/80 flex flex-row items-center gap-3">
          <div className="p-2.5 bg-[#B5F13E]/15 rounded-xl text-[#B5F13E]">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Spending & Budget Warnings</CardTitle>
            <CardDescription className="text-xs">
              Alerts when categories near or breach monthly limits
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <NotificationToggle
            label="Category Budget Alert"
            description="Trigger alerts when spending approaches category capacity"
            enabled={settings.budget_alerts_enabled}
            onChange={(val) => handleChange('budget_alerts_enabled', val)}
          />

          {settings.budget_alerts_enabled && (
            <NotificationThreshold
              label="Warning Threshold"
              description="Alert triggered when category reaches this percentage"
              value={settings.budget_alert_threshold}
              onChange={(val) => handleChange('budget_alert_threshold', val)}
              min={50}
              max={100}
              step={5}
              suffix="%"
            />
          )}

          <div className="pt-2 border-t border-border/60">
            <NotificationToggle
              label="Large Transaction Watch"
              description="Notify when a single expense exceeds a specified amount"
              enabled={settings.large_transaction_alerts_enabled}
              onChange={(val) => handleChange('large_transaction_alerts_enabled', val)}
            />
            {settings.large_transaction_alerts_enabled && (
              <NotificationThreshold
                label="Large Outflow Amount"
                description="Minimum AED amount to trigger an alert"
                value={settings.large_transaction_threshold}
                onChange={(val) => handleChange('large_transaction_threshold', val)}
                min={200}
                max={10000}
                step={100}
                suffix=" AED"
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bill Due Reminders */}
      <Card className="rounded-2xl border-border bg-card">
        <CardHeader className="p-5 border-b border-border/80 flex flex-row items-center gap-3">
          <div className="p-2.5 bg-amber-500/15 rounded-xl text-amber-400">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Upcoming Bill Reminders</CardTitle>
            <CardDescription className="text-xs">Advance notice before utility and bill due dates</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <NotificationToggle
            label="Bill Due Date Notice"
            description="Notify in advance of due dates for DEWA, telecom, and rent"
            enabled={settings.bill_due_alerts_enabled}
            onChange={(val) => handleChange('bill_due_alerts_enabled', val)}
          />

          {settings.bill_due_alerts_enabled && (
            <NotificationThreshold
              label="Days Before Due"
              description="How many days in advance to remind"
              value={settings.bill_due_days_before}
              onChange={(val) => handleChange('bill_due_days_before', val)}
              min={1}
              max={7}
              step={1}
              suffix=" days"
            />
          )}
        </CardContent>
      </Card>

      {/* Octapus Platform Layer */}
      <Card className="rounded-2xl border-border bg-card">
        <CardHeader className="p-5 border-b border-border/80 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#B5F13E]/15 rounded-xl text-[#B5F13E]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Octapus Platform Integration</CardTitle>
              <CardDescription className="text-xs">Standard platform connection layer & payment wall</CardDescription>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
            Connected
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
              onClick={() => handleChange('octapus_payment_wall_enabled', !settings.octapus_payment_wall_enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.octapus_payment_wall_enabled ? 'bg-[#B5F13E]' : 'bg-secondary'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                  settings.octapus_payment_wall_enabled ? 'translate-x-6' : 'translate-x-1'
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

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending || createMutation.isPending}
          className="fuloozi-btn-primary inline-flex h-11 items-center gap-2 px-6 text-sm font-semibold shadow-lime disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {updateMutation.isPending || createMutation.isPending ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}
