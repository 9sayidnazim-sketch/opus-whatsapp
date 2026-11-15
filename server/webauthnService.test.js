// Run with `npm test`. Drives api/webauthn.js with a software ES256 authenticator and
// the real @simplewebauthn/server + @supabase/supabase-js code. Supabase Auth and
// PostgREST are faked at the fetch layer, so nothing here touches a real project.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createHash, sign, randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isoCBOR, isoBase64URL } from '@simplewebauthn/server/helpers';
import handler from '../api/webauthn.js';

const ORIGIN = 'https://fuloozi.example';
const SUPABASE_URL = 'https://fake-project.supabase.test';
const SECRET = 'sb_secret_test_only';
const PUBLISHABLE = 'sb_publishable_test_only';

const b64 = (bytes) => isoBase64URL.fromBuffer(new Uint8Array(bytes));
const u16 = (n) => Buffer.from([(n >> 8) & 0xff, n & 0xff]);
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; };

/* ---------- software authenticator ---------- */
function softAuthenticator(origin = ORIGIN) {
  const rpIdHash = createHash('sha256').update(new URL(origin).hostname).digest();
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwk = publicKey.export({ format: 'jwk' });
  const rawId = randomBytes(32);
  const id = b64(rawId);
  const cose = isoCBOR.encode(new Map([
    [1, 2], [3, -7], [-1, 1],
    [-2, isoBase64URL.toBuffer(jwk.x)],
    [-3, isoBase64URL.toBuffer(jwk.y)],
  ]));
  let counter = 0;

  return {
    id,
    privateKey,
    register(challenge) {
      const authData = Buffer.concat([rpIdHash, Buffer.from([0x45]), u32(0), Buffer.alloc(16), u16(rawId.length), rawId, Buffer.from(cose)]);
      const clientDataJSON = Buffer.from(JSON.stringify({ type: 'webauthn.create', challenge, origin, crossOrigin: false }));
      const attestationObject = isoCBOR.encode(new Map([
        ['fmt', 'none'], ['attStmt', new Map()], ['authData', new Uint8Array(authData)],
      ]));
      return {
        id, rawId: id, type: 'public-key',
        response: { clientDataJSON: b64(clientDataJSON), attestationObject: b64(attestationObject), transports: ['internal'] },
        clientExtensionResults: {}, authenticatorAttachment: 'platform',
      };
    },
    // `signWith` lets a test forge a signature with a different key.
    assert(challenge, { signWith = privateKey } = {}) {
      counter += 1;
      const authData = Buffer.concat([rpIdHash, Buffer.from([0x05]), u32(counter)]);
      const clientDataJSON = Buffer.from(JSON.stringify({ type: 'webauthn.get', challenge, origin, crossOrigin: false }));
      const signature = sign('sha256', Buffer.concat([authData, createHash('sha256').update(clientDataJSON).digest()]), signWith);
      return {
        id, rawId: id, type: 'public-key',
        response: { clientDataJSON: b64(clientDataJSON), authenticatorData: b64(authData), signature: b64(signature) },
        clientExtensionResults: {}, authenticatorAttachment: 'platform',
      };
    },
  };
}

/* ---------- fake Supabase (Auth + PostgREST) ---------- */
const fake = {
  users: new Map(),     // id -> user
  tokens: new Map(),    // access token -> user id
  links: new Map(),     // hashed token -> user id (single use)
  tables: { opus_passkeys: [], opus_passkey_challenges: [] },
  log: [],
  reset() {
    this.users.clear(); this.tokens.clear(); this.links.clear();
    this.tables = { opus_passkeys: [], opus_passkey_challenges: [] };
    this.log = [];
  },
  addUser(username) {
    const id = randomUUID();
    const user = { id, aud: 'authenticated', role: 'authenticated', email: `${id}@opus-account.invalid`, user_metadata: { username, full_name: username }, app_metadata: {}, created_at: new Date().toISOString() };
    this.users.set(id, user);
    const token = this.mintToken(id);
    return { user, token };
  },
  mintToken(userId) {
    const part = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const token = `${part({ alg: 'ES256', typ: 'JWT' })}.${part({ sub: userId, session_id: randomUUID(), exp: Math.floor(Date.now() / 1000) + 3600 })}.${randomBytes(16).toString('base64url')}`;
    this.tokens.set(token, userId);
    return token;
  },
};

const json = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function matches(row, params) {
  for (const [key, raw] of params) {
    if (['select', 'order', 'limit', 'offset', 'columns'].includes(key)) continue;
    const [op, ...rest] = raw.split('.');
    const value = rest.join('.');
    if (op === 'eq' && String(row[key]) !== value) return false;
    if (op === 'lt' && !(Date.parse(row[key]) < Date.parse(value))) return false;
  }
  return true;
}

