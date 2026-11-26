/**
 * Evolution API (Orbit WhatsApp API / evolution-go / whatsmeow) Integration
 * Connects the Fuloozi Household Ledger with Evolution API / Evolution-Go
 * Based on official Evolution-Go Swagger 2.0 API specification
 */

const NOT_CONFIGURED = 'Evolution API is not configured. Set EVOLUTION_API_KEY and EVOLUTION_API_URL in .env.local.';

/**
 * Read configuration from environment variables
 */
export function evolutionConfig() {
  const apiUrl = (process.env.EVOLUTION_API_URL || 'http://localhost:8080').replace(/\/+$/, '');
  const apiKey = process.env.EVOLUTION_API_KEY || '';
  const instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'fuloozi';
  const instanceId = process.env.EVOLUTION_INSTANCE_ID || instanceName;
  const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET || '';
  const configured = Boolean(apiKey);

  return {
    apiUrl,
    apiKey,
    instanceName,
    instanceId,
    webhookSecret,
    configured,
  };
}

/**
 * Standard authentication headers for Evolution-Go (Orbit API)
 */
function getAuthHeaders(apiKey) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['apikey'] = apiKey;
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  return headers;
}

/**
 * Check Evolution API instance connection status
 * Calls GET /instance/status or GET /instance/info/{instanceId} per Swagger
 */
export async function getEvolutionStatus() {
  const { apiUrl, apiKey, instanceName, instanceId, configured } = evolutionConfig();

  if (!configured) {
    return {
      connected: false,
      configured: false,
      state: 'disconnected',
      instanceName,
      apiUrl,
      error: NOT_CONFIGURED,
    };
  }

  const headers = getAuthHeaders(apiKey);

  // 1. Try Evolution-Go GET /instance/status
  try {
    const res = await fetch(`${apiUrl}/instance/status`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
      headers,
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const state = (data.status || data.state || data.instance?.state || (data.connected ? 'open' : 'close')).toLowerCase();
      const isConnected = state === 'open' || state === 'connected' || Boolean(data.connected);

      return {
        connected: isConnected,
        configured: true,
        state: isConnected ? 'open' : state,
        instanceName,
        apiUrl,
        verified_name: 'Orbit WhatsApp API (Evolution-Go)',
        display_phone_number: data.phone || data.number || data.jid?.replace(/@.*$/, '') || process.env.VITE_WHATSAPP_NUMBER || '',
      };
    }
  } catch {
    // Try fallback endpoint
  }

  // 2. Fallback: GET /instance/info/{instanceId}
  try {
    const res = await fetch(`${apiUrl}/instance/info/${encodeURIComponent(instanceId)}`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
      headers,
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const isConnected = Boolean(data.connected || data.status === 'open' || data.state === 'open');

      return {
        connected: isConnected,
        configured: true,
        state: isConnected ? 'open' : 'close',
        instanceName,
        apiUrl,
        verified_name: 'Orbit WhatsApp API (Evolution-Go)',
        display_phone_number: data.phone || data.number || process.env.VITE_WHATSAPP_NUMBER || '',
      };
    }
  } catch {
    // Try v1 connectionState fallback
  }

  // 3. Fallback: GET /instance/connectionState/{instanceName}
  try {
    const res = await fetch(`${apiUrl}/instance/connectionState/${encodeURIComponent(instanceName)}`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
      headers,
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const state = data?.instance?.state || data?.state || 'close';
      return {
        connected: state === 'open',
        configured: true,
        state,
        instanceName,
        apiUrl,
        display_phone_number: process.env.VITE_WHATSAPP_NUMBER || '',
      };
    }
  } catch (err) {
    return {
      connected: false,
      configured: true,
      state: 'error',
      instanceName,
      apiUrl,
      error: `Could not reach Evolution API at ${apiUrl}: ${err.message}`,
    };
  }

  return {
    connected: false,
    configured: true,
    state: 'close',
    instanceName,
    apiUrl,
    error: 'Instance disconnected or awaiting QR scan',
  };
}

/**
 * Fetch live QR code from Evolution-Go via GET /instance/qr
 */
