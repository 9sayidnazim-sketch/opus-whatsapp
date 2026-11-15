import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoUint8Array } from '@simplewebauthn/server/helpers';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RP_NAME = 'Fuloozi Household Ledger';
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const CREDENTIAL_ID = /^[A-Za-z0-9_-]{16,1366}$/;

const EXPIRED = 'This passkey request has expired. Please try again.';
const NOT_ENROLLED = 'This passkey is not enrolled for Fuloozi. Sign in with your MPIN, then enroll it in Admin.';
const FAILED = 'Passkey verification failed. Please try again or use your MPIN.';
const UNAVAILABLE = 'The passkey service is unavailable. Sign in with your MPIN.';

export class WebAuthnError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function getExpectedRP(originHeader) {
  let origin = 'http://localhost:5173';
  let rpID = 'localhost';

  if (originHeader) {
    try {
      const url = new URL(originHeader);
      origin = url.origin;
      rpID = url.hostname;
    } catch {}
  }
  return { origin, rpID };
}

const normalizeUsername = (value) => String(value || 'owner').toLowerCase().trim().replace(/^@/, '') || 'owner';

function cleanDeviceName(value) {
  const name = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, 80) : '';
  return name || 'Passkey';
}

function bearer(authorization) {
  const match = typeof authorization === 'string' ? authorization.match(/^Bearer\s+(\S+)$/i) : null;
  return match?.[1] || null;
}

/* -------------------------------------------------------------
 * Production backend: Supabase (credentials, challenges, sessions)
 * ------------------------------------------------------------- */

function supabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    secretKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
    publishableKey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY,
  };
}

const SERVER_AUTH = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };
let adminCache = { key: '', client: null };

// Uses the secret key, so it bypasses RLS. Never sign a user in on this client:
// a stored session would replace the secret key on every later query.
function admin() {
  const { url, secretKey } = supabaseConfig();
  const key = `${url}|${secretKey}`;
  if (adminCache.key !== key) adminCache = { key, client: createClient(url, secretKey, { auth: SERVER_AUTH }) };
  return adminCache.client;
}

function storageFailure(error) {
  console.error('Passkey storage error:', error?.message || error);
  return new WebAuthnError(UNAVAILABLE, 503);
}

