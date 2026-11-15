// Credential vault and signing helpers. Secrets are sealed with AES-256-GCM and only opened
// inside the code path that needs them. Nothing here logs or returns a raw secret.
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

function vaultKey() {
  const key = Buffer.from(process.env.WA_VAULT_KEY || '', 'base64');
  if (key.length !== 32) throw new Error('WA_VAULT_KEY must be 32 random bytes, base64 encoded');
  return key;
}

export function seal(payload) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', vaultKey(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), body.toString('base64')].join('.');
}

export function open(sealed) {
  const [version, iv, tag, body] = String(sealed).split('.');
  if (version !== 'v1' || !iv || !tag || !body) throw new Error('Unreadable credential');
  const decipher = createDecipheriv('aes-256-gcm', vaultKey(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(body, 'base64')), decipher.final()]).toString('utf8'));
}

export const last4 = (secret) => String(secret ?? '').slice(-4);
export const mask = (tail) => `****${tail}`;
export const sha256Hex = (value) => createHash('sha256').update(value).digest('hex');
export const hmacHex = (secret, data) => createHmac('sha256', secret).update(data).digest('hex');

// Constant-time comparison of two hex digests. A malformed digest is a mismatch, not an error.
export function sameHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !/^[0-9a-f]+$/i.test(a) || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

// Tenant API keys: the raw key is shown once, only its hash is stored.
export function newApiKey() {
  const raw = `wak_${randomBytes(24).toString('base64url')}`;
  return { raw, hash: sha256Hex(raw), prefix: raw.slice(0, 8), last4: last4(raw) };
}
