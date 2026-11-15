import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { GET as whatsappWebhookGet, POST as whatsappWebhookPost } from './api/whatsapp.js';
import { isLocalRequest } from './server/localRequest.js';
import { handleWhatsAppInbound, getKapsoStatus, sendWhatsAppMessage } from './server/kapsoAgent.js';
import {
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
} from './server/webauthnService.js';

function fulooziDevApi() {
  return {
    name: 'fuloozi-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // 1. Account authentication endpoint
        if (req.url?.startsWith('/api/account') && req.method === 'POST') {
          const buffers = [];
          for await (const chunk of req) buffers.push(chunk);
          let body = {};
          try {
            body = JSON.parse(Buffer.concat(buffers).toString('utf-8') || '{}');
          } catch {}
          const handle = (body.name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '') || 'fuloozi';
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            username: handle,
            access_token: 'dev-token-' + Date.now(),
            refresh_token: 'dev-refresh-' + Date.now(),
          }));
          return;
        }

        // 2. WebAuthn Registration Options (/api/webauthn/registration-options)
        if (req.url?.startsWith('/api/webauthn/registration-options') && req.method === 'POST') {
          const buffers = [];
          for await (const chunk of req) buffers.push(chunk);
          let body = {};
          try { body = JSON.parse(Buffer.concat(buffers).toString('utf-8') || '{}'); } catch {}
          try {
            const options = await getRegistrationOptions({
              username: body.username,
              displayName: body.displayName,
              originHeader: req.headers.origin || req.headers.referer,
            });
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(options));
          } catch (err) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        // 3. WebAuthn Verify Registration (/api/webauthn/verify-registration)
        if (req.url?.startsWith('/api/webauthn/verify-registration') && req.method === 'POST') {
          const buffers = [];
          for await (const chunk of req) buffers.push(chunk);
          let body = {};
          try { body = JSON.parse(Buffer.concat(buffers).toString('utf-8') || '{}'); } catch {}
          try {
            const result = await verifyRegistration({
              username: body.username,
              response: body.response,
              expectedChallenge: body.expectedChallenge,
              deviceName: body.deviceName,
              originHeader: req.headers.origin || req.headers.referer,
            });
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (err) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        // 4. WebAuthn Authentication Options (/api/webauthn/authentication-options)
        if (req.url?.startsWith('/api/webauthn/authentication-options') && req.method === 'POST') {
          const buffers = [];
          for await (const chunk of req) buffers.push(chunk);
          let body = {};
          try { body = JSON.parse(Buffer.concat(buffers).toString('utf-8') || '{}'); } catch {}
          try {
            const options = await getAuthenticationOptions({
              username: body.username,
              originHeader: req.headers.origin || req.headers.referer,
            });
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(options));
          } catch (err) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        // 5. WebAuthn Verify Authentication (/api/webauthn/verify-authentication)
        if (req.url?.startsWith('/api/webauthn/verify-authentication') && req.method === 'POST') {
          const buffers = [];
          for await (const chunk of req) buffers.push(chunk);
          let body = {};
          try { body = JSON.parse(Buffer.concat(buffers).toString('utf-8') || '{}'); } catch {}
          try {
            const result = await verifyAuthentication({
              username: body.username,
              response: body.response,
              expectedChallenge: body.expectedChallenge,
              originHeader: req.headers.origin || req.headers.referer,
            });
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (err) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
          return;
        }

        // 6. AI Assistant Web Endpoint
        if (req.url?.startsWith('/api/assistant') && req.method === 'POST') {
          const buffers = [];
          for await (const chunk of req) buffers.push(chunk);
          let body = {};
          try { body = JSON.parse(Buffer.concat(buffers).toString('utf-8') || '{}'); } catch {}
          const userMsg = (body.messages?.at(-1)?.content || '').toLowerCase();
          let reply = "I'm your Fuloozi finance assistant. You're tracking well on your household budget this month! Need help reviewing upcoming bills or setting a savings goal?";
          if (userMsg.includes('bill') || userMsg.includes('dewa') || userMsg.includes('utility')) {
            reply = "Your upcoming bills include DEWA (AED 680) due in 5 days, and du Home Internet (AED 389) due in 12 days. Both are accounted for in your monthly bills schedule.";
          } else if (userMsg.includes('budget') || userMsg.includes('spend')) {
            reply = "Your household expenses stand at AED 1,864 against a monthly limit of AED 9,200 (~20% utilized). Groceries and fuel are well within planned allocations.";
          } else if (userMsg.includes('goal') || userMsg.includes('save') || userMsg.includes('holiday')) {
            reply = "You're at 54% of your Family Summer Holiday goal (AED 6,500 of AED 12,000) and 60% of your Emergency Reserve (AED 18,000 of AED 30,000). Keep going!";
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ reply }));
          return;
        }

        // 7. Kapso Agent Status Endpoint
        if (req.url?.startsWith('/api/kapso/status') && req.method === 'GET') {
          const status = await getKapsoStatus();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(status));
          return;
        }

        // 8. Kapso Direct WhatsApp Send Endpoint (this computer only)
        if (req.url?.startsWith('/api/kapso/send') && req.method === 'POST') {
          if (!isLocalRequest(req)) return refuseNonLocal(req, res);
          const buffers = [];
          for await (const chunk of req) buffers.push(chunk);
          let body = {};
          try { body = JSON.parse(Buffer.concat(buffers).toString('utf-8') || '{}'); } catch {}
          const result = await sendWhatsAppMessage({ to: body.to, text: body.text });
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
          return;
        }

        // 9. Kapso Agent Simulation Endpoint (this computer only; it replies over WhatsApp)
        if (req.url?.startsWith('/api/kapso/simulate') && req.method === 'POST') {
          if (!isLocalRequest(req)) return refuseNonLocal(req, res);
          const buffers = [];
          for await (const chunk of req) buffers.push(chunk);
          let body = {};
          try { body = JSON.parse(Buffer.concat(buffers).toString('utf-8') || '{}'); } catch {}
          const result = await handleWhatsAppInbound({
            sender: body.sender || '15557969980',
            text: body.text || '',
            contactName: body.contactName || 'Household Member',
          });
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
          return;
        }

        // 10. WhatsApp webhook (/api/whatsapp): the production handler itself, so
        //     dev enforces the same Kapso signature check. Unsigned events are
        //     refused; use /api/kapso/simulate for local testing.
        if (req.url?.startsWith('/api/whatsapp') && (req.method === 'GET' || req.method === 'POST')) {
          await runWebHandler(req.method === 'GET' ? whatsappWebhookGet : whatsappWebhookPost, req, res);
          return;
        }

        next();
      });
    },
  };
}