const supabaseBackend = {
  // Verifies the caller's Supabase JWT with Supabase Auth; the request body never chooses the account.
  async identify({ authorization }) {
    const token = bearer(authorization);
    if (!token) throw new WebAuthnError('Sign in before enrolling a passkey.', 401);
    const { data, error } = await admin().auth.getUser(token);
    if (error || !data?.user) throw new WebAuthnError('Your session has expired. Sign in again.', 401);
    if (data.user.is_anonymous) throw new WebAuthnError('Create an account before enrolling a passkey.', 403);
    const meta = data.user.user_metadata || {};
    const userName = meta.username || data.user.email || data.user.id;
    return { ownerId: data.user.id, userName, displayName: meta.full_name || userName };
  },

  // Usernames live behind opus_mpin, so sign-in uses discoverable passkeys instead of a hint.
  async ownerHint() {
    return null;
  },

  async issueChallenge(challenge, ceremony, ownerId) {
    const db = admin();
    const now = Date.now();
    const cleanup = await db.from('opus_passkey_challenges').delete().lt('expires_at', new Date(now).toISOString());
    if (cleanup.error) throw storageFailure(cleanup.error);
    const { error } = await db.from('opus_passkey_challenges').insert({
      challenge,
      ceremony,
      owner_id: ownerId,
      expires_at: new Date(now + CHALLENGE_TTL_MS).toISOString(),
    });
    if (error) throw storageFailure(error);
  },

  // DELETE ... RETURNING makes each challenge single-use, even under concurrent requests.
  async consumeChallenge(challenge, ceremony) {
    if (typeof challenge !== 'string' || !challenge || challenge.length > 128) throw new WebAuthnError(EXPIRED);
    const { data, error } = await admin()
      .from('opus_passkey_challenges')
      .delete()
      .eq('challenge', challenge)
      .select('ceremony, owner_id, expires_at');
    if (error) throw storageFailure(error);
    const entry = data?.[0];
    if (!entry || entry.ceremony !== ceremony || Date.parse(entry.expires_at) <= Date.now()) {
      throw new WebAuthnError(EXPIRED);
    }
    return { ownerId: entry.owner_id };
  },

  async listCredentials(ownerId) {
    const { data, error } = await admin().from('opus_passkeys').select('id, transports').eq('owner_id', ownerId);
    if (error) throw storageFailure(error);
    return data || [];
  },

  async findCredential(id) {
    if (typeof id !== 'string' || !CREDENTIAL_ID.test(id)) return null;
    const { data, error } = await admin()
      .from('opus_passkeys')
      .select('id, owner_id, public_key, counter, transports')
      .eq('id', id)
      .maybeSingle();
    if (error) throw storageFailure(error);
    return data
      ? { id: data.id, ownerId: data.owner_id, publicKey: data.public_key, counter: Number(data.counter) || 0, transports: data.transports }
      : null;
  },

  async saveCredential(ownerId, credential) {
    const { error } = await admin().from('opus_passkeys').insert({
      id: credential.id,
      owner_id: ownerId,
      public_key: credential.publicKey,
      counter: credential.counter,
      transports: credential.transports,
      device_type: credential.deviceType,
      backed_up: credential.backedUp,
      device_name: credential.deviceName,
    });
    if (error?.code === '23505') throw new WebAuthnError('This passkey is already enrolled.', 409);
    if (error) throw storageFailure(error);
  },

  // Compare-and-set on the counter: a concurrent use or a revoke mid-ceremony fails closed.
  async updateCounter(credential, newCounter) {
    const { data, error } = await admin()
      .from('opus_passkeys')
      .update({ counter: newCounter, last_used_at: new Date().toISOString() })
      .eq('id', credential.id)
      .eq('counter', credential.counter)
      .select('id');
    if (error) throw storageFailure(error);
    if (!data?.length) throw new WebAuthnError(FAILED, 401);
  },

  // Supabase has no admin "create session" call, so mint a one-time magic-link token
  // (no email is sent) and exchange it for a normal session right here.
  async startSession(ownerId) {
    const db = admin();
    const { data: found, error: userError } = await db.auth.admin.getUserById(ownerId);
    const user = found?.user;
    if (userError || !user?.email) {
      console.error('Passkey session error: user lookup failed', userError?.message);
      throw new WebAuthnError('Could not start your session. Sign in with your MPIN.', 503);
    }
    const { data: link, error: linkError } = await db.auth.admin.generateLink({ type: 'magiclink', email: user.email });
    const tokenHash = link?.properties?.hashed_token;
    if (linkError || !tokenHash) {
      console.error('Passkey session error: generateLink failed', linkError?.message);
      throw new WebAuthnError('Could not start your session. Sign in with your MPIN.', 503);
    }
    // A throwaway client, so the new session never lands on the shared admin client.
    const { url, publishableKey, secretKey } = supabaseConfig();
    const exchange = createClient(url, publishableKey || secretKey, { auth: SERVER_AUTH });
    const { data: verified, error: verifyError } = await exchange.auth.verifyOtp({ type: 'email', token_hash: tokenHash });
    const session = verified?.session;
    if (verifyError || !session?.access_token || verified.user?.id !== ownerId) {
      console.error('Passkey session error: token exchange failed', verifyError?.message);
      throw new WebAuthnError('Could not start your session. Sign in with your MPIN.', 503);
    }
    return {
      username: user.user_metadata?.username || user.email,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    };
  },
};

/* -------------------------------------------------------------
 * Dev mock backend: JSON file, only when no Supabase project is configured
 * ------------------------------------------------------------- */

const DEFAULT_DEV_STORE = join(dirname(fileURLToPath(import.meta.url)), '.webauthn_store.json');
let devStore = null;
let devStorePath = null;

function loadDevStore() {
  const path = process.env.WEBAUTHN_DEV_STORE_PATH || DEFAULT_DEV_STORE;
  if (devStore && devStorePath === path) return devStore;
  devStorePath = path;
  devStore = { users: {}, challenges: {} };
  try {
    if (existsSync(path)) devStore = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    // Start empty if the file is unreadable.
  }
  devStore.users ||= {};
  devStore.challenges ||= {};
  return devStore;
}

function saveDevStore() {
  try {
    writeFileSync(devStorePath, JSON.stringify(devStore, null, 2), 'utf8');
  } catch {}
}

