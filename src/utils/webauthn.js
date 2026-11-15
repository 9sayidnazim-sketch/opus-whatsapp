import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';

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
 * Get all registered passkey credentials stored on this device
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

/**
 * Save a newly verified passkey credential
 */
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
 * Remove an enrolled passkey credential
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

/**
 * Register device biometrics (Touch ID / Face ID) using SimpleWebAuthn
 */
export async function registerBiometrics({ username, displayName }) {
  const { supported } = await checkBiometricsSupport();
  if (!supported) {
    throw new Error('WebAuthn biometrics are not supported on this browser');
  }

  const userHandle = username || 'owner';
  const userFull = displayName || username || 'Household Member';

  // 1. Fetch registration options from server
  const optRes = await fetch('/api/webauthn/registration-options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    throw err;
  }

  // 3. Verify response with server
  const verRes = await fetch('/api/webauthn/verify-registration', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

  // Save locally for fast device matching
  const credentialRecord = {
    id: attResp.id,
    username: userHandle,
    displayName: userFull,
    deviceName: getDeviceName(),
    created_at: new Date().toISOString(),
    publicKey: result.credential?.publicKey || '',
    counter: result.credential?.counter || 0,
    transports: attResp.response?.transports || ['internal'],
  };

  saveCredential(credentialRecord);
  sessionStorage.removeItem(CURRENT_CHALLENGE_KEY);

  return { success: true, credential: credentialRecord };
}

/**
 * Sign in using Face ID / Touch ID / Device Biometrics
 */
export async function authenticateWithBiometrics(targetUsername = '') {
  const { supported } = await checkBiometricsSupport();
  if (!supported) {
    throw new Error('Biometrics not supported on this device');
  }

  // 1. Request authentication options
  const optRes = await fetch('/api/webauthn/authentication-options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: targetUsername }),
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: targetUsername || asseResp.response?.userHandle,
      response: asseResp,
      expectedChallenge: sessionStorage.getItem(CURRENT_CHALLENGE_KEY),
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

