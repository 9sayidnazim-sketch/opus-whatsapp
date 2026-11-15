import { formatCurrency, getCategoryLabel } from './index';
import { differenceInDays, startOfDay } from 'date-fns';

const NOTIFIED_CACHE_KEY = 'fuloozi_notified_alerts';

/**
 * Check if the browser supports notifications
 */
export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current browser notification permission
 */
export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

/**
 * Register Service Worker for push notifications
 */
export async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return registration;
  } catch (err) {
    console.warn('Service worker registration failed:', err);
    return null;
  }
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await registerServiceWorker();
    }
    return permission;
  } catch (err) {
    console.error('Failed to request notification permission:', err);
    return 'denied';
  }
}

/**
 * Show a native browser notification
 */
export async function showBrowserNotification({
  title,
  body,
  icon = '/favicon.svg',
  tag,
  url = '/',
}) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const registration = await registerServiceWorker();
    if (registration && 'showNotification' in registration) {
      await registration.showNotification(title, {
        body,
        icon,
        badge: '/favicon.svg',
        tag: tag || `fuloozi-${Date.now()}`,
        data: { url },
        vibrate: [100, 50, 100],
      });
      return true;
    }

    // Fallback to Window Notification API
    const n = new Notification(title, {
      body,
      icon,
      tag: tag || `fuloozi-${Date.now()}`,
    });
    n.onclick = () => {
      window.focus();
      if (url && window.location.pathname !== url) {
        window.location.href = url;
      }
      n.close();
    };
    return true;
  } catch (err) {
    console.error('Failed to display browser notification:', err);
    return false;
  }
}

/**
 * Test push notification
 */
export async function sendTestPushNotification() {
  const perm = await requestNotificationPermission();
  if (perm !== 'granted') return false;

  return showBrowserNotification({
    title: 'Fuloozi Ledger Notification',
    body: 'Browser push notifications are active! You will receive alerts for upcoming bills, budget warnings, and savings milestones.',
    tag: 'test-push',
    url: '/dashboard',
  });
}

/**
 * Check and trigger notifications for upcoming bills and budget warnings
 */
export function checkAndTriggerDueAlerts({ transactions = [], budgets = [], goals = [], settings = {} }) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  let notifiedSet = new Set();
  try {
    const raw = sessionStorage.getItem(NOTIFIED_CACHE_KEY);
    if (raw) notifiedSet = new Set(JSON.parse(raw));
  } catch {}

  const today = startOfDay(new Date());

  // 1. Check pending bills
  if (settings.bill_due_alerts_enabled !== false) {
    const leadDays = settings.bill_due_days_before || 3;
    transactions
      .filter(t => t.type === 'despesa' && t.due_date && t.payment_status === 'pendente')
      .forEach(bill => {
        const dueDate = startOfDay(new Date(bill.due_date));
        const days = differenceInDays(dueDate, today);
        const alertId = `bill-${bill.id}-${bill.due_date}`;

        if (days <= leadDays && days >= 0 && !notifiedSet.has(alertId)) {
          notifiedSet.add(alertId);
          showBrowserNotification({
            title: days === 0 ? '⚠️ Bill Due Today' : `📅 Bill Due in ${days} days`,
            body: `${bill.description || getCategoryLabel(bill.category)}: ${formatCurrency(bill.amount)} is due on ${bill.due_date}.`,
            tag: alertId,
            url: '/bills',
          });
        }
      });
  }

  // 2. Check budget limits
  if (settings.budget_alerts_enabled !== false) {
    const threshold = settings.budget_alert_threshold || 80;
    const currentMonth = new Date().toISOString().slice(0, 7);

    budgets.forEach(budget => {
      const spent = transactions
        .filter(t => t.type === 'despesa' && t.category === budget.category)
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const pct = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
      const alertId = `budget-${budget.id}-${currentMonth}-${pct >= 100 ? 'over' : 'warning'}`;

      if (pct >= threshold && !notifiedSet.has(alertId)) {
        notifiedSet.add(alertId);
        showBrowserNotification({
          title: pct >= 100 ? '🚨 Budget Exceeded' : '⚠️ Budget Warning',
          body: `${getCategoryLabel(budget.category)} is at ${Math.round(pct)}% (${formatCurrency(spent)} of ${formatCurrency(budget.amount)}).`,
          tag: alertId,
          url: '/budgets',
        });
      }
    });
  }

  try {
    sessionStorage.setItem(NOTIFIED_CACHE_KEY, JSON.stringify([...notifiedSet]));
  } catch {}
}