// The dev mock has no real accounts, so the username in the request body is the identity.
const devBackend = {
  async identify({ username, displayName }) {
    const name = normalizeUsername(username);
    return { ownerId: name, userName: name, displayName: displayName || name };
  },

  async ownerHint(username) {
    if (!username) return null;
    const name = normalizeUsername(username);
    return loadDevStore().users[name]?.credentials?.length ? name : null;
  },

  async issueChallenge(challenge, ceremony, ownerId) {
    const store = loadDevStore();
    const now = Date.now();
    for (const [key, entry] of Object.entries(store.challenges)) {
      if (now - (entry.created_at || 0) > CHALLENGE_TTL_MS) delete store.challenges[key];
    }
    store.challenges[challenge] = { type: ceremony, username: ownerId, created_at: now };
    saveDevStore();
  },

  async consumeChallenge(challenge, ceremony) {
    const store = loadDevStore();
    const entry = typeof challenge === 'string' && challenge ? store.challenges[challenge] : undefined;
    if (entry) delete store.challenges[challenge];
    saveDevStore();
    if (!entry || entry.type !== ceremony || Date.now() - entry.created_at > CHALLENGE_TTL_MS) {
      throw new WebAuthnError(EXPIRED);
    }
    return { ownerId: entry.username || null };
  },

  async listCredentials(ownerId) {
    return loadDevStore().users[ownerId]?.credentials || [];
  },

  async findCredential(id) {
    for (const user of Object.values(loadDevStore().users)) {
      const found = (user.credentials || []).find(c => c.id === id);
      if (found) return { ...found, ownerId: user.username };
    }
    return null;
  },

  async saveCredential(ownerId, credential) {
    const store = loadDevStore();
    if (await this.findCredential(credential.id)) throw new WebAuthnError('This passkey is already enrolled.', 409);
    const user = (store.users[ownerId] ||= { username: ownerId, displayName: ownerId, credentials: [] });
    user.credentials = [{ ...credential, created_at: new Date().toISOString() }, ...(user.credentials || [])];
    saveDevStore();
  },

  async updateCounter(credential, newCounter) {
    const store = loadDevStore();
    const stored = store.users[credential.ownerId]?.credentials?.find(c => c.id === credential.id);
    if (!stored || (stored.counter || 0) !== (credential.counter || 0)) throw new WebAuthnError(FAILED, 401);
    stored.counter = newCounter;
    saveDevStore();
  },

  // The local mock client accepts any token, so dev sign-in only needs the username.
  async startSession(ownerId) {
    return {
      username: ownerId,
      access_token: 'dev-passkey-token-' + Date.now(),
      refresh_token: 'dev-passkey-refresh-' + Date.now(),
    };
  },
};

// The dev mock runs only with no Supabase project and outside Vercel. A deployment
// that is missing the secret key fails closed instead of falling back to the mock.
function backend() {
  const { url, secretKey } = supabaseConfig();
  if (url && secretKey) return supabaseBackend;
  if (!url && !process.env.VERCEL) return devBackend;
  throw new WebAuthnError('Passkey sign-in is not configured on this server. Sign in with your MPIN.', 503);
}

/* -------------------------------------------------------------
 * WebAuthn ceremonies
 * ------------------------------------------------------------- */

/**
 * 1. Generate Registration Options (signed-in users only)
 */
export async function getRegistrationOptions({ authorization, username, displayName, originHeader }) {
  const store = backend();
  const { rpID } = getExpectedRP(originHeader);
  const who = await store.identify({ authorization, username, displayName });
  const existing = await store.listCredentials(who.ownerId);

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    // A stable user handle: re-enrolling on the same authenticator replaces its old passkey.
    userID: isoUint8Array.fromUTF8String(who.ownerId),
    userName: who.userName,
    userDisplayName: who.displayName,
    attestationType: 'none',
    excludeCredentials: existing.map(cred => ({ id: cred.id, transports: cred.transports })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  await store.issueChallenge(options.challenge, 'registration', who.ownerId);
  return options;
}

/**
 * 2. Verify Registration Response (signed-in users only)
 */
export async function verifyRegistration({ authorization, username, response, expectedChallenge, originHeader, deviceName }) {
  const store = backend();
  const { origin, rpID } = getExpectedRP(originHeader);
  const who = await store.identify({ authorization, username });

  const issued = await store.consumeChallenge(expectedChallenge, 'registration');
  if (issued.ownerId !== who.ownerId) {
    throw new WebAuthnError('This passkey request was issued for a different account.', 403);
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });
  } catch (err) {
    console.error('Registration verification error:', err?.message);
    throw new WebAuthnError('This passkey could not be verified. Please try again.');
  }

  const { verified, registrationInfo } = verification;
  if (!verified || !registrationInfo) {
    throw new WebAuthnError('This passkey could not be verified. Please try again.');
  }

  const { credential, credentialDeviceType, credentialBackedUp } = registrationInfo;
  const newCredential = {
    id: credential.id,
    publicKey: Buffer.from(credential.publicKey).toString('base64'),
    counter: credential.counter,
    transports: Array.isArray(response?.response?.transports) ? response.response.transports.slice(0, 8) : [],
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
    deviceName: cleanDeviceName(deviceName),
  };

  await store.saveCredential(who.ownerId, newCredential);

  return {
    verified: true,
    credential: {
      id: newCredential.id,
      deviceName: newCredential.deviceName,
      transports: newCredential.transports,
      created_at: new Date().toISOString(),
    },
  };
}

