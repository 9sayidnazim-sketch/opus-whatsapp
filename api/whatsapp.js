import { createHmac, timingSafeEqual } from 'node:crypto';
import { handleWhatsAppInbound, getKapsoStatus } from '../server/kapsoAgent.js';

/*
 * Kapso WhatsApp webhook (Vercel Function, Web Request handlers).
 *
 * Kapso signs every delivery, Kapso and Meta webhook kinds alike, with
 * `X-Webhook-Signature`: the hex HMAC-SHA256 of the raw request body, keyed
 * with the webhook's secret_key, no "sha256=" prefix.
 * https://docs.kapso.ai/docs/platform/webhooks/overview
 *
 * These are Web Request handlers on purpose. With the classic (req, res)
 * signature Vercel hands over `req.body` already parsed from JSON, and a
 * re-serialised object never matches the bytes Kapso signed.
 */

const SIGNATURE_PATTERN = /^[a-f0-9]{64}$/i;

export function isValidKapsoSignature(rawBody, signature, secret) {
  if (!secret || typeof signature !== 'string' || !SIGNATURE_PATTERN.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest();
  const received = Buffer.from(signature, 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const challenge = params.get('hub.challenge');

  // Meta-style verification handshake. The challenge is caller-supplied, so it
  // goes back as plain text and can never render as HTML on this origin.
  if (params.get('hub.mode') === 'subscribe' && challenge) {
    return new Response(challenge, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
      },
    });
  }

  // Health / status check
  return json(await getKapsoStatus());
}

export async function POST(request) {
  // 1. Signature verification, failing closed. Without the secret there is no
  //    way to tell Kapso apart from anyone else who finds this URL.
  const secret = process.env.KAPSO_WEBHOOK_SECRET;
  if (!secret) {
    console.error('KAPSO_WEBHOOK_SECRET is not set; rejecting WhatsApp webhook.');
    return json({ error: 'Webhook is not configured' }, 503);
  }

  const rawBody = Buffer.from(await request.arrayBuffer());
  if (!isValidKapsoSignature(rawBody, request.headers.get('x-webhook-signature'), secret)) {
    return json({ error: 'Invalid webhook signature' }, 401);
  }

  // 2. Parse the event only after the signature checks out
  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  if (!event || typeof event !== 'object') {
    return json({ error: 'Missing webhook payload' }, 400);
  }

  // 3. Extract message from Kapso format or Meta Graph API format
  let sender = null;
  let text = '';
  let contactName = '';

  // Format A: Kapso v2 webhook payload
  if (event.message && event.conversation) {
    // Ignore outbound echo events
    if (event.message.kapso?.direction === 'outbound') {
      return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
    }

    sender = event.conversation.phone_number?.replace(/^\+/, '');
    contactName = event.conversation.contact_name || '';
    text = event.message.text?.body || event.message.kapso?.content || '';
  }
  // Format B: Direct Meta Cloud API / Changes payload
  else if (Array.isArray(event.entry)) {
    const value = event.entry[0]?.changes?.[0]?.value;
    const msg = value?.messages?.[0];
    const contact = value?.contacts?.[0];

    if (msg) {
      sender = msg.from;
      contactName = contact?.profile?.name || '';
      text = msg.text?.body || '';
    }
  }
  // Format C: Direct test payload (still has to be signed)
  else if (event.text || event.prompt) {
    sender = event.sender || event.to || '15557969980';
    text = event.text || event.prompt || '';
    contactName = event.contactName || 'Test User';
  }

  if (!sender || !text) {
    return json({ received: true, note: 'No inbound user text to process' });
  }

  // 4. Process through Kapso Agent and reply through WhatsApp
  try {
    const result = await handleWhatsAppInbound({
      sender,
      text,
      contactName,
    });

    return json({
      status: 'success',
      sender,
      action: result.action,
      reply: result.reply,
      sentToWhatsApp: result.sent,
    });
  } catch (err) {
    console.error('WhatsApp inbound processing error:', err);
    return json({ error: 'Failed to process WhatsApp event', details: err.message }, 500);
  }
}
