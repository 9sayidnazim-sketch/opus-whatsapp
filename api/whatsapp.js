import { createClient } from '@supabase/supabase-js';
import {
  getEvolutionStatus,
  sendWhatsAppMessage,
  sendWhatsAppAudio,
  extractEvolutionMessage,
} from '../server/evolutionAgent.js';
import { createJenniferVoiceReply } from '../server/jenniferVoice.js';

const introduction = 'ഹായ്, ഞാൻ ജെനിഫറാണ്, ഫുലൂസിലെ ഫിനാൻസ് അസിസ്റ്റന്റ്. വാട്സാപ്പിൽ അയക്കുന്ന ചെലവുകൾ നിങ്ങളുടെ ഫുലൂസ് അക്കൗണ്ടിൽ ചേർക്കാൻ ഞാൻ സഹായിക്കും. ആദ്യം ഫുലൂസിൽ നിന്ന് WhatsApp ബന്ധിപ്പിക്കൂ. അതിനുശേഷം expense 25 groceries എന്ന രീതിയിൽ ചെലവ് അയച്ചാൽ മതി.';

const replies = {
  linked: 'ഞാൻ ജെനിഫറാണ്, ഫുലൂസിലെ ഫിനാൻസ് അസിസ്റ്റന്റ്. നിങ്ങളുടെ വാട്സാപ്പ് ഫുലൂസുമായി ബന്ധിപ്പിച്ചു. ഇനി expense 25 groceries എന്ന് അയച്ചാൽ, ആ ചെലവ് നിങ്ങളുടെ ഫുലൂസ് അക്കൗണ്ടിൽ ചേർക്കാം.',
  already_linked: 'This WhatsApp account is already linked. To switch accounts, disconnect it in Fuloozi first.',
  invalid_code: 'This link has expired or was already used. Select Chat on WhatsApp in Fuloozi and send the new prefilled message.',
  unlinked: 'Sign in to Fuloozi, then select Chat on WhatsApp to connect your account.',
  recorded: 'Recorded in your Fuloozi ledger.',
  invalid_transaction: 'Enter a positive amount and a short description. For example: expense 25 groceries.',
};

export default async function handler(req, res) {
  // GET: Health & Evolution API instance connection status
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    const status = await getEvolutionStatus();
    return res.status(200).json(status);
  }

  if (req.method !== 'POST') return res.status(405).end();

  // 1. Optional Webhook Authentication
  const configuredSecret = process.env.EVOLUTION_WEBHOOK_SECRET;
  if (configuredSecret) {
    const providedSecret =
      req.headers['x-webhook-secret'] ||
      req.headers['apikey'] ||
      req.headers['x-api-key'] ||
      req.query?.secret ||
      req.query?.token;

    if (!providedSecret || providedSecret !== configuredSecret) {
      return res.status(401).json({ error: 'Unauthorized webhook' });
    }
  }

  // 2. Parse payload buffer
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 65536) return res.status(413).end();
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks);
  let event = {};
  try {
    event = JSON.parse(raw.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  // 3. Extract message from Evolution API format
  const parsed = extractEvolutionMessage(event);
  if (!parsed || !parsed.body) {
    // Acknowledge non-message webhook events (e.g. connection.update, qrcode.updated)
    return res.status(200).json({ ok: true, ignored: true });
  }

  const { sender, body, messageId } = parsed;

  const voiceRequested = /^voice\s+/i.test(body);
  const command = voiceRequested ? body.replace(/^voice\s+/i, '') : body;
  const pairing = /^(?:hi octapus[\s,:—-]+)?([0-9]{10})$/i.exec(command);
  const expense = /^(?:opus|fuloozi\s+)?expense\s+(\d{1,9}(?:\.\d{1,2})?)\s+(.{1,120})$/i.exec(command);
  const greeting = /^(?:hi|hello|hey|ഹായ്|നമസ്കാരം)(?:[ ,]+(?:jennifer|ജെനിഫർ))?[.!?]*$/iu.test(command);

  if (!pairing && !expense && !greeting) {
    return res.status(200).json({ ok: true, ignored: true });
  }

  let reply = introduction;
  let status = 'intro';

  if (!greeting) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (supabaseUrl && supabaseKey) {
      const client = createClient(supabaseUrl, supabaseKey);
      const secret = process.env.EVOLUTION_WEBHOOK_SECRET || 'evolution_secret';
      const { data, error } = pairing
        ? await client.rpc('opus_account_chat', {
          secret,
          sender,
          event_id: messageId,
          chat_code: pairing[1],
          question: null,
          answer: null,
        })
        : await client.rpc('opus_whatsapp_event', {
          secret,
          sender,
          event_id: messageId,
          action: 'expense',
          details: { amount: expense[1], label: expense[2] },
        });

      if (!error && data?.status) {
        status = data.status;
        reply = replies[status] || replies.recorded;
      }
    } else {
      // Local development fallback
      if (expense) {
        status = 'recorded';
        reply = `✅ Recorded in Fuloozi: AED ${parseFloat(expense[1]).toFixed(2)} for "${expense[2]}".`;
      } else if (pairing) {
        status = 'linked';
        reply = replies.linked;
      }
    }
  }

  // 4. Send outbound reply via Evolution API
  if (voiceRequested) {
    const audioBase64 = await createJenniferVoiceReply(status).catch(() => null);
    if (audioBase64) {
      const audioResult = await sendWhatsAppAudio({ to: sender, audioBase64 });
      if (audioResult.ok) {
        return res.status(200).json({ ok: true, type: 'audio', status });
      }
    }
  }

  // Text message reply via Evolution API
  const sendResult = await sendWhatsAppMessage({ to: sender, text: reply });
  return res.status(200).json({ ok: true, type: 'text', status, sent: sendResult.ok });
}
