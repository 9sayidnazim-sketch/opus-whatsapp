import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';
import { supabase, isSupabaseConfigured } from '@/api/client';

// Dev mock only: with no Supabase project, the device list lives in localStorage.
const STORAGE_KEY = 'fuloozi_webauthn_credentials';
const CURRENT_CHALLENGE_KEY = 'fuloozi_webauthn_current_challenge';

/**
 * Check if the current browser and device support biometric WebAuthn (Touch ID, Face ID, Windows Hello)
 */
export async function checkBiometricsSupport() {
  if (typeof window === 'undefined') {
    return { supported: false, hasBiometrics: false };
  }

  const supported = browserSupportsWebAuthn();
  let hasBiometrics = false;

  if (supported) {
    try {
      hasBiometrics = await platformAuthenticatorIsAvailable();
    } catch {
      hasBiometrics = false;
    }
  }

  return { supported, hasBiometrics };
}

/**
 * Get passkeys recorded in this browser (dev mock list)
 */
export function getRegisteredCredentials(username) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw);
    if (username) {
      return all.filter(c => c.username?.toLowerCase() === username.toLowerCase());
    }
    return all;
  } catch {
    return [];
  }
}

function saveCredential(credential) {
  try {
    const existing = getRegisteredCredentials();
    const updated = [credential, ...existing.filter(c => c.id !== credential.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Failed to store WebAuthn credential', err);
    return [];
  }
}

/**
 * Remove a passkey from this browser's list (dev mock list)
 */
export function removeCredential(credentialId) {
  try {
    const existing = getRegisteredCredentials();
    const updated = existing.filter(c => c.id !== credentialId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

/**
 * List the signed-in user's passkeys. With Supabase this reads opus_passkeys
 * (row-level security returns only the caller's own rows).
 */
export async function listPasskeys() {
  if (!isSupabaseConfigured) return getRegisteredCredentials();
  const { data, error } = await supabase
    .from('opus_passkeys')
    .select('id, device_name, created_at, last_used_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error('Could not load your passkeys');
  return data.map(row => ({
    id: row.id,
    deviceName: row.device_name,
    created_at: row.created_at,
    last_used_at: row.last_used_at,
  }));
}

/**
 * Revoke one of the signed-in user's passkeys. With Supabase the row is deleted,
 * so that passkey can no longer sign anyone in.
 */
export async function revokePasskey(credentialId) {
  if (!isSupabaseConfigured) return removeCredential(credentialId);
  const { error } = await supabase.from('opus_passkeys').delete().eq('id', credentialId);
  if (error) throw new Error('Could not revoke this passkey');
  return listPasskeys();
}

/**
 * Get a human-readable device name based on User Agent
 */
export function getDeviceName() {
  if (typeof navigator === 'undefined') return 'Personal Device';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'Apple iOS (Face ID / Touch ID)';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'MacBook / Mac (Touch ID)';
  if (/Windows/i.test(ua)) return 'Windows PC (Windows Hello)';
  if (/Android/i.test(ua)) return 'Android Device (Biometrics)';
  return 'Personal Device Biometrics';
}

// Enrolment needs the caller's Supabase session; the server verifies the token.
async function authHeaders(accessToken) {
  let token = accessToken;
  if (!token) {
    const { data } = await supabase.auth.getSession();
    token = data?.session?.access_token;
  }
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Register device biometrics (Touch ID / Face ID) using SimpleWebAuthn.
 * Pass accessToken when the session is not stored yet (right after account creation).
 */
export async function registerBiometrics({ username, displayName, accessToken }) {
  const { supported } = await checkBiometricsSupport();
  if (!supported) {
    throw new Error('WebAuthn biometrics are not supported on this browser');
  }

  const userHandle = username || 'owner';
  const userFull = displayName || username || 'Household Member';
  const headers = await authHeaders(accessToken);

  // 1. Fetch registration options from server
  const optRes = await fetch('/api/webauthn/registration-options', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      username: userHandle,
      displayName: userFull,
    }),
  });

  if (!optRes.ok) {
    const err = await optRes.json().catch(() => ({}));
    throw new Error(err.error || 'Could not initialize biometric registration');
  }

  const optionsJSON = await optRes.json();

  // Save challenge for verification
  sessionStorage.setItem(CURRENT_CHALLENGE_KEY, optionsJSON.challenge);

  // 2. Invoke native Touch ID / Face ID registration sheet
  let attResp;
  try {
    attResp = await startRegistration({ optionsJSON });
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      throw new Error('Biometric registration was cancelled or timed out');
    }
    if (err.name === 'InvalidStateError') {
      throw new Error('This device already has a passkey for your account');
    }
    throw err;
  }

  // 3. Verify response with server
  const verRes = await fetch('/api/webauthn/verify-registration', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      username: userHandle,
      response: attResp,
      expectedChallenge: sessionStorage.getItem(CURRENT_CHALLENGE_KEY),
      deviceName: getDeviceName(),
    }),
  });

  if (!verRes.ok) {
    const err = await verRes.json().catch(() => ({}));
    throw new Error(err.error || 'Biometric verification failed');
  }

  const result = await verRes.json();
  sessionStorage.removeItem(CURRENT_CHALLENGE_KEY);

  const credentialRecord = {
    id: attResp.id,
    username: userHandle,
    displayName: userFull,
    deviceName: result.credential?.deviceName || getDeviceName(),
    created_at: result.credential?.created_at || new Date().toISOString(),
    transports: attResp.response?.transports || [],
  };

  if (!isSupabaseConfigured) saveCredential(credentialRecord);

  return { success: true, credential: credentialRecord };
}

/**
 * Sign in using Face ID / Touch ID / Device Biometrics.
 * With purpose 'check', a signed-in user tests their own passkey and no new session is created.
 */
export async function authenticateWithBiometrics(targetUsername = '', { purpose = 'sign-in' } = {}) {
  const { supported } = await checkBiometricsSupport();
  if (!supported) {
    throw new Error('Biometrics not supported on this device');
  }

  const headers = purpose === 'check' ? await authHeaders() : { 'Content-Type': 'application/json' };

  // 1. Request authentication options
  const optRes = await fetch('/api/webauthn/authentication-options', {
    method: 'POST',
    headers,
    body: JSON.stringify({ username: targetUsername, purpose }),
  });

  if (!optRes.ok) {
    const err = await optRes.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to start biometric sign-in');
  }

  const optionsJSON = await optRes.json();
  sessionStorage.setItem(CURRENT_CHALLENGE_KEY, optionsJSON.challenge);

  // 2. Invoke native Touch ID / Face ID authentication prompt
  let asseResp;
  try {
    asseResp = await startAuthentication({ optionsJSON });
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      throw new Error('Biometric authentication cancelled');
    }
    throw err;
  }

  // 3. Verify authentication response
  const verRes = await fetch('/api/webauthn/verify-authentication', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      username: targetUsername || asseResp.response?.userHandle,
      response: asseResp,
      expectedChallenge: sessionStorage.getItem(CURRENT_CHALLENGE_KEY),
      purpose,
    }),
  });

  if (!verRes.ok) {
    const err = await verRes.json().catch(() => ({}));
    throw new Error(err.error || 'Biometric verification failed');
  }

  const account = await verRes.json();
  sessionStorage.removeItem(CURRENT_CHALLENGE_KEY);

  return { success: true, account };
}
