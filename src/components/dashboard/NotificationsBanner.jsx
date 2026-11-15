import { useMemo, useState, useEffect } from 'react';
import { AlertTriangle, Target, Calendar, ChevronRight, Bell, BellRing, X } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl, getCategoryLabel, formatCurrency } from "@/utils";
import { differenceInDays, startOfDay } from "date-fns";
import { 
  isNotificationSupported, 
  getNotificationPermission, 
  requestNotificationPermission, 
  sendTestPushNotification 
} from "@/utils/notifications";
import { toast } from "sonner";

export default function NotificationsBanner({ 
  budgetsWithSpent, 
  goals, 
  transactions,
  settings 
}) {
  const [permission, setPermission] = useState('default');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  useEffect(() => {
    if (isNotificationSupported()) {
      setPermission(getNotificationPermission());
    }
  }, []);

  const handleEnablePush = async () => {
    setIsEnabling(true);
    try {
      const result = await requestNotificationPermission();
      setPermission(result);
      if (result === 'granted') {
        toast.success("Push notifications enabled!");
        await sendTestPushNotification();
      } else if (result === 'denied') {
        toast.error("Notification permission was denied. You can enable it in your browser settings.");
      }
    } catch {
      toast.error("Could not enable notifications");
    } finally {
      setIsEnabling(false);
    }
  };

  const notifications = useMemo(() => {
    const alerts = [];

    // Check budgets near or exceeding limits
    if (settings?.budget_alerts_enabled !== false) {
      const threshold = settings?.budget_alert_threshold || 80;
      budgetsWithSpent?.forEach(budget => {
        if (!budget?.category) return;
        const catLabel = getCategoryLabel(budget.category);
        
        if (budget.percentage >= threshold && !budget.isExceeded) {
          alerts.push({
            id: `budget-${budget.id}`,
            type: 'budget-warning',
            title: 'Budget Warning',
            message: `${catLabel} is at ${Math.round(budget.percentage)}% of monthly limit`,
            icon: AlertTriangle,
            color: 'text-amber-400',
            bgColor: 'bg-amber-500/10',
            borderColor: 'border-amber-500/20',
            link: createPageUrl("Budgets")
          });
        }
        if (budget.isExceeded) {
          alerts.push({
            id: `budget-exceeded-${budget.id}`,
            type: 'budget-exceeded',
            title: 'Budget Exceeded',
            message: `${catLabel} exceeded limit by ${formatCurrency(Math.abs(budget.remaining))}`,
            icon: AlertTriangle,
            color: 'text-rose-400',
            bgColor: 'bg-rose-500/10',
            borderColor: 'border-rose-500/20',
            link: createPageUrl("Budgets")
          });
        }
      });
    }

    // Check goals approaching target date
    if (settings?.goal_deadline_alerts_enabled !== false) {
      const deadlineDays = settings?.goal_deadline_days || 14;
      (goals || [])
        .filter(g => (!g.status || g.status === 'em_progresso' || g.status === 'in_progress' || g.status === 'active') && g.target_date)
        .forEach(goal => {
          const daysRemaining = differenceInDays(new Date(goal.target_date), new Date());
          if (daysRemaining > 0 && daysRemaining <= deadlineDays) {
            const pct = Math.round((Number(goal.current_amount || 0) / Number(goal.target_amount || 1)) * 100);
            alerts.push({
              id: `goal-${goal.id}`,
              type: 'goal-deadline',
              title: 'Goal Approaching Target',
              message: `"${goal.title}" target in ${daysRemaining} days (${pct}% saved)`,
              icon: Target,
              color: 'text-[#B5F13E]',
              bgColor: 'bg-[#B5F13E]/10',
              borderColor: 'border-[#B5F13E]/20',
              link: createPageUrl("Goals")
            });
          }
        });
    }

    // Check pending bills
    if (settings?.bill_due_alerts_enabled !== false) {
      const today = startOfDay(new Date());
      (transactions || [])
        .filter(t => t.type === 'despesa' && t.due_date && t.payment_status === 'pendente')
        .forEach(bill => {
          const billDue = startOfDay(new Date(bill.due_date));
          const daysUntil = differenceInDays(billDue, today);
          if (daysUntil <= 5 && daysUntil >= 0) {
            alerts.push({
              id: `bill-${bill.id}`,
              type: 'bill-due',
              title: daysUntil === 0 ? 'Bill Due Today' : `Bill Due in ${daysUntil} days`,
              message: `${bill.description || getCategoryLabel(bill.category)}: ${formatCurrency(bill.amount)}`,
              icon: Calendar,
              color: 'text-amber-400',
              bgColor: 'bg-amber-500/10',
              borderColor: 'border-amber-500/20',
              link: createPageUrl("Bills")
            });
          }
        });
    }

    return alerts.slice(0, 3);
  }, [budgetsWithSpent, goals, transactions, settings]);

  const showPushPrompt = isNotificationSupported() && permission === 'default' && !bannerDismissed;

  if (notifications.length === 0 && !showPushPrompt) return null;

  return (
    <div className="mb-6 space-y-2.5">
      {/* 1-Click Push Notification Enable Card */}
      {showPushPrompt && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:px-4 rounded-xl border border-[#B5F13E]/30 bg-[#B5F13E]/10 text-foreground transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <span className="p-2 rounded-lg bg-[#B5F13E]/20 text-[#B5F13E] shrink-0">
              <BellRing className="w-4 h-4 animate-pulse" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">
                Enable Browser Push Notifications
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                Get real-time desktop alerts when utility bills are due or monthly budgets are near limits.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={handleEnablePush}
              disabled={isEnabling}
              className="h-8 px-3 rounded-lg bg-[#B5F13E] text-black font-semibold text-xs hover:bg-[#a6e033] transition-colors disabled:opacity-50"
            >
              {isEnabling ? "Enabling..." : "Enable Alerts"}
            </button>
            <button
              onClick={() => setBannerDismissed(true)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              aria-label="Dismiss banner"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Active Ledger Alerts */}
      {notifications.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            to={item.link}
            className={`flex items-center justify-between p-3 sm:px-4 rounded-xl border ${item.bgColor} ${item.borderColor} transition-colors hover:brightness-110`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className={`p-1.5 rounded-lg bg-card/60 ${item.color} shrink-0`}>
                <Icon className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <span className={`text-xs font-semibold ${item.color} mr-2`}>{item.title}</span>
                <span className="text-xs text-foreground/90 truncate">{item.message}</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
          </Link>
        );
      })}
    </div>
  );
}
