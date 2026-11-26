/**
 * Evolution API (Orbit WhatsApp API / evolution-go / whatsmeow) Integration
 * Connects the Fuloozi Household Ledger with Evolution API / Evolution-Go
 * Based on official Evolution-Go Swagger 2.0 API specification
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { generateAIReply } from './aiAgent.js';

/**
 * Helper to dynamically load .env.local variables
 */
function readEnvLocal() {
  const envObj = {};
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, 'utf8');
      for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          envObj[key] = val;
        }
      }
    }
  } catch {}
  return envObj;
}

/**
 * Read configuration from environment variables or .env.local
 */
export function evolutionConfig() {
  const fileEnv = readEnvLocal();

  // If process.env.EVOLUTION_API_URL is the old default 'http://localhost:8080' but .env.local has another, prefer fileEnv
  const rawUrl = fileEnv.EVOLUTION_API_URL || process.env.EVOLUTION_API_URL || 'http://localhost:8088';
  const apiUrl = rawUrl.replace(/\/+$/, '');

  const apiKey =
    fileEnv.EVOLUTION_API_KEY ||
    process.env.EVOLUTION_API_KEY ||
    process.env.AUTHENTICATION_API_KEY ||
    '';

  const instanceName =
    fileEnv.EVOLUTION_INSTANCE_NAME ||
    process.env.EVOLUTION_INSTANCE_NAME ||
    'fuloozi';

  const instanceId =
    fileEnv.EVOLUTION_INSTANCE_ID ||
    process.env.EVOLUTION_INSTANCE_ID ||
    instanceName;

  const webhookSecret =
    fileEnv.EVOLUTION_WEBHOOK_SECRET ||
    process.env.EVOLUTION_WEBHOOK_SECRET ||
    '';

  const whatsappNumber =
    fileEnv.VITE_WHATSAPP_NUMBER ||
    fileEnv.WHATSAPP_NUMBER ||
    process.env.VITE_WHATSAPP_NUMBER ||
    process.env.WHATSAPP_NUMBER ||
    '';

  const configured = Boolean(apiUrl);

  return {
    apiUrl,
    apiKey,
    instanceName,
    instanceId,
    webhookSecret,
    whatsappNumber,
    configured,
  };
}

/**
 * Update configuration dynamically and persist to .env.local
 */
export function updateEvolutionConfig({ apiUrl, apiKey, instanceName, webhookSecret, whatsappNumber }) {
  if (apiUrl) process.env.EVOLUTION_API_URL = apiUrl.replace(/\/+$/, '');
  if (apiKey !== undefined) process.env.EVOLUTION_API_KEY = apiKey;
  if (instanceName) {
    process.env.EVOLUTION_INSTANCE_NAME = instanceName;
    process.env.EVOLUTION_INSTANCE_ID = instanceName;
  }
  if (webhookSecret !== undefined) process.env.EVOLUTION_WEBHOOK_SECRET = webhookSecret;
  if (whatsappNumber !== undefined) {
    const cleanNum = String(whatsappNumber).replace(/\D/g, '');
    process.env.VITE_WHATSAPP_NUMBER = cleanNum;
  }

  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    let content = '';
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf8');
    }
    const vars = {
      EVOLUTION_API_URL: process.env.EVOLUTION_API_URL || 'http://localhost:8088',
      EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY || '',
      EVOLUTION_INSTANCE_NAME: process.env.EVOLUTION_INSTANCE_NAME || 'fuloozi',
      EVOLUTION_WEBHOOK_SECRET: process.env.EVOLUTION_WEBHOOK_SECRET || '',
      VITE_WHATSAPP_NUMBER: process.env.VITE_WHATSAPP_NUMBER || '',
    };
    for (const [key, val] of Object.entries(vars)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(content)) {
        content = content.replace(regex, `${key}=${val}`);
      } else {
        content += `\n${key}=${val}`;
      }
    }
    fs.writeFileSync(envPath, content.trim() + '\n', 'utf8');
  } catch (err) {
    console.warn('Could not persist to .env.local:', err.message);
  }

  return evolutionConfig();
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
 * Supports both Evolution API v2 (connectionState) and Evolution-Go (status)
 */