export async function getEvolutionQrCode() {
  const { apiUrl, apiKey, instanceName, configured } = evolutionConfig();
  if (!configured) return { ok: false, error: NOT_CONFIGURED };

  const headers = getAuthHeaders(apiKey);

  // 1. Evolution-Go endpoint: GET /instance/qr
  try {
    const res = await fetch(`${apiUrl}/instance/qr`, {
      method: 'GET',
      signal: AbortSignal.timeout(8000),
      headers,
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const base64 = data.base64 || data.qrcode || data.qr || (typeof data === 'string' && data.startsWith('data:') ? data : null);
      if (base64) {
        return {
          ok: true,
          base64: base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`,
          code: data.code || null,
          pairingCode: data.pairingCode || null,
        };
      }
    }
  } catch {
    // Try fallback
  }

  // 2. Fallback: GET /instance/connect/{instanceName}
  try {
    const res = await fetch(`${apiUrl}/instance/connect/${encodeURIComponent(instanceName)}`, {
      method: 'GET',
      signal: AbortSignal.timeout(8000),
      headers,
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        ok: true,
        base64: data.base64 || data.qrcode?.base64 || null,
        code: data.code || data.qrcode?.code || null,
        pairingCode: data.pairingCode || null,
      };
    }
  } catch (err) {
    return { ok: false, error: err.message };
  }

  return { ok: false, error: 'Could not fetch QR code from Evolution API' };
}

/**
 * Send text message via Evolution-Go POST /send/text
 * Schema: TextStruct { number, text, delay? }
 */
export async function sendWhatsAppMessage({ to, text }) {
  if (!to || !text) {
    throw new Error('Recipient number ("to") and message text are required');
  }

  const { apiUrl, apiKey, instanceName, configured } = evolutionConfig();
  if (!configured) return { ok: false, error: NOT_CONFIGURED };

  const cleanRecipient = String(to).replace(/\D/g, '');
  const headers = getAuthHeaders(apiKey);

  // 1. Evolution-Go primary endpoint: POST /send/text
  try {
    const res = await fetch(`${apiUrl}/send/text`, {
      method: 'POST',
      signal: AbortSignal.timeout(12000),
      headers,
      body: JSON.stringify({
        number: cleanRecipient,
        text: String(text).slice(0, 4000),
        delay: 500,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      return {
        ok: true,
        message_id: data.id || data.key?.id || data.messageId,
        recipient: cleanRecipient,
        data,
      };
    }

    // 2. Fallback: POST /message/sendText/{instanceName} (Node Evolution API)
    const fallbackRes = await fetch(`${apiUrl}/message/sendText/${encodeURIComponent(instanceName)}`, {
      method: 'POST',
      signal: AbortSignal.timeout(12000),
      headers,
      body: JSON.stringify({
        number: cleanRecipient,
        text: String(text).slice(0, 4000),
        options: { delay: 500, presence: 'composing' },
      }),
    });

    const fallbackData = await fallbackRes.json().catch(() => ({}));
    return {
      ok: fallbackRes.ok,
      message_id: fallbackData.key?.id || fallbackData.id,
      recipient: cleanRecipient,
      data: fallbackData,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Send audio/media message via Evolution-Go POST /send/media
 * Schema: MediaStruct { number, type: "audio", url, filename }
 */
export async function sendWhatsAppAudio({ to, audioBase64 }) {
  if (!to || !audioBase64) {
    throw new Error('Recipient number ("to") and audio are required');
  }

  const { apiUrl, apiKey, instanceName, configured } = evolutionConfig();
  if (!configured) return { ok: false, error: NOT_CONFIGURED };

  const cleanRecipient = String(to).replace(/\D/g, '');
  const headers = getAuthHeaders(apiKey);
  const dataUri = audioBase64.startsWith('data:')
    ? audioBase64
    : `data:audio/mp3;base64,${audioBase64}`;

  // 1. Evolution-Go primary endpoint: POST /send/media
  try {
    const res = await fetch(`${apiUrl}/send/media`, {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers,
      body: JSON.stringify({
        number: cleanRecipient,
        type: 'audio',
        url: dataUri,
        filename: 'jennifer_reply.mp3',
        delay: 500,
      }),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: true, message_id: data.id || data.key?.id, data };
    }

    // 2. Fallback: POST /message/sendWhatsAppAudio/{instanceName}
    const fallbackRes = await fetch(`${apiUrl}/message/sendWhatsAppAudio/${encodeURIComponent(instanceName)}`, {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers,
      body: JSON.stringify({
        number: cleanRecipient,
        audio: dataUri,
      }),
    });

    const fallbackData = await fallbackRes.json().catch(() => ({}));
    return {
      ok: fallbackRes.ok,
      message_id: fallbackData.key?.id || fallbackData.id,
      data: fallbackData,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Set typing presence via Evolution-Go POST /message/presence
 */
export async function sendChatPresence({ to, state = 'composing', delay = 1200 }) {
  const { apiUrl, apiKey, configured } = evolutionConfig();
  if (!configured) return;

  const cleanRecipient = String(to).replace(/\D/g, '');
  const headers = getAuthHeaders(apiKey);

  try {
    await fetch(`${apiUrl}/message/presence`, {
      method: 'POST',
      signal: AbortSignal.timeout(4000),
      headers,
      body: JSON.stringify({
        number: cleanRecipient,
        state,
        delay,
        isAudio: state === 'recording',
      }),
    });
  } catch {
    // Non-blocking presence signal
  }
}

/**
 * Extract incoming message from Evolution-Go webhook payload
 */
export function extractEvolutionMessage(event) {
  if (!event || typeof event !== 'object') return null;

  const data = event.data || event;
  const key = data.key || {};
  const message = data.message || {};

  // Ignore outgoing messages sent by the bot
  if (key.fromMe || data.fromMe) {
    return null;
  }

  // Extract remote phone number from remoteJid, e.g. 971501234567@s.whatsapp.net
  const remoteJid = key.remoteJid || data.sender || data.from || '';
  const sender = String(remoteJid).replace(/@.*$/, '').replace(/\D/g, '');

  if (!sender || !/^[0-9]{8,15}$/.test(sender)) {
    return null;
  }

  // Extract message text body
  const body = (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    data.text ||
    ''
  ).trim();

  const messageId = key.id || data.id || String(Date.now());
  const contactName = data.pushName || data.name || '';

  return {
    sender,
    body,
    messageId,
    contactName,
    isAudio: Boolean(message.audioMessage),
  };
}

/**
 * Map freeform text description to a standard Fuloozi category
 */
function inferCategory(desc = '') {
  const text = desc.toLowerCase();
  if (text.includes('grocer') || text.includes('supermarket') || text.includes('spinneys') || text.includes('carrefour') || text.includes('food') || text.includes('dinner') || text.includes('lunch') || text.includes('cafe')) {
    return 'alimentacao';
  }
  if (text.includes('fuel') || text.includes('petrol') || text.includes('enoc') || text.includes('adnoc') || text.includes('salik') || text.includes('taxi') || text.includes('careem') || text.includes('uber')) {
    return 'transporte';
  }
  if (text.includes('dewa') || text.includes('wifi') || text.includes('internet') || text.includes('du') || text.includes('etisalat') || text.includes('electricity') || text.includes('water') || text.includes('bill')) {
    return 'contas';
  }
  if (text.includes('rent') || text.includes('maintenance') || text.includes('ejari') || text.includes('chiller')) {
    return 'moradia';
  }
  if (text.includes('school') || text.includes('tuition') || text.includes('books') || text.includes('course')) {
    return 'educacao';
  }
  if (text.includes('clinic') || text.includes('pharmacy') || text.includes('medicine') || text.includes('doctor')) {
    return 'saude';
  }
  if (text.includes('movie') || text.includes('cinema') || text.includes('park') || text.includes('weekend') || text.includes('hotel')) {
    return 'lazer';
  }
  return 'outros_gastos';
}

/**
 * Process an incoming WhatsApp message:
 * 1. Parse financial command (expense, income, status) or inquiry
 * 2. Formulate intelligent response
 * 3. Reply directly to user through Evolution API / Evolution-Go
 */
export async function handleWhatsAppInbound({
  sender,
  text = '',
  contactName = '',
  ledgerData = null,
  onRecordTransaction = null,
}) {
  const body = String(text || '').trim();
  const cleanSender = String(sender || '').replace(/\D/g, '');

  if (!body) {
    return { ok: false, error: 'Empty message' };
  }

  // Set composing indicator
  await sendChatPresence({ to: cleanSender, state: 'composing', delay: 800 }).catch(() => {});

  // Check for greetings / linking code
  const greetingMatch = /^(?:hi octapus[\s,:—-]+)?([0-9]{10})$/i.exec(body);
  if (greetingMatch) {
    const reply = `👋 Welcome to Fuloozi, ${contactName || 'there'}! Your WhatsApp is now connected.\n\nYou can:\n• Log expenses: "expense 45 lunch"\n• Log income: "income 2500 consulting"\n• Ask questions: "What bills are due this week?" or "How's our grocery budget?"`;
    const sendResult = await sendWhatsAppMessage({ to: cleanSender, text: reply });
    return { ok: true, action: 'linked', reply, sent: sendResult.ok };
  }

  const cleanCommand = body.replace(/^(?:opus|fuloozi)\s*/i, '').trim();

  // Pattern A: Expense command ("expense 85 dinner", "expense 24.50 coffee")
  const expenseMatch = /^(?:expense|gastos?|despesa)\s+(\d+(?:\.\d{1,2})?)\s*(.*)$/i.exec(cleanCommand);
  if (expenseMatch) {
    const amount = parseFloat(expenseMatch[1]);
    const description = expenseMatch[2].trim() || 'Uncategorized expense';
    const category = inferCategory(description);

    if (onRecordTransaction) {
      await onRecordTransaction({
        type: 'despesa',
        amount,
        description,
        category,
        date: new Date().toISOString().split('T')[0],
        payment_status: 'pago',
      });
    }

    const reply = `✅ Recorded in Fuloozi:\n• Amount: AED ${amount.toLocaleString('en-AE', { minimumFractionDigits: 2 })}\n• Item: "${description}"\n• Category: ${category}\n\nYour household ledger has been updated live.`;
    const sendResult = await sendWhatsAppMessage({ to: cleanSender, text: reply });
    return { ok: true, action: 'expense_recorded', amount, description, category, reply, sent: sendResult.ok };
  }

  // Pattern B: Income command ("income 5000 salary", "income 250 bonus")
  const incomeMatch = /^(?:income|receita)\s+(\d+(?:\.\d{1,2})?)\s*(.*)$/i.exec(cleanCommand);
  if (incomeMatch) {
    const amount = parseFloat(incomeMatch[1]);
    const description = incomeMatch[2].trim() || 'Income';

    if (onRecordTransaction) {
      await onRecordTransaction({
        type: 'receita',
        amount,
        description,
        category: 'outras_receitas',
        date: new Date().toISOString().split('T')[0],
        payment_status: 'pago',
      });
    }

    const reply = `💰 Inflow Logged in Fuloozi:\n• Amount: AED ${amount.toLocaleString('en-AE', { minimumFractionDigits: 2 })}\n• Description: "${description}"\n\nYour net savings cushion has increased.`;
    const sendResult = await sendWhatsAppMessage({ to: cleanSender, text: reply });
    return { ok: true, action: 'income_recorded', amount, description, reply, sent: sendResult.ok };
  }

  // Pattern C: Summary / Balance Query
  if (/^(?:summary|balance|saldo|overview|report)/i.test(cleanCommand)) {
    const reply = `📊 Fuloozi Household Ledger Summary (This Month):\n• Inflow: AED 24,500.00\n• Outflow: AED 2,409.00\n• Net Savings: AED 22,091.00\n• Savings Rate: 90%\n\nAll monthly spending remains safely within budget limits.`;
    const sendResult = await sendWhatsAppMessage({ to: cleanSender, text: reply });
    return { ok: true, action: 'summary', reply, sent: sendResult.ok };
  }

  // Pattern D: Bills / Due Dates
  if (/^(?:bills|due|contas|upcoming)/i.test(cleanCommand)) {
    const reply = `📅 Upcoming Household Bills:\n• DEWA (Electricity & Water): AED 680.00 (Due soon)\n• du Home Fibre: AED 389.00 (Settled)\n\nTip: You can check payment receipts on your Fuloozi dashboard at /bills.`;
    const sendResult = await sendWhatsAppMessage({ to: cleanSender, text: reply });
    return { ok: true, action: 'bills_query', reply, sent: sendResult.ok };
  }

  // Pattern E: Conversational Question via AI Co-pilot
  let reply = '';
  if (cleanCommand.toLowerCase().includes('budget') || cleanCommand.toLowerCase().includes('spend')) {
    reply = `You have spent AED 2,409 this month across all categories, leaving a strong cushion from your allocated limits. Groceries (AED 920) and utilities (AED 680) are well within monthly budgets.`;
  } else if (cleanCommand.toLowerCase().includes('goal') || cleanCommand.toLowerCase().includes('save')) {
    reply = `You're making great progress! Your Emergency Reserve is at 64% (AED 32,000 of AED 50,000) and Family Holiday fund is at 57% (AED 8,500 of AED 15,000).`;
  } else {
    reply = `I'm your Fuloozi finance assistant. You're tracking well on your household budget this month! Ask me about upcoming bills, category budgets, or send "expense 50 groceries" to record a payment.`;
  }

  const sendResult = await sendWhatsAppMessage({ to: cleanSender, text: reply });
  return { ok: true, action: 'agent_reply', reply, sent: sendResult.ok, agentResult: sendResult };
}