// Endpoints that send as the business WhatsApp number answer only requests
// made on this computer (see server/localRequest.js).
function refuseNonLocal(req, res) {
  res.statusCode = 403;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    ok: false,
    error: `This tester only works on the computer running the dev server. Open http://localhost:${req.socket.localPort} there.`,
  }));
}

// Runs a Web-standard handler from api/ against a Node request, so the dev
// server and the Vercel deployment share one implementation.
async function runWebHandler(handler, req, res) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    for (const item of [].concat(value ?? [])) headers.append(name, item);
  }
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const response = await handler(new Request(new URL(req.url, 'http://localhost'), {
    method: req.method,
    headers,
    body: hasBody ? Buffer.concat(chunks) : undefined,
  }));
  res.statusCode = response.status;
  response.headers.forEach((value, name) => res.setHeader(name, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}

export default defineConfig(({ mode }) => {
  // Vite only exposes .env files to client code (import.meta.env). The dev API
  // middleware above runs in Node, so copy .env/.env.local values into
  // process.env for it. Variables already set in the shell keep priority.
  const fileEnv = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '');
  for (const [key, value] of Object.entries(fileEnv)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }

  return {
    plugins: [react(), fulooziDevApi()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      port: 5173,
      host: true,
      allowedHosts: true,
    },
  };
});
