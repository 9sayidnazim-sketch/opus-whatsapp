import { createHmac, timingSafeEqual } from 'node:crypto';
import { handleWhatsAppInbound, getKapsoStatus, sendWhatsAppMessage } from '../server/kapsoAgent.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  // Handle Meta / Kapso Webhook verification (GET challenge)
  if (req.method === 'GET') {
    const mode = req.query?.['hub.mode'];
    const token = req.query?.['hub.verify_token'];
    const challenge = req.query?.['hub.challenge'];

    if (mode === 'subscribe' && challenge) {
      return res.status(200).send(challenge);
    }

    // Health / Status check
    const status = await getKapsoStatus();
    return res.status(200).json(status);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Signature Verification (if secret configured & header provided)
  const secret = process.env.KAPSO_WEBHOOK_SECRET;
  const signature = req.headers['x-webhook-signature'];

  let rawBuffer = null;
  if (Buffer.isBuffer(req.body)) {
    rawBuffer = req.body;
  } else if (typeof req.body === 'string') {
    rawBuffer = Buffer.from(req.body, 'utf8');
  }

  if (secret && signature && typeof signature === 'string') {
    if (rawBuffer && /^[a-f0-9]{64}$/i.test(signature)) {
      const digest = createHmac('sha256', secret).update(rawBuffer).digest();
      if (!timingSafeEqual(digest, Buffer.from(signature, 'hex'))) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }
  }

  // 2. Parse event payload
  let event = req.body;
  if (typeof event === 'string') {
    try { event = JSON.parse(event); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  } else if (Buffer.isBuffer(event)) {
    try { event = JSON.parse(event.toString('utf8')); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }

  if (!event || typeof event !== 'object') {
    return res.status(400).json({ error: 'Missing webhook payload' });
  }

  // 3. Extract message from Kapso format or Meta Graph API format
  let sender = null;
  let text = '';
  let contactName = '';
  let messageId = null;

  // Format A: Kapso v2 webhook payload
  if (event.message && event.conversation) {
    sender = event.conversation.phone_number?.replace(/^\+/, '');
    contactName = event.conversation.contact_name || '';
    messageId = event.message.id;
    text = event.message.text?.body || event.message.kapso?.content || '';

    // Ignore outbound echo events
    if (event.message.kapso?.direction === 'outbound') {
      return res.status(204).end();
    }
  }
  // Format B: Direct Meta Cloud API / Changes payload
  else if (Array.isArray(event.entry)) {
    const value = event.entry[0]?.changes?.[0]?.value;
    const msg = value?.messages?.[0];
    const contact = value?.contacts?.[0];

    if (msg) {
      sender = msg.from;
      messageId = msg.id;
      contactName = contact?.profile?.name || '';
      text = msg.text?.body || '';
    }
  }
  // Format C: Direct test payload
  else if (event.text || event.prompt) {
    sender = event.sender || event.to || '15557969980';
    text = event.text || event.prompt || '';
    contactName = event.contactName || 'Test User';
  }

  if (!sender || !text) {
    return res.status(200).json({ received: true, note: 'No inbound user text to process' });
  }

  // 4. Process through Kapso Agent and reply through WhatsApp
  try {
    const result = await handleWhatsAppInbound({
      sender,
      text,
      contactName,
    });

    return res.status(200).json({
      status: 'success',
      sender,
      action: result.action,
      reply: result.reply,
      sentToWhatsApp: result.sent,
    });
  } catch (err) {
    console.error('WhatsApp inbound processing error:', err);
    return res.status(500).json({ error: 'Failed to process WhatsApp event', details: err.message });
  }
}
