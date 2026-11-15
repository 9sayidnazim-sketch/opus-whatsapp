import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';

// No test may reach Kapso: every outbound request is captured here instead.
const outbound = [];
globalThis.fetch = async (url, init = {}) => {
  outbound.push({ url: String(url), body: init.body ? JSON.parse(init.body) : null });
  return new Response(JSON.stringify({ messages: [{ id: 'wamid.test' }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

process.env.KAPSO_API_KEY = 'test-api-key';
process.env.KAPSO_PHONE_NUMBER_ID = '1000000000';

const { GET, POST, isValidKapsoSignature } = await import('../api/whatsapp.js');

const SECRET = `test-secret-${randomBytes(16).toString('hex')}`;
const ENDPOINT = 'https://fuloozi.test/api/whatsapp';

const sign = (body, secret = SECRET) => createHmac('sha256', secret).update(body).digest('hex');

const webhook = (body, headers = {}) => new Request(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body,
});

// Pretty-printed with non-ASCII text, so only the exact received bytes verify.
const inboundEvent = JSON.stringify({
  message: {
    id: 'wamid.inbound',
    type: 'text',
    text: { body: 'expense 45 lunch café' },
    kapso: { direction: 'inbound' },
  },
  conversation: { id: 'conv_1', phone_number: '+971500000001', contact_name: 'Test Member' },
  phone_number_id: '1000000000',
}, null, 2);

beforeEach(() => {
  process.env.KAPSO_WEBHOOK_SECRET = SECRET;
  outbound.length = 0;
});

test('a correctly signed Kapso event is processed and answered', async () => {
  const res = await POST(webhook(inboundEvent, { 'X-Webhook-Signature': sign(inboundEvent) }));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.action, 'expense_recorded');
  assert.equal(outbound.length, 1, 'one WhatsApp reply should be sent');
  assert.match(outbound[0].url, /\/messages$/);
  assert.equal(outbound[0].body.to, '971500000001');
});

test('an uppercase hex signature is accepted', async () => {
  const res = await POST(webhook(inboundEvent, { 'X-Webhook-Signature': sign(inboundEvent).toUpperCase() }));
  assert.equal(res.status, 200);
});

test('an unsigned event is rejected', async () => {
  const res = await POST(webhook(inboundEvent));
  assert.equal(res.status, 401);
  assert.equal(outbound.length, 0);
});

test('an event signed with the wrong secret is rejected', async () => {
  const res = await POST(webhook(inboundEvent, { 'X-Webhook-Signature': sign(inboundEvent, 'attacker-guess') }));
  assert.equal(res.status, 401);
  assert.equal(outbound.length, 0);
});

test('a tampered body under a genuine signature is rejected', async () => {
  const tampered = inboundEvent.replace('+971500000001', '+971500000999');
  const res = await POST(webhook(tampered, { 'X-Webhook-Signature': sign(inboundEvent) }));
  assert.equal(res.status, 401);
  assert.equal(outbound.length, 0);
});

test('a re-serialised body does not verify: the raw bytes are what count', async () => {
  const compact = JSON.stringify(JSON.parse(inboundEvent));
  const res = await POST(webhook(compact, { 'X-Webhook-Signature': sign(inboundEvent) }));
  assert.equal(res.status, 401);
  assert.equal(outbound.length, 0);
});

test('malformed signatures are rejected', async () => {
  const good = sign(inboundEvent);
  const malformed = [
    `sha256=${good}`,
    good.slice(0, 63),
    `${good}00`,
    good + good,
    `${good.slice(0, 62)}zz`,
    ' ',
  ];
  for (const signature of malformed) {
    const res = await POST(webhook(inboundEvent, { 'X-Webhook-Signature': signature }));
    assert.equal(res.status, 401, `signature ${JSON.stringify(signature)} should be rejected`);
  }
  assert.equal(outbound.length, 0);
});

test('every event is rejected when KAPSO_WEBHOOK_SECRET is not set', async () => {
  delete process.env.KAPSO_WEBHOOK_SECRET;
  const originalError = console.error;
  console.error = () => {};
  try {
    for (const headers of [{}, { 'X-Webhook-Signature': sign(inboundEvent) }]) {
      const res = await POST(webhook(inboundEvent, headers));
      assert.equal(res.status, 503);
    }
  } finally {
    console.error = originalError;
  }
  assert.equal(outbound.length, 0);
});

test('signed but malformed JSON gets a 400 without processing', async () => {
  const garbage = '{"message": ';
  const res = await POST(webhook(garbage, { 'X-Webhook-Signature': sign(garbage) }));
  assert.equal(res.status, 400);
  assert.equal(outbound.length, 0);
});

test('signed outbound echo events are ignored', async () => {
  const echo = JSON.stringify({
    message: { id: 'wamid.out', text: { body: 'hello' }, kapso: { direction: 'outbound' } },
    conversation: { phone_number: '+971500000001' },
  });
  const res = await POST(webhook(echo, { 'X-Webhook-Signature': sign(echo) }));
  assert.equal(res.status, 204);
  assert.equal(outbound.length, 0);
});

test('the verification challenge is echoed as inert plain text', async () => {
  const challenge = '<script>alert(document.domain)</script>';
  const url = `${ENDPOINT}?hub.mode=subscribe&hub.challenge=${encodeURIComponent(challenge)}`;
  const res = await GET(new Request(url));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(await res.text(), challenge);
});

test('isValidKapsoSignature checks length before comparing', () => {
  const body = Buffer.from('{}');
  assert.equal(isValidKapsoSignature(body, sign(body), SECRET), true);
  assert.equal(isValidKapsoSignature(body, sign(body).slice(0, 32), SECRET), false);
  assert.equal(isValidKapsoSignature(body, null, SECRET), false);
  assert.equal(isValidKapsoSignature(body, sign(body), ''), false);
});
