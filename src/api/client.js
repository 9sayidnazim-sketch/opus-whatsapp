import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  typeof supabaseUrl === 'string' &&
  supabaseUrl.startsWith('http') &&
  supabaseKey
);

export const whatsappURL = /^\d{8,15}$/.test(import.meta.env.VITE_WHATSAPP_NUMBER || '')
  ? `https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER}`
  : 'https://wa.me/971500000000';

/* -------------------------------------------------------------
 * Local Storage Mock Provider for Instant Local Development
 * ------------------------------------------------------------- */
const DEV_STORAGE_PREFIX = 'fuloozi_ledger_';

function getInitialData(kind) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const d01 = `${yyyy}-${mm}-01`;
  const d03 = `${yyyy}-${mm}-03`;
  const d06 = `${yyyy}-${mm}-06`;
  const d10 = `${yyyy}-${mm}-10`;
  const d20 = `${yyyy}-${mm}-20`;

  switch (kind) {
    case 'Transaction':
      return [
        { id: 'tx-1', type: 'receita', amount: 24500, description: 'Monthly Executive Salary', category: 'outras_receitas', date: d01, payment_status: 'pago', created_date: d01 },
        { id: 'tx-2', type: 'despesa', amount: 920, description: 'Spinneys Grocery Run', category: 'alimentacao', date: d03, payment_status: 'pago', created_date: d03 },
        { id: 'tx-3', type: 'despesa', amount: 680, description: 'DEWA Utilities (Electricity & Water)', category: 'contas', date: d06, due_date: d10, payment_status: 'pendente', created_date: d06 },
        { id: 'tx-4', type: 'despesa', amount: 389, description: 'du Home Fibre Broadband', category: 'contas', date: d06, due_date: d20, payment_status: 'pago', created_date: d06 },
        { id: 'tx-5', type: 'despesa', amount: 240, description: 'Family Dinner at Arabian Tea House', category: 'lazer', date: d03, payment_status: 'pago', created_date: d03 },
        { id: 'tx-6', type: 'despesa', amount: 180, description: 'ENOC Fuel & Salik Recharge', category: 'transporte', date: d01, payment_status: 'pago', created_date: d01 },
      ];
    case 'Budget':
      return [
        { id: 'bg-1', category: 'alimentacao', amount: 3500, period: 'mensal', created_date: d01 },
        { id: 'bg-2', category: 'contas', amount: 2200, period: 'mensal', created_date: d01 },
        { id: 'bg-3', category: 'transporte', amount: 1500, period: 'mensal', created_date: d01 },
        { id: 'bg-4', category: 'lazer', amount: 1800, period: 'mensal', created_date: d01 },
      ];
    case 'Goal':
      return [
        { id: 'gl-1', title: 'Family Summer Vacation', target_amount: 15000, current_amount: 8500, target_date: `${yyyy}-07-15`, created_date: d01 },
        { id: 'gl-2', title: 'Emergency Reserve Fund', target_amount: 50000, current_amount: 32000, target_date: `${yyyy}-12-31`, created_date: d01 },
      ];
    case 'FamilyMember':
      return [
        { id: 'fm-1', name: 'Primary Member', role: 'Head of Household', share: 60, created_date: d01 },
        { id: 'fm-2', name: 'Partner', role: 'Co-Manager', share: 40, created_date: d01 },
      ];
    case 'NotificationSettings':
      return [
        {
          id: 'ns-1',
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
          weekly_summary_day: "sunday",
          monthly_summary_enabled: true,
          monthly_summary_day: 1,
          created_date: d01,
        },
      ];
    case 'Conversation':
      return [];
    case 'AdminNotification':
      return [];
    default:
      return [];
  }
}