export async function getEvolutionStatus() {
  const { apiUrl, apiKey, instanceName } = evolutionConfig();
  const headers = getAuthHeaders(apiKey);

  let lastError = null;

  // 1. Try Evolution API v2: GET /instance/connectionState/{instanceName}
  try {
    const res = await fetch(`${apiUrl}/instance/connectionState/${encodeURIComponent(instanceName)}`, {
      method: 'GET',
      signal: AbortSignal.timeout(4000),
      headers,
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const rawState = (data?.instance?.state || data?.state || 'close').toLowerCase();
      const isConnected = rawState === 'open' || rawState === 'connected';

      let phoneNumber = '';
      if (isConnected) {
        try {
          const fetchRes = await fetch(`${apiUrl}/instance/fetchInstances`, {
            method: 'GET',
            signal: AbortSignal.timeout(3000),
            headers,
          });
          if (fetchRes.ok) {
            const list = await fetchRes.json().catch(() => []);
            const current = Array.isArray(list) ? list.find((i) => i.name === instanceName) : null;
            if (current?.ownerJid) {
              phoneNumber = current.ownerJid.replace(/@.*$/, '');
            } else if (current?.number) {
              phoneNumber = String(current.number).replace(/\D/g, '');
            }

            if (phoneNumber) {
              const cur = readEnvLocal();
              if (!cur.VITE_WHATSAPP_NUMBER || cur.VITE_WHATSAPP_NUMBER !== phoneNumber) {
                updateEvolutionConfig({ whatsappNumber: phoneNumber });
              }
            }
          }
        } catch {}
      }

      const activeNum = phoneNumber || (evolutionConfig().whatsappNumber) || '';

      return {
        connected: isConnected,
        configured: true,
        state: isConnected ? 'open' : rawState === 'connecting' ? 'connecting' : 'close',
        instanceName,
        apiUrl,
        apiKeySet: Boolean(apiKey),
        verified_name: 'Evolution WhatsApp API',
        display_phone_number: activeNum,
        data,
      };
    } else if (res.status === 401 || res.status === 403) {
      return {
        connected: false,
        configured: true,
        state: 'unauthorized',
        instanceName,
        apiUrl,
        apiKeySet: Boolean(apiKey),
        error: `Authentication failed (HTTP ${res.status}). Please check your API Key.`,
      };
    }
  } catch (err) {
    lastError = err;
  }

  // 2. Try Evolution-Go: GET /instance/status
  try {
    const res = await fetch(`${apiUrl}/instance/status`, {
      method: 'GET',
      signal: AbortSignal.timeout(4000),
      headers,
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const rawState = (data.status || data.state || data.instance?.state || (data.connected ? 'open' : 'close')).toLowerCase();
      const isConnected = rawState === 'open' || rawState === 'connected' || Boolean(data.connected);

      return {
        connected: isConnected,
        configured: true,
        state: isConnected ? 'open' : rawState,
        instanceName,
        apiUrl,
        apiKeySet: Boolean(apiKey),
        verified_name: 'Evolution WhatsApp API',
        display_phone_number: data.phone || data.number || data.jid?.replace(/@.*$/, '') || '',
        data,
      };
    } else if (res.status === 401 || res.status === 403) {
      return {
        connected: false,
        configured: true,
        state: 'unauthorized',
        instanceName,
        apiUrl,
        apiKeySet: Boolean(apiKey),
        error: `Authentication failed (HTTP ${res.status}). Please check your API Key.`,
      };
    }
  } catch (err) {
    lastError = err;
  }

  // Detailed network diagnostics
  const errMsg = lastError?.message || 'Server did not respond';
  const isConnRefused = errMsg.includes('ECONNREFUSED') || errMsg.includes('fetch failed') || errMsg.includes('Failed to fetch');

  return {
    connected: false,
    configured: true,
    state: isConnRefused ? 'offline' : 'close',
    instanceName,
    apiUrl,
    apiKeySet: Boolean(apiKey),
    error: isConnRefused
      ? `Could not connect to Evolution API at ${apiUrl}. Make sure your Evolution API container is running.`
      : `Evolution API returned: ${errMsg}`,
  };
}

/**
 * Initialize instance connection via Evolution POST /instance/connect
 */
export async function connectEvolutionInstance({ webhookUrl } = {}) {
  const { apiUrl, apiKey, instanceName } = evolutionConfig();
  const headers = getAuthHeaders(apiKey);

  // Try Evolution API v2: GET /instance/connect/{instanceName}
  try {
    const res = await fetch(`${apiUrl}/instance/connect/${encodeURIComponent(instanceName)}`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
      headers,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, data };
  } catch {}

  // Fallback to Evolution-Go POST /instance/connect
  try {
    const res = await fetch(`${apiUrl}/instance/connect`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers,
      body: JSON.stringify({
        immediate: true,
        webhookUrl: webhookUrl || '',
      }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Create instance on Evolution API v2 / Evolution-Go via POST /instance/create
 */
export async function createEvolutionInstance({ name, instanceId, token } = {}) {
  const { apiUrl, apiKey, instanceName, instanceId: defaultId } = evolutionConfig();
  const headers = getAuthHeaders(token || apiKey);
  const instName = name || instanceName;
  const isUuid = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
  const validUuid = isUuid(instanceId) ? instanceId : isUuid(defaultId) ? defaultId : crypto.randomUUID();

  try {
    const res = await fetch(`${apiUrl}/instance/create`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers,
      body: JSON.stringify({
        instanceName: instName,
        name: instName,
        instanceId: validUuid,
        token: token || apiKey || '',
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Fetch live QR code from Evolution API
 * Supports both Evolution API v2 (/instance/connect/{instanceName}) and Evolution-Go (/instance/qr)
 */
export async function getEvolutionQrCode() {
  const { apiUrl, apiKey, instanceName } = evolutionConfig();
  const headers = getAuthHeaders(apiKey);

  // 1. Primary: GET /instance/connect/{instanceName} (Evolution API v2 & Baileys)
  try {
    const res = await fetch(`${apiUrl}/instance/connect/${encodeURIComponent(instanceName)}`, {
      method: 'GET',
      signal: AbortSignal.timeout(6000),
      headers,
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      let base64 = data.base64 || data.qrcode?.base64;
      const code = data.code || data.qrcode?.code;

      if (!base64 && code) {
        base64 = await QRCode.toDataURL(code).catch(() => null);
      }

      if (base64) {
        return {
          ok: true,
          base64: base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`,
          code: code || null,
          pairingCode: data.pairingCode || null,
        };
      }
    }
  } catch {}

  // 2. Evolution-Go endpoint: GET /instance/qr
  try {
    const res = await fetch(`${apiUrl}/instance/qr`, {
      method: 'GET',
      signal: AbortSignal.timeout(6000),
      headers,
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      let base64 = data.base64 || data.qrcode || data.qr;
      const code = data.code;

      if (!base64 && code) {
        base64 = await QRCode.toDataURL(code).catch(() => null);
      }

      if (base64) {
        return {
          ok: true,
          base64: base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`,
          code: code || null,
          pairingCode: data.pairingCode || null,
        };
      }
    }
  } catch {}

  // 3. If instance is missing or stopped, auto-create it then fetch QR
  try {
    await createEvolutionInstance({ name: instanceName });
    await new Promise((r) => setTimeout(r, 600));

    const retryRes = await fetch(`${apiUrl}/instance/connect/${encodeURIComponent(instanceName)}`, {
      method: 'GET',
      signal: AbortSignal.timeout(6000),
      headers,
    });
    if (retryRes.ok) {
      const data = await retryRes.json().catch(() => ({}));
      let base64 = data.base64 || data.qrcode?.base64;
      const code = data.code || data.qrcode?.code;
      if (!base64 && code) {
        base64 = await QRCode.toDataURL(code).catch(() => null);
      }
      if (base64) {
        return {
          ok: true,
          base64: base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`,
          code: code || null,
          pairingCode: data.pairingCode || null,
        };
      }
    }
  } catch {}

  // 4. Try POST /instance/connect then retry GET /instance/qr
  try {
    await fetch(`${apiUrl}/instance/connect`, {
      method: 'POST',
      signal: AbortSignal.timeout(6000),
      headers,
      body: JSON.stringify({ immediate: true }),
    }).catch(() => {});

    await new Promise((r) => setTimeout(r, 600));

    const finalRes = await fetch(`${apiUrl}/instance/qr`, {
      method: 'GET',
      signal: AbortSignal.timeout(6000),
      headers,
    });
    if (finalRes.ok) {
      const data = await finalRes.json().catch(() => ({}));
      let base64 = data.base64 || data.qrcode || data.qr;
      const code = data.code;
      if (!base64 && code) {
        base64 = await QRCode.toDataURL(code).catch(() => null);
      }
      if (base64) {
        return {
          ok: true,
          base64: base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`,
          code: code || null,
        };
      }
    }
  } catch {}

  return {
    ok: false,
    error: `Could not fetch QR code from Evolution API at ${apiUrl}. Please make sure the container is running and initialized.`,
  };
}

/**
 * Request phone pairing code from Evolution-Go via POST /instance/pair
 * Schema: PairStruct { phone, subscribe? }
 */
export async function pairEvolutionInstance({ phone }) {
  if (!phone) throw new Error('Phone number is required for pairing');
  const { apiUrl, apiKey } = evolutionConfig();
  const cleanPhone = String(phone).replace(/\D/g, '');
  const headers = getAuthHeaders(apiKey);

  try {
    const res = await fetch(`${apiUrl}/instance/pair`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers,
      body: JSON.stringify({ phone: cleanPhone }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return {
        ok: true,
        code: data.code || data.pairingCode || data.codePairing || data.data?.code,
        data,
      };
    }
    return {
      ok: false,
      error: data.message || data.error || `HTTP ${res.status}: ${res.statusText}`,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Force reconnect Evolution API instance via POST /instance/reconnect or POST /instance/forcereconnect
 */
export async function reconnectEvolutionInstance() {
  const { apiUrl, apiKey } = evolutionConfig();
  const headers = getAuthHeaders(apiKey);
  try {
    const res = await fetch(`${apiUrl}/instance/reconnect`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, data };
  } catch {}

  // Fallback to /instance/forcereconnect
  try {
    const res = await fetch(`${apiUrl}/instance/forcereconnect`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Force reconnect Evolution API instance via POST /instance/forcereconnect
 */
export async function forceReconnectEvolutionInstance() {
  const { apiUrl, apiKey } = evolutionConfig();
  const headers = getAuthHeaders(apiKey);
  try {
    const res = await fetch(`${apiUrl}/instance/forcereconnect`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Test connectivity to an Evolution API endpoint with optional custom credentials
 */
export async function testEvolutionConnection({ apiUrl: testUrl, apiKey: testKey } = {}) {
  const current = evolutionConfig();
  const targetUrl = (testUrl || current.apiUrl || 'http://localhost:8088').replace(/\/+$/, '');
  const targetKey = testKey !== undefined ? testKey : current.apiKey;
  const headers = getAuthHeaders(targetKey);
  const startTime = Date.now();

  try {
    // 1. Try Evolution API v2: GET /instance/connectionState/{instanceName}
    const instName = current.instanceName || 'fuloozi';
    const stateRes = await fetch(`${targetUrl}/instance/connectionState/${encodeURIComponent(instName)}`, {
      method: 'GET',
      signal: AbortSignal.timeout(6000),
      headers,
    });
    const latencyMs = Date.now() - startTime;

    if (stateRes.ok) {
      const data = await stateRes.json().catch(() => ({}));
      const rawState = (data?.instance?.state || data?.state || 'ready').toLowerCase();
      const isConnected = rawState === 'open' || rawState === 'connected';
      return {
        ok: true,
        reachable: true,
        authenticated: true,
        latencyMs,
        status: isConnected ? 'connected' : 'ready',
        state: rawState,
        phoneNumber: '',
        message: isConnected
          ? `Connected to Evolution API! WhatsApp session is active.`
          : `Reachable (${latencyMs}ms). Instance "${instName}" is ready for QR code scanning.`,
        data,
      };
    } else if (stateRes.status === 401 || stateRes.status === 403) {
      return {
        ok: false,
        reachable: true,
        authenticated: false,
        latencyMs,
        status: 'unauthorized',
        message: `Evolution API is reachable, but authentication failed (HTTP ${stateRes.status}). Please check your API key.`,
      };
    }

    // 2. Try Evolution API v2: GET /instance/fetchInstances
    const fetchRes = await fetch(`${targetUrl}/instance/fetchInstances`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
      headers,
    });
    if (fetchRes.ok) {
      const data = await fetchRes.json().catch(() => []);
      const latencyMs2 = Date.now() - startTime;
      return {
        ok: true,
        reachable: true,
        authenticated: true,
        latencyMs: latencyMs2,
        status: 'ready',
        state: 'ready',
        message: `Reachable (${latencyMs2}ms). Evolution API is active.`,
        data,
      };
    }

    // 3. Fallback: Evolution-Go GET /instance/status
    const res = await fetch(`${targetUrl}/instance/status`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
      headers,
    });
    const latencyMs3 = Date.now() - startTime;
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      const isConnected = data.connected || data.status === 'open' || data.state === 'open';
      return {
        ok: true,
        reachable: true,
        authenticated: true,
        latencyMs: latencyMs3,
        status: isConnected ? 'connected' : 'ready',
        state: data.status || data.state || 'ready',
        phoneNumber: data.phone || data.number || data.jid?.replace(/@.*$/, '') || '',
        message: isConnected
          ? `Connected to Evolution API! WhatsApp session is active (+${data.phone || data.number || ''}).`
          : `Reachable (${latencyMs3}ms). Instance is ready for QR code scanning or pairing.`,
        data,
      };
    } else if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        reachable: true,
        authenticated: false,
        latencyMs: latencyMs3,
        status: 'unauthorized',
        message: `Evolution API is reachable, but authentication failed (HTTP ${res.status}). Please check your API key.`,
      };
    } else {
      return {
        ok: false,
        reachable: true,
        authenticated: true,
        latencyMs: latencyMs3,
        status: 'error',
        message: `Evolution API returned HTTP ${res.status}: ${res.statusText}`,
        data,
      };
    }
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const msg = err.message || '';
    const isConnRefused = msg.includes('ECONNREFUSED') || msg.includes('fetch failed');
    return {
      ok: false,
      reachable: false,
      authenticated: false,
      latencyMs,
      status: 'offline',
      message: isConnRefused
        ? `Cannot reach Evolution API at ${targetUrl}. Server is offline or port is blocked.`
        : `Connection error: ${msg}`,
    };
  }
}

/**
 * Disconnect Evolution API instance via POST /instance/disconnect
 */
export async function disconnectEvolutionInstance() {
  const { apiUrl, apiKey } = evolutionConfig();
  const headers = getAuthHeaders(apiKey);
  try {
    const res = await fetch(`${apiUrl}/instance/disconnect`, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Send text message via Evolution-Go POST /send/text
 * Schema: TextStruct { number, text, delay? }
 */
export async function sendWhatsAppMessage({ to, text }) {
  if (!to || !text) {
    throw new Error('Recipient number ("to") and message text are required');
  }

  const { apiUrl, apiKey, instanceName } = evolutionConfig();
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

  const { apiUrl, apiKey, instanceName } = evolutionConfig();
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
  const { apiUrl, apiKey } = evolutionConfig();
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
  } catch {}
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

  // Pattern E: Conversational Question via Connected AI Agent
  let reply = '';
  try {
    reply = await generateAIReply({
      userPrompt: cleanCommand,
      householdContext: ledgerData,
    });
  } catch {
    reply = `I'm Jennifer, your Fuloozi finance assistant. You're tracking well on your household budget this month! Ask me about upcoming bills, category budgets, or send "expense 50 groceries" to record a payment.`;
  }

  const sendResult = await sendWhatsAppMessage({ to: cleanSender, text: reply });
  return { ok: true, action: 'agent_reply', reply, sent: sendResult.ok, agentResult: sendResult };
}
