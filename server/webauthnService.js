import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '.webauthn_store.json');

// Memory cache + local JSON persistence
let store = {
  users: {
    owner: {
      username: 'owner',
      displayName: 'Household Owner',
      credentials: [],
    },
  },
  challenges: {},
};

try {
  if (existsSync(DB_PATH)) {
    store = JSON.parse(readFileSync(DB_PATH, 'utf8'));
  }
} catch {
  // Use memory fallback
}

function saveStore() {
  try {
    writeFileSync(DB_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch {}
}

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function issueChallenge(challenge, type, username) {
  const now = Date.now();
  for (const [key, entry] of Object.entries(store.challenges)) {
    if (now - (entry.created_at || 0) > CHALLENGE_TTL_MS) delete store.challenges[key];
  }
  store.challenges[challenge] = { type, username, created_at: now };
  saveStore();
}

/**
 * Only accept challenges this server issued, once, for the same ceremony type,
 * within the TTL. Never trust a challenge just because the client sent it.
 */
function consumeChallenge(challenge, type) {
  const entry = challenge ? store.challenges[challenge] : undefined;
  if (challenge) delete store.challenges[challenge];
  if (!entry || entry.type !== type || Date.now() - entry.created_at > CHALLENGE_TTL_MS) {
    saveStore();
    throw new Error('This passkey request has expired. Please try again.');
  }
  return entry;
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

/**
 * 1. Generate Registration Options
 */
export async function getRegistrationOptions({ username, displayName, originHeader }) {
  const { rpID } = getExpectedRP(originHeader);
  const normalizedUser = (username || 'owner').toLowerCase().trim();

  if (!store.users[normalizedUser]) {
    store.users[normalizedUser] = {
      username: normalizedUser,
      displayName: displayName || normalizedUser,
      credentials: [],
    };
  }

  const user = store.users[normalizedUser];
  // Do not exclude existing credentials so re-registering or re-enabling Touch ID / Passkeys succeeds
  const excludeCredentials = [];

  const options = await generateRegistrationOptions({
    rpName: 'Fuloozi Household Ledger',
    rpID,
    userName: user.username,
    userDisplayName: user.displayName,
    attestationType: 'none',
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  issueChallenge(options.challenge, 'registration', normalizedUser);

  return options;
}

/**
 * 2. Verify Registration Response
 */
export async function verifyRegistration({ username, response, expectedChallenge, originHeader, deviceName }) {
  const { origin, rpID } = getExpectedRP(originHeader);
  const normalizedUser = (username || 'owner').toLowerCase().trim();

  const issued = consumeChallenge(expectedChallenge, 'registration');
  if (issued.username !== normalizedUser) {
    throw new Error('This passkey request was issued for a different account.');
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
    console.error('Registration verification error:', err);
    throw new Error(err.message || 'Verification failed');
  }

  const { verified, registrationInfo } = verification;
  if (!verified || !registrationInfo) {
    throw new Error('Could not verify registration authenticator');
  }

  const { credential, credentialDeviceType, credentialBackedUp } = registrationInfo;

  const newCredential = {
    id: credential.id,
    publicKey: Buffer.from(credential.publicKey).toString('base64'),
    counter: credential.counter,
    transports: response.response?.transports || ['internal'],
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
    deviceName: deviceName || 'Touch ID / Face ID',
    created_at: new Date().toISOString(),
  };

  if (!store.users[normalizedUser]) {
    store.users[normalizedUser] = { username: normalizedUser, displayName: normalizedUser, credentials: [] };
  }

  store.users[normalizedUser].credentials = [
    newCredential,
    ...store.users[normalizedUser].credentials.filter(c => c.id !== newCredential.id),
  ];

  saveStore();

  return { verified: true, credential: newCredential };
}

/**
 * 3. Generate Authentication Options
 */
export async function getAuthenticationOptions({ username, originHeader }) {
  const { rpID } = getExpectedRP(originHeader);
  const normalizedUser = username ? username.toLowerCase().trim() : null;

  let allowCredentials = undefined;
  if (normalizedUser && store.users[normalizedUser]?.credentials?.length > 0) {
    allowCredentials = store.users[normalizedUser].credentials.map(c => ({
      id: c.id,
      transports: c.transports,
    }));
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials,
    userVerification: 'preferred',
  });

  issueChallenge(options.challenge, 'authentication', normalizedUser);

  return options;
}

/**
 * 4. Verify Authentication Response
 */
// The client's `username` field is only a hint (on the sign-in screen it holds
// the passkey's userHandle), so identity comes from the stored credential and
// the user the challenge was issued for.
export async function verifyAuthentication({ response, expectedChallenge, originHeader }) {
  const { origin, rpID } = getExpectedRP(originHeader);
  const issued = consumeChallenge(expectedChallenge, 'authentication');

  let matchedUser = null;
  let matchedCredential = null;
  for (const u of Object.values(store.users)) {
    const found = (u.credentials || []).find(c => c.id === response?.id);
    if (found) {
      matchedUser = u;
      matchedCredential = found;
      break;
    }
  }

  // Fail closed: an unknown passkey never signs anyone in.
  if (!matchedCredential?.publicKey || (issued.username && matchedUser.username !== issued.username)) {
    throw new Error('This passkey is not enrolled for Fuloozi. Sign in with your MPIN, then enroll it in Admin.');
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
        id: matchedCredential.id,
        publicKey: new Uint8Array(Buffer.from(matchedCredential.publicKey, 'base64')),
        counter: matchedCredential.counter || 0,
        transports: matchedCredential.transports,
      },
      requireUserVerification: false,
    });
  } catch (err) {
    console.error('Authentication verification error:', err);
    throw new Error('Passkey verification failed. Please try again or use your MPIN.');
  }

  if (!verification.verified) {
    throw new Error('Passkey verification failed. Please try again or use your MPIN.');
  }

  matchedCredential.counter = verification.authenticationInfo.newCounter;
  saveStore();

  return {
    verified: true,
    username: matchedUser.username,
    access_token: 'webauthn-token-' + Date.now(),
    refresh_token: 'webauthn-refresh-' + Date.now(),
  };
}