function readLocal(kind) {
  try {
    const raw = localStorage.getItem(DEV_STORAGE_PREFIX + kind);
    if (!raw) {
      const initial = getInitialData(kind);
      localStorage.setItem(DEV_STORAGE_PREFIX + kind, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return getInitialData(kind);
  }
}

function writeLocal(kind, data) {
  try {
    localStorage.setItem(DEV_STORAGE_PREFIX + kind, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to write local ledger data', err);
  }
}

const authListeners = new Set();

function createLocalMockSupabase() {
  return {
    auth: {
      async getSession() {
        try {
          const raw = localStorage.getItem(DEV_STORAGE_PREFIX + 'session');
          const session = raw ? JSON.parse(raw) : {
            access_token: 'local-token-live',
            refresh_token: 'local-refresh-live',
            user: {
              id: 'local-user-fuloozi',
              email: 'owner@fuloozi.local',
              user_metadata: { full_name: 'Household Owner', username: 'owner' },
            },
          };
          return { data: { session }, error: null };
        } catch {
          return { data: { session: null }, error: null };
        }
      },
      async getUser() {
        const { data } = await this.getSession();
        return { data: { user: data.session?.user || null }, error: null };
      },
      async setSession(session) {
        const normalized = {
          access_token: session.access_token || 'local-token',
          refresh_token: session.refresh_token || 'local-refresh',
          user: session.user || {
            id: 'local-user-fuloozi',
            email: `${session.username || 'user'}@fuloozi.local`,
            user_metadata: { full_name: session.username || 'Fuloozi User', username: session.username || 'user' },
          },
        };
        try {
          localStorage.setItem(DEV_STORAGE_PREFIX + 'session', JSON.stringify(normalized));
        } catch {}
        authListeners.forEach(listener => listener('SIGNED_IN', normalized));
        return { data: { session: normalized }, error: null };
      },
      async signOut() {
        try {
          localStorage.removeItem(DEV_STORAGE_PREFIX + 'session');
        } catch {}
        authListeners.forEach(listener => listener('SIGNED_OUT', null));
        return { error: null };
      },
      onAuthStateChange(callback) {
        authListeners.add(callback);
        return {
          data: {
            subscription: {
              unsubscribe: () => authListeners.delete(callback),
            },
          },
        };
      },
    },
    async rpc(funcName) {
      if (funcName === 'opus_open_whatsapp') {
        return { data: '7829104921', error: null };
      }
      return { data: { status: 'ok' }, error: null };
    },
  };
}

/* -------------------------------------------------------------
 * Live Supabase Client vs Local Dev Mock
 * ------------------------------------------------------------- */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : createLocalMockSupabase();

const flatten = (row) => ({ ...row.data, id: row.id, created_date: row.created_at });
const unwrap = ({ data, error }) => {
  if (error) throw error;
  return data;
};

function liveEntity(kind) {
  const rows = () => supabase.from('opus_records');
  return {
    async list(order = '-created_date') {
      const field = order.replace(/^-/, '');
      return unwrap(await rows().select('*').eq('kind', kind).order(
        field === 'created_date' ? 'created_at' : `data->>${field}`,
        { ascending: !order.startsWith('-'), nullsFirst: false }
      )).map(flatten);
    },
    async create({ id, created_date, ...data }) {
      return flatten(unwrap(await rows().insert({ kind, data }).select().single()));
    },
    async update(id, patch) {
      const row = unwrap(await rows().select('data').eq('kind', kind).eq('id', id).single());
      const { id: ignored, created_date, ...data } = { ...row.data, ...patch };
      return flatten(unwrap(await rows().update({ data }).eq('kind', kind).eq('id', id).select().single()));
    },
    async delete(id) {
      unwrap(await rows().delete().eq('kind', kind).eq('id', id));
    },
  };
}

function localEntity(kind) {
  return {
    async list(order = '-created_date') {
      const items = readLocal(kind);
      const isDesc = order.startsWith('-');
      const field = order.replace(/^-/, '');
      return [...items].sort((a, b) => {
        const valA = a[field] ?? '';
        const valB = b[field] ?? '';
        if (valA < valB) return isDesc ? 1 : -1;
        if (valA > valB) return isDesc ? -1 : 1;
        return 0;
      });
    },
    async create({ id, created_date, ...data }) {
      const items = readLocal(kind);
      const newItem = {
        ...data,
        id: id || `loc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        created_date: created_date || new Date().toISOString(),
      };
      items.unshift(newItem);
      writeLocal(kind, items);
      return newItem;
    },
    async update(id, patch) {
      const items = readLocal(kind);
      const index = items.findIndex(item => item.id === id);
      if (index === -1) throw new Error('Item not found');
      const updated = { ...items[index], ...patch, id };
      items[index] = updated;
      writeLocal(kind, items);
      return updated;
    },
    async delete(id) {
      const items = readLocal(kind);
      const filtered = items.filter(item => item.id !== id);
      writeLocal(kind, filtered);
    },
  };
}

export const db = {
  auth: {
    async me() { return unwrap(await supabase.auth.getUser()).user; },
    logout: () => supabase.auth.signOut(),
  },
  entities: Object.fromEntries(
    ['Transaction', 'Budget', 'Goal', 'FamilyMember', 'NotificationSettings', 'Conversation', 'AdminNotification'].map(name => [
      name,
      isSupabaseConfigured ? liveEntity(name) : localEntity(name),
    ])
  ),
};

export async function askAssistant(messages) {
  const { session } = unwrap(await supabase.auth.getSession());
  if (!session) throw new Error('Sign in to use the assistant');
  const response = await fetch('/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ messages }),
  });
  if (!response.ok) throw new Error('The assistant could not respond. Try again.');
  return (await response.json()).reply;
}

export async function openWhatsAppChat(windowHandle) {
  try {
    const chatId = unwrap(await supabase.rpc('opus_open_whatsapp'));
    const url = `${whatsappURL}?text=${encodeURIComponent(`Hi Octapus ${chatId}`)}`;
    if (windowHandle) {
      windowHandle.opener = null;
      windowHandle.location.replace(url);
    } else {
      window.location.assign(url);
    }
  } catch (error) {
    windowHandle?.close();
    throw error;
  }
}
