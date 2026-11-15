import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
export const whatsappURL = /^\d{8,15}$/.test(import.meta.env.VITE_WHATSAPP_NUMBER || '')
  ? `https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER}`
  : '';

const flatten = (row) => ({ ...row.data, id: row.id, created_date: row.created_at });
const unwrap = ({ data, error }) => {
  if (error) throw error;
  return data;
};
function entity(kind) {
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

export const db = {
  auth: {
    async me() { return unwrap(await supabase.auth.getUser()).user; },
    logout: () => supabase.auth.signOut(),
  },
  entities: Object.fromEntries(
    ['Transaction', 'Budget', 'Goal', 'FamilyMember', 'NotificationSettings', 'Conversation'].map(name => [name, entity(name)])
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