const pick = (row, select) => (!select || select === '*') ? { ...row } : Object.fromEntries(select.split(',').map(c => c.trim()).map(c => [c, row[c]]));

async function fakeFetch(input, init = {}) {
  const url = new URL(input instanceof Request ? input.url : String(input));
  const method = (init.method || 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  const body = init.body ? JSON.parse(init.body) : undefined;
  const apikey = headers.get('apikey');
  const auth = headers.get('authorization');
  fake.log.push({ method, path: url.pathname, body });
  if (!url.href.startsWith(SUPABASE_URL)) throw new Error(`Unexpected request to ${url.href}`);

  // --- Auth ---
  if (url.pathname === '/auth/v1/user' && method === 'GET') {
    const userId = fake.tokens.get(auth?.replace(/^Bearer /, ''));
    return userId ? json(200, fake.users.get(userId)) : json(403, { code: 403, error_code: 'bad_jwt', msg: 'invalid JWT' });
  }
  if (url.pathname.startsWith('/auth/v1/admin/')) {
    if (apikey !== SECRET) return json(401, { msg: 'This endpoint requires a valid secret key' });
    const userMatch = url.pathname.match(/^\/auth\/v1\/admin\/users\/([0-9a-f-]+)$/);
    if (userMatch && method === 'GET') {
      const user = fake.users.get(userMatch[1]);
      return user ? json(200, user) : json(404, { msg: 'User not found' });
    }
    if (url.pathname === '/auth/v1/admin/generate_link' && method === 'POST') {
      const user = [...fake.users.values()].find(u => u.email === body.email);
      if (!user || body.type !== 'magiclink') return json(422, { msg: 'Unable to generate link' });
      const hashed = randomBytes(28).toString('hex');
      fake.links.set(hashed, user.id);
      return json(200, { ...user, action_link: `${SUPABASE_URL}/auth/v1/verify?token=${hashed}&type=magiclink`, email_otp: '123456', hashed_token: hashed, redirect_to: ORIGIN, verification_type: 'magiclink' });
    }
  }
  if (url.pathname === '/auth/v1/verify' && method === 'POST') {
    const userId = fake.links.get(body?.token_hash);
    if (!userId || !['email', 'magiclink'].includes(body.type)) return json(403, { code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' });
    fake.links.delete(body.token_hash);
    const access_token = fake.mintToken(userId);
    return json(200, { access_token, refresh_token: randomBytes(12).toString('hex'), token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: fake.users.get(userId) });
  }

  // --- PostgREST: only the secret key may touch the passkey tables ---
  const tableMatch = url.pathname.match(/^\/rest\/v1\/(\w+)$/);
  if (tableMatch) {
    if (apikey !== SECRET || (auth && auth !== `Bearer ${SECRET}`)) {
      return json(401, { code: '42501', message: 'permission denied for table ' + tableMatch[1] });
    }
    const rows = fake.tables[tableMatch[1]];
    if (!rows) return json(404, { code: 'PGRST205', message: 'table not found' });
    const params = [...url.searchParams];
    const select = url.searchParams.get('select');
    const representation = (headers.get('prefer') || '').includes('return=representation');
    const single = (headers.get('accept') || '').includes('vnd.pgrst.object');
    const respond = (status, out) => {
      if (single) return out.length === 1 ? json(200, out[0]) : json(406, { code: 'PGRST116', message: 'not exactly one row' });
      return json(status, out);
    };
    if (method === 'GET') return respond(200, rows.filter(r => matches(r, params)).map(r => pick(r, select)));
    if (method === 'POST') {
      for (const record of [].concat(body)) {
        const pk = 'id' in record ? 'id' : 'challenge';
        if (rows.some(r => r[pk] === record[pk])) return json(409, { code: '23505', message: 'duplicate key value violates unique constraint' });
        rows.push({ created_at: new Date().toISOString(), ...record });
      }
      return representation ? json(201, [].concat(body)) : json(201);
    }
    if (method === 'DELETE') {
      const removed = rows.filter(r => matches(r, params));
      fake.tables[tableMatch[1]] = rows.filter(r => !removed.includes(r));
      return representation ? respond(200, removed.map(r => pick(r, select))) : json(204);
    }
    if (method === 'PATCH') {
      const updated = rows.filter(r => matches(r, params));
      updated.forEach(r => Object.assign(r, body));
      return representation ? respond(200, updated.map(r => pick(r, select))) : json(204);
    }
  }
  return json(404, { msg: `No fake for ${method} ${url.pathname}` });
}

/* ---------- helpers ---------- */
async function call(action, { token, body = {}, origin = ORIGIN } = {}) {
  const res = { statusCode: 0, body: null, setHeader() {}, status(code) { this.statusCode = code; return this; }, json(data) { this.body = data; return this; } };
  const headers = { origin };
  if (token) headers.authorization = `Bearer ${token}`;
  await handler({ method: 'POST', url: `/api/webauthn?action=${action}`, query: { action }, headers, body }, res);
  return { status: res.statusCode, body: res.body };
}

function useSupabase() {
  process.env.VITE_SUPABASE_URL = SUPABASE_URL;
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = PUBLISHABLE;
  process.env.SUPABASE_SECRET_KEY = SECRET;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.VERCEL;
}

function useDevMock() {
  for (const key of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'VERCEL']) delete process.env[key];
  process.env.WEBAUTHN_DEV_STORE_PATH = join(mkdtempSync(join(tmpdir(), 'fuloozi-webauthn-')), 'store.json');
}

async function enroll(token, device = softAuthenticator()) {
  const options = await call('registration-options', { token });
  assert.equal(options.status, 200, JSON.stringify(options.body));
  const verified = await call('verify-registration', { token, body: { response: device.register(options.body.challenge), expectedChallenge: options.body.challenge, deviceName: 'Test Mac' } });
  assert.equal(verified.status, 200, JSON.stringify(verified.body));
  return device;
}

async function signIn(device, { assertOptions, body = {}, token } = {}) {
  const options = await call('authentication-options', { token, body });
  assert.equal(options.status, 200, JSON.stringify(options.body));
  return call('verify-authentication', { token, body: { ...body, response: device.assert(options.body.challenge, assertOptions), expectedChallenge: options.body.challenge } });
}

const generateLinkCalls = () => fake.log.filter(entry => entry.path === '/auth/v1/admin/generate_link').length;

globalThis.fetch = fakeFetch;
const realConsoleError = console.error;
beforeEach(() => {
  fake.reset();
  useSupabase();
  console.error = () => {}; // the service logs every rejected attempt; keep test output readable
});

/* ---------- Supabase mode ---------- */
test('enrolment requires a Supabase session verified by Supabase Auth', async () => {
  assert.equal((await call('registration-options')).status, 401);
  assert.equal((await call('registration-options', { token: 'not-a-real-token' })).status, 401);
  assert.equal((await call('verify-registration', { body: { response: {}, expectedChallenge: 'x' } })).status, 401);
  assert.equal(fake.tables.opus_passkey_challenges.length, 0);
});

test('a passkey enrolled while signed in signs that same user in with a real session', async () => {
  const alice = fake.addUser('alice');
  const device = await enroll(alice.token);

  const [row] = fake.tables.opus_passkeys;
  assert.equal(row.owner_id, alice.user.id);
  assert.equal(row.id, device.id);
  assert.equal(row.device_name, 'Test Mac');

  const result = await signIn(device);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.username, 'alice');
  assert.equal(fake.tokens.get(result.body.access_token), alice.user.id, 'access token belongs to the enrolled user');
  assert.ok(result.body.refresh_token);
  assert.doesNotMatch(result.body.access_token, /^webauthn-token-/);
  assert.equal(fake.links.size, 0, 'the one-time link token was spent');
  assert.equal(fake.tables.opus_passkeys[0].counter, 1);
  assert.equal(fake.tables.opus_passkey_challenges.length, 0, 'every challenge was consumed');
});

test('the request body cannot choose which account a passkey is enrolled for', async () => {
  const alice = fake.addUser('alice');
  const options = await call('registration-options', { token: alice.token, body: { username: 'mallory', displayName: 'Mallory' } });
  assert.equal(options.status, 200);
  assert.equal(options.body.user.name, 'alice');
  assert.equal(fake.tables.opus_passkey_challenges[0].owner_id, alice.user.id);
});

test("another account cannot finish or reuse someone else's enrolment", async () => {
  const alice = fake.addUser('alice');
  const bob = fake.addUser('bob');
  const options = await call('registration-options', { token: alice.token });
  const device = softAuthenticator();
  const stolen = await call('verify-registration', { token: bob.token, body: { response: device.register(options.body.challenge), expectedChallenge: options.body.challenge } });
  assert.equal(stolen.status, 403);
  assert.equal(fake.tables.opus_passkeys.length, 0);

  const replay = await call('verify-registration', { token: alice.token, body: { response: device.register(options.body.challenge), expectedChallenge: options.body.challenge } });
  assert.equal(replay.status, 400, 'the challenge was single-use even though the first attempt failed');
});

test('unknown and forged passkeys are rejected and never get a session', async () => {
  const alice = fake.addUser('alice');
  const enrolled = await enroll(alice.token);

  const stranger = await signIn(softAuthenticator());
  assert.equal(stranger.status, 401);
  assert.match(stranger.body.error, /not enrolled/);

  const forged = await signIn(enrolled, { assertOptions: { signWith: softAuthenticator().privateKey } });
  assert.equal(forged.status, 401);
  assert.match(forged.body.error, /verification failed/);

  assert.equal(generateLinkCalls(), 0);
});

test('challenges are server-issued, single-use and tied to their ceremony', async () => {
  const alice = fake.addUser('alice');
  const device = await enroll(alice.token);

  const made_up = await call('verify-authentication', { body: { response: device.assert('bm90LWlzc3VlZC1ieS10aGUtc2VydmVy'), expectedChallenge: 'bm90LWlzc3VlZC1ieS10aGUtc2VydmVy' } });
  assert.equal(made_up.status, 400);

  const options = await call('authentication-options');
  const first = await call('verify-authentication', { body: { response: device.assert(options.body.challenge), expectedChallenge: options.body.challenge } });
  assert.equal(first.status, 200);
  const replay = await call('verify-authentication', { body: { response: device.assert(options.body.challenge), expectedChallenge: options.body.challenge } });
  assert.equal(replay.status, 400);

  const regOptions = await call('registration-options', { token: alice.token });
  const crossed = await call('verify-authentication', { body: { response: device.assert(regOptions.body.challenge), expectedChallenge: regOptions.body.challenge } });
  assert.equal(crossed.status, 400);

  fake.tables.opus_passkey_challenges.push({ challenge: 'ZXhwaXJlZC1jaGFsbGVuZ2UtdmFsdWU', ceremony: 'authentication', owner_id: null, expires_at: new Date(Date.now() - 1000).toISOString() });
  const expired = await call('verify-authentication', { body: { response: device.assert('ZXhwaXJlZC1jaGFsbGVuZ2UtdmFsdWU'), expectedChallenge: 'ZXhwaXJlZC1jaGFsbGVuZ2UtdmFsdWU' } });
  assert.equal(expired.status, 400);
});

test('a revoked passkey stops signing in', async () => {
  const alice = fake.addUser('alice');
  const device = await enroll(alice.token);
  fake.tables.opus_passkeys = []; // what RLS-scoped delete from the Admin page does
  assert.equal((await signIn(device)).status, 401);
});

test('sensor check verifies the signed-in user without minting a session', async () => {
  const alice = fake.addUser('alice');
  const bob = fake.addUser('bob');
  const device = await enroll(alice.token);

  const own = await signIn(device, { token: alice.token, body: { purpose: 'check' } });
  assert.equal(own.status, 200);
  assert.deepEqual(own.body, { verified: true, username: 'alice' });

  const other = await signIn(device, { token: bob.token, body: { purpose: 'check' } });
  assert.equal(other.status, 401);
  assert.equal((await call('authentication-options', { body: { purpose: 'check' } })).status, 401);
  assert.equal(generateLinkCalls(), 0);
});

test('a deployment missing the secret key fails closed instead of using the dev mock', async () => {
  delete process.env.SUPABASE_SECRET_KEY;
  assert.equal((await call('authentication-options')).status, 503);
  delete process.env.VITE_SUPABASE_URL;
  process.env.VERCEL = '1';
  assert.equal((await call('authentication-options')).status, 503);
});

test('unknown actions and methods are rejected', async () => {
  assert.equal((await call('delete-everything')).status, 404);
  assert.equal((await call('__proto__')).status, 404);
});

/* ---------- Dev mock ---------- */
test('dev mock (no Supabase) still enrols and signs in, and still fails closed', async () => {
  useDevMock();
  const device = softAuthenticator();
  const options = await call('registration-options', { body: { username: 'Owner' } });
  assert.equal(options.status, 200);
  const enrolled = await call('verify-registration', { body: { username: 'owner', response: device.register(options.body.challenge), expectedChallenge: options.body.challenge } });
  assert.equal(enrolled.status, 200, JSON.stringify(enrolled.body));

  const result = await signIn(device);
  assert.equal(result.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.username, 'owner');

  assert.equal((await signIn(softAuthenticator())).status, 401);
  assert.equal((await signIn(device, { assertOptions: { signWith: softAuthenticator().privateKey } })).status, 401);
  assert.equal(fake.log.length, 0, 'the dev mock never calls Supabase');
});

test.after(() => { console.error = realConsoleError; });
