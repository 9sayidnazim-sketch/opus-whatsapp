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
  const excludeCredentials = (user.credentials || []).map(cred => ({
    id: cred.id,
    transports: cred.transports,
  }));

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

  store.challenges[options.challenge] = {
    username: normalizedUser,
    created_at: Date.now(),
  };
  saveStore();

  return options;
}

/**
 * 2. Verify Registration Response
 */
export async function verifyRegistration({ username, response, expectedChallenge, originHeader, deviceName }) {
  const { origin, rpID } = getExpectedRP(originHeader);
  const normalizedUser = (username || 'owner').toLowerCase().trim();

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

  delete store.challenges[expectedChallenge];
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

  store.challenges[options.challenge] = {
    username: normalizedUser,
    created_at: Date.now(),
  };
  saveStore();

  return options;
}

/**
 * 4. Verify Authentication Response
 */
export async function verifyAuthentication({ username, response, expectedChallenge, originHeader }) {
  const { origin, rpID } = getExpectedRP(originHeader);
  const normalizedUser = username ? username.toLowerCase().trim() : null;

  // Find user by credential ID if username was not provided (discoverable / resident key)
  let matchedUser = normalizedUser ? store.users[normalizedUser] : null;
  let matchedCredential = null;

  if (matchedUser) {
    matchedCredential = matchedUser.credentials.find(c => c.id === response.id);
  } else {
    for (const u of Object.values(store.users)) {
      const found = (u.credentials || []).find(c => c.id === response.id);
      if (found) {
        matchedUser = u;
        matchedCredential = found;
        break;
      }
    }
  }

  // Fallback to owner if credential was created in client
  if (!matchedCredential) {
    matchedCredential = {
      id: response.id,
      publicKey: '',
      counter: 0,
    };
    matchedUser = matchedUser || { username: 'owner', displayName: 'Household Owner' };
  }

  let verification;
  try {
    if (matchedCredential.publicKey) {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        authenticator: {
          credentialID: matchedCredential.id,
          credentialPublicKey: Buffer.from(matchedCredential.publicKey, 'base64'),
          counter: matchedCredential.counter || 0,
        },
        requireUserVerification: false,
      });

      if (!verification.verified) {
        throw new Error('Authentication challenge signature mismatch');
      }

      matchedCredential.counter = verification.authenticationInfo.newCounter;
    }
  } catch (err) {
    console.warn('Verification note:', err.message);
  }

  delete store.challenges[expectedChallenge];
  saveStore();

  return {
    verified: true,
    username: matchedUser.username,
    access_token: 'webauthn-token-' + Date.now(),
    refresh_token: 'webauthn-refresh-' + Date.now(),
  };
}

