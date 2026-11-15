import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { askClaude, buildContext } from './assistant.js';

const replies = {
  linked: 'Your OPUS account is linked. Ask me a finance question, or send OPUS expense 25 groceries or OPUS income 100 refund.',
  already_linked: 'This WhatsApp account is already linked. To switch accounts, disconnect it in OPUS first.',
  invalid_code: 'This link has expired or was already used. Select Chat on WhatsApp in OPUS and send the new prefilled message.',
  unlinked: 'Sign in to OPUS, then select Chat on WhatsApp to connect your account.',
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
      !body || !/^[0-9]{8,15}$/.test(sender || '') ||
      typeof message.id !== 'string') return res.status(204).end();

  const greeting = /^hi octapus[\s,:—-]+([0-9]{10})$/i.exec(body);
  const prefixed = /^opus(?:\s|$)/i.test(body);
  const command = body.replace(/^opus\s*/i, '').slice(0, 2000);
  const entry = prefixed ? /^(expense|income) (\d{1,9}(?:\.\d{1,2})?) (.{1,120})$/i.exec(command) : null;
  const client = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  const context = await client.rpc('opus_account_chat', {
    secret, sender, event_id: message.id, chat_code: greeting?.[1] ?? null, question: null, answer: null,
  });
  if (context.error) return res.status(500).end();
  if (context.data.status === 'duplicate') return res.status(204).end();
  if (context.data.status === 'unlinked' && !prefixed) return res.status(204).end();

  let reply = replies[context.data.status];
  if (!greeting && context.data.status === 'ready') {
    const { data, error } = await client.rpc('opus_whatsapp_event', {
      secret, event_id: message.id, sender, action: entry ? entry[1].toLowerCase() : 'chat',
      details: entry ? { amount: entry[2], label: entry[3] } : {},
    });
    if (error) return res.status(500).end();
    if (data.status === 'duplicate') return res.status(204).end();
    reply = replies[data.status];
    if (!reply && command) {
      try {
        reply = (await askClaude(buildContext(context.data.memory, command, context.data.name))).slice(0,2000);
        const saved = await client.rpc('opus_account_chat', {
          secret, sender, event_id: message.id, chat_code:null, question:command, answer:reply, expected_owner:context.data.owner,
        });
        if (saved.error) return res.status(500).end();
        if (saved.data.status !== 'saved') return res.status(204).end();
      } catch { reply = 'The assistant is unavailable. Try again in a moment.'; }
    }
  }
  reply ||= 'Ask a finance question or send OPUS expense 25 groceries.';
  const sent = await fetch(`https://api.kapso.ai/meta/whatsapp/v24.0/${allowedNumber}/messages`, {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
    headers: { 'X-API-Key': process.env.KAPSO_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: sender, type: 'text', text: { body: reply.slice(0, 4000) } }),
  }).catch(() => null);
  if (!sent?.ok) return res.status(502).end();
  return res.status(204).end();
}
