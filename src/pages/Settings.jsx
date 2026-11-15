import { db, whatsappURL } from "@/api/client";

import { useState, useEffect } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle, Save } from "lucide-react";
import toast from "react-hot-toast";

import NotificationToggle from "../components/settings/NotificationToggle";
import NotificationThreshold from "../components/settings/NotificationThreshold";
import WhatsAppConnection from "../components/settings/WhatsAppConnection";

const defaultSettings = {
        budget_alerts_enabled: true,
        budget_alert_threshold: 80,
        goal_deadline_alerts_enabled: true,
        goal_deadline_days: 7,
        large_transaction_alerts_enabled: true,
        large_transaction_threshold: 500,
        bill_due_alerts_enabled: true,
        bill_due_days_before: 2,
        bill_due_day_alert: true,
        weekly_summary_enabled: true,
        weekly_summary_day: "domingo",
        monthly_summary_enabled: true,
        monthly_summary_day: 1
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState(null);

  const { data: settingsList, isLoading, isError } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: () => db.entities.NotificationSettings.list(),
  });

  useEffect(() => {
    if (settingsList) setSettings(settingsList[0] ?? defaultSettings);
  }, [settingsList]);

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.NotificationSettings.create(data),
    onSuccess: (newSettings) => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      setSettings(newSettings);
      toast.success("Settings saved");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.NotificationSettings.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast.success("Settings saved");
    },
  });

  const handleSave = () => {
    if (!settings || updateMutation.isPending || createMutation.isPending) return;
    if (settings.id) updateMutation.mutate({ id: settings.id, data: settings });
    else createMutation.mutate(settings);
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };



  if (isError) return <p className="p-8" role="alert">Could not load settings</p>;

  if (isLoading || !settings) {
    return (
      <div className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            Loading settings...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="font-heading text-[32px] leading-tight font-semibold tracking-[-0.03em] text-foreground mb-2">Notification Settings</h1>
          <p className="text-muted-foreground">
            Configure how and when you want to receive financial alerts
          </p>
        </div>

        <div className="space-y-6">
          <WhatsAppConnection whatsappURL={whatsappURL} />

          <Card className="shadow-none">
            <CardHeader className="border-b bg-muted">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[hsl(216_24%_36%)] rounded-lg">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Budget Alerts</CardTitle>
                  <CardDescription>
                    Get notified when your spending approaches the limit
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <NotificationToggle
                label="Budget Alerts"
                description="Notify when the configured budget percentage is reached"
                enabled={settings.budget_alerts_enabled}
                onChange={(value) => handleChange('budget_alerts_enabled', value)}
              />
              
              {settings.budget_alerts_enabled && (
                <NotificationThreshold
                  label="Alert Percentage"
                  description="Alert when this budget percentage is reached"
                  value={settings.budget_alert_threshold}
                  onChange={(value) => handleChange('budget_alert_threshold', value)}
                  min={50}
                  max={100}
                  step={5}
                  suffix="%"
                />
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="border-b bg-muted">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[hsl(264_23%_36%)] rounded-lg">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Goal Alerts</CardTitle>
                  <CardDescription>
                    Get reminders about your savings goals
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <NotificationToggle
                label="Deadline Alerts"
                description="Notify when a goal's target date is approaching"
                enabled={settings.goal_deadline_alerts_enabled}
                onChange={(value) => handleChange('goal_deadline_alerts_enabled', value)}
              />
              
              {settings.goal_deadline_alerts_enabled && (
                <NotificationThreshold
                  label="Alert Lead Time"
                  description="Alert this many days before the target date"
                  value={settings.goal_deadline_days}
                  onChange={(value) => handleChange('goal_deadline_days', value)}
                  min={1}
                  max={30}
                  step={1}
                  suffix=" days"
                />
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="border-b bg-muted">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[hsl(26_24%_36%)] rounded-lg">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Large Transaction Alerts</CardTitle>
                  <CardDescription>
                    Get notified when you spend above a set amount
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <NotificationToggle
                label="Large Expense Alerts"
                description="Notify when an expense above the set amount is recorded"
                enabled={settings.large_transaction_alerts_enabled}
                onChange={(value) => handleChange('large_transaction_alerts_enabled', value)}
              />
              
              {settings.large_transaction_alerts_enabled && (
                <NotificationThreshold
                  label="Minimum Amount"
                  description="Consider transactions large from this amount up"
                  value={settings.large_transaction_threshold}
                  onChange={(value) => handleChange('large_transaction_threshold', value)}
                  min={100}
                  max={5000}
                  step={100}
                  suffix=""
                />
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="border-b bg-muted">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[hsl(354_22%_36%)] rounded-lg">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Due Date Alerts</CardTitle>
                  <CardDescription>
                    Get reminders about upcoming bills
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <NotificationToggle
                label="Bill Due Alerts"
                description="Notify about bills nearing their due date"
                enabled={settings.bill_due_alerts_enabled}
                onChange={(value) => handleChange('bill_due_alerts_enabled', value)}
              />
              
              {settings.bill_due_alerts_enabled && (
                <>
                  <NotificationThreshold
                    label="Alert Lead Time"
                    description="Alert X days before the due date"
                    value={settings.bill_due_days_before}
                    onChange={(value) => handleChange('bill_due_days_before', value)}
                    min={1}
                    max={7}
                    step={1}
                    suffix=" days"
                  />

                  <div className="pl-12">
                    <NotificationToggle
                      label="Alert on Due Date"
                      description="Also get notified on the day the bill is due"
                      enabled={settings.bill_due_day_alert}
                      onChange={(value) => handleChange('bill_due_day_alert', value)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="border-b bg-muted">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[hsl(151_20%_36%)] rounded-lg">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Automatic Summaries</CardTitle>
                  <CardDescription>
                    Get periodic summaries of your finances
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <NotificationToggle
                label="Weekly Summary"
                description="Get a weekly report with your transactions and financial status"
                enabled={settings.weekly_summary_enabled}
                onChange={(value) => handleChange('weekly_summary_enabled', value)}
              />
              
              {settings.weekly_summary_enabled && (
                <div className="pl-12">
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Day of the Week
                  </label>
                  <select
                    value={settings.weekly_summary_day}
                    onChange={(e) => handleChange('weekly_summary_day', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="segunda">Monday</option>
                    <option value="terca">Tuesday</option>
                    <option value="quarta">Wednesday</option>
                    <option value="quinta">Thursday</option>
                    <option value="sexta">Friday</option>
                    <option value="sabado">Saturday</option>
                    <option value="domingo">Sunday</option>
                  </select>
                </div>
              )}

              <NotificationToggle
                label="Monthly Summary"
                description="Get a complete monthly report of your finances"
                enabled={settings.monthly_summary_enabled}
                onChange={(value) => handleChange('monthly_summary_enabled', value)}
              />
              
              {settings.monthly_summary_enabled && (
                <NotificationThreshold
                  label="Day of the Month"
                  description="Day you want to receive the monthly summary"
                  value={settings.monthly_summary_day}
                  onChange={(value) => handleChange('monthly_summary_day', value)}
                  min={1}
                  max={28}
                  step={1}
                  suffix=""
                />
              )}
            </CardContent>
          </Card>

          <Card className="border-[hsl(151_20%_19%)] bg-[hsl(151_20%_19%)]">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-[hsl(151_31%_73%)] mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-[hsl(151_31%_73%)] mb-2">
                    How do notifications work?
                  </h3>
                  <ul className="space-y-1 text-sm text-[hsl(151_31%_73%)]">
                    <li>• <strong>Budgets:</strong> You'll be alerted when spending reaches the configured percentage</li>
                    <li>• <strong>Goals:</strong> You'll get reminders when the target date approaches</li>
                    <li>• <strong>Large Transactions:</strong> You'll be notified when an expense above the set amount is recorded</li>
                    <li>• <strong>Due Dates:</strong> You'll get alerts before and on the day bills are due</li>
                    <li>• <strong>Summaries:</strong> Automatic reports analyzing your finances</li>
                  </ul>
                  <p className="text-sm text-[hsl(151_31%_73%)] mt-3">
                    💡 Connect your WhatsApp above to start receiving notifications!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              onClick={handleSave}
              className="bg-[hsl(151_20%_36%)] hover:bg-[hsl(151_20%_36%)]"
              disabled={updateMutation.isPending || createMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}