/**
 * 3. Generate Authentication Options
 * purpose 'check' (a signed-in user testing their sensor) binds the challenge to that user.
 */
export async function getAuthenticationOptions({ authorization, username, originHeader, purpose }) {
  const store = backend();
  const { rpID } = getExpectedRP(originHeader);
  const ownerId = purpose === 'check'
    ? (await store.identify({ authorization, username })).ownerId
    : await store.ownerHint(username);

  const allowed = ownerId ? await store.listCredentials(ownerId) : [];
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: allowed.length ? allowed.map(c => ({ id: c.id, transports: c.transports })) : undefined,
    userVerification: 'preferred',
  });

  await store.issueChallenge(options.challenge, 'authentication', ownerId);
  return options;
}

/**
 * 4. Verify Authentication Response
 */
// The client's `username` field is only a hint (on the sign-in screen it holds
// the passkey's userHandle), so identity comes from the stored credential and
// the user the challenge was issued for.
export async function verifyAuthentication({ authorization, username, response, expectedChallenge, originHeader, purpose }) {
  const store = backend();
  const { origin, rpID } = getExpectedRP(originHeader);
  const checker = purpose === 'check' ? await store.identify({ authorization, username }) : null;
  const issued = await store.consumeChallenge(expectedChallenge, 'authentication');
  const credential = await store.findCredential(response?.id);

  // Fail closed: an unknown passkey never signs anyone in.
  if (
    !credential?.publicKey ||
    (issued.ownerId && credential.ownerId !== issued.ownerId) ||
    (checker && credential.ownerId !== checker.ownerId)
  ) {
    throw new WebAuthnError(NOT_ENROLLED, 401);
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      // @simplewebauthn/server v11+ takes `credential` (v9 used `authenticator`)
      credential: {
        id: credential.id,
        publicKey: new Uint8Array(Buffer.from(credential.publicKey, 'base64')),
        counter: credential.counter || 0,
        transports: credential.transports,
      },
      requireUserVerification: false,
    });
  } catch (err) {
    console.error('Authentication verification error:', err?.message);
    throw new WebAuthnError(FAILED, 401);
  }

  if (!verification.verified) {
    throw new WebAuthnError(FAILED, 401);
  }

  await store.updateCounter(credential, verification.authenticationInfo.newCounter);

  if (checker) return { verified: true, username: checker.userName };
  return { verified: true, ...(await store.startSession(credential.ownerId)) };
}

/* -------------------------------------------------------------
 * HTTP entry point shared by api/webauthn.js (Vercel) and the Vite dev API
 * ------------------------------------------------------------- */

const ACTIONS = {
  'registration-options': getRegistrationOptions,
  'verify-registration': verifyRegistration,
  'authentication-options': getAuthenticationOptions,
  'verify-authentication': verifyAuthentication,
};

export async function handleWebAuthnRequest({ action, method, body, headers = {} }) {
  const run = Object.hasOwn(ACTIONS, action) ? ACTIONS[action] : null;
  if (!run || method !== 'POST') return { status: 404, body: { error: 'Unknown WebAuthn endpoint' } };

  const input = body && typeof body === 'object' ? body : {};
  try {
    const result = await run({
      username: typeof input.username === 'string' ? input.username : undefined,
      displayName: typeof input.displayName === 'string' ? input.displayName.slice(0, 60) : undefined,
      response: input.response,
      expectedChallenge: input.expectedChallenge,
      deviceName: input.deviceName,
      purpose: input.purpose === 'check' ? 'check' : 'sign-in',
      authorization: headers.authorization,
      originHeader: headers.origin || headers.referer,
    });
    return { status: 200, body: result };
  } catch (err) {
    if (err instanceof WebAuthnError) return { status: err.status, body: { error: err.message } };
    console.error('WebAuthn API error:', err);
    return { status: 500, body: { error: 'Passkey request failed. Please try again.' } };
  }
}
