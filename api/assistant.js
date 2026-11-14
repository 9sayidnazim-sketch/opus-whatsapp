import { createClient } from '@supabase/supabase-js';

export async function askClaude(messages) {
  const key = process.env.SUB2API_API_KEY;
  if (!key) throw new Error('Missing assistant credential');
  const response = await fetch('https://api.mwapi.dev/v1/responses', {
    method: 'POST',
    signal: AbortSignal.timeout(20000),
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6', store: false, max_output_tokens: 400,
      instructions: 'You are the OPUS household ledger assistant. Help organize spending, bills and savings. Never claim to see or change account records. Do not ask for bank credentials or card numbers.',
      input: messages,
    }),
  });
  if (!response.ok) throw new Error('Assistant provider failed');
  const payload = await response.json();
  const reply = payload.output?.flatMap(item => item.content ?? []).map(item => item.text ?? '').join('').trim();
  if (!reply) throw new Error('Assistant returned no text');
  return reply;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).end();
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).end();
  const client = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  const { data, error } = await client.auth.getUser(auth.slice(7));
  if (error || !data.user) return res.status(401).end();
  const messages = req.body?.messages;
  if (!Array.isArray(messages) || !messages.length || messages.length > 12 ||
      messages.some(item => !['user', 'assistant'].includes(item?.role) ||
        typeof item.content !== 'string' || item.content.length > 2000)) {
    return res.status(400).json({ error: 'Invalid message history' });
  }
  try {
    return res.json({ reply: await askClaude(messages.map(({ role, content }) => ({ role, content }))) });
  } catch {
    return res.status(502).json({ error: 'Assistant unavailable' });
  }
}
