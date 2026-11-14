import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { askClaude } from './assistant.js';

const replies = {
  linked: 'Your OPUS account is linked. Send OPUS expense 25 groceries, OPUS income 100 refund, or OPUS followed by a question.',
  already_linked: 'This WhatsApp account is already linked. To switch accounts, disconnect it in OPUS first.',
  invalid_code: 'This link has expired or was already used. Generate a new link in OPUS Settings.',
  unlinked: 'Sign in to OPUS, then use Link WhatsApp in Settings to connect your account.',
  recorded: 'Recorded in your OPUS ledger.',
  invalid_transaction: 'Enter a positive amount and a short description. For example: OPUS expense 25 groceries.',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const signature = req.headers['x-webhook-signature'];
  const secret = process.env.KAPSO_WEBHOOK_SECRET;
  if (!secret || typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return res.status(401).end();
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 65536) return res.status(413).end();
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks);
  const digest = createHmac('sha256', secret).update(raw).digest();
  if (!timingSafeEqual(digest, Buffer.from(signature, 'hex'))) return res.status(401).end();
  let event;
  try { event = JSON.parse(raw.toString('utf8')); } catch { return res.status(400).end(); }
  const { message, conversation, phone_number_id: numberId } = event;
  const body = message?.text?.body?.trim();
  const sender = conversation?.phone_number?.replace(/^\+/, '');
  const allowedNumber = process.env.KAPSO_PHONE_NUMBER_ID;
  if (!allowedNumber || String(numberId) !== allowedNumber || message?.kapso?.direction !== 'inbound' ||
      !body || !/^opus(?:\s|$)/i.test(body) || !/^[0-9]{8,15}$/.test(sender || '') ||
      typeof message.id !== 'string') return res.status(204).end();

  const command = body.replace(/^opus\s*/i, '');
  const link = /^link ([0-9a-f-]{36})$/i.exec(command);
  const entry = /^(expense|income) (\d{1,9}(?:\.\d{1,2})?) (.{1,120})$/i.exec(command);
  const action = link ? 'link' : entry ? entry[1].toLowerCase() : 'chat';
  const details = link ? { code: link[1].toLowerCase() } : entry ? { amount: entry[2], label: entry[3] } : {};
  const client = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  const { data, error } = await client.rpc('opus_whatsapp_event', {
    secret, event_id: message.id, sender, action, details,
  });
  if (error) return res.status(500).end();
  if (data?.status === 'duplicate') return res.status(204).end();

  let reply = replies[data?.status];
  if (!reply && command) {
    try { reply = await askClaude([{ role: 'user', content: command.slice(0, 2000) }]); }
    catch { reply = 'The assistant is unavailable. Try again in a moment.'; }
  }
  reply ||= 'Send OPUS followed by a question, or use OPUS expense 25 groceries to record spending.';
  const sent = await fetch(`https://api.kapso.ai/meta/whatsapp/v24.0/${allowedNumber}/messages`, {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
    headers: { 'X-API-Key': process.env.KAPSO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: sender, type: 'text', text: { body: reply.slice(0, 4000) } }),
  }).catch(() => null);
  if (!sent?.ok) return res.status(502).end();
  return res.status(204).end();
}
