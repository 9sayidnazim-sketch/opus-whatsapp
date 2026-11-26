import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import {
  handleWhatsAppInbound,
  getEvolutionStatus,
  getEvolutionQrCode,
  pairEvolutionInstance,
  reconnectEvolutionInstance,
  disconnectEvolutionInstance,
  sendWhatsAppMessage,
  extractEvolutionMessage,
} from './server/evolutionAgent.js';
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

        // 7. Evolution API Status Endpoint
        if (req.url?.startsWith('/api/evolution/status') && req.method === 'GET') {
          const status = await getEvolutionStatus();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(status));
          return;
        }

        // 8. Evolution API QR / Connect Endpoint
        if ((req.url?.startsWith('/api/evolution/connect') || req.url?.startsWith('/api/evolution/qr')) && req.method === 'GET') {
          const qr = await getEvolutionQrCode();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(qr));
          return;
        }

        // 8b. Evolution API Phone Pairing Code Endpoint
        if (req.url?.startsWith('/api/evolution/pair') && req.method === 'POST') {
          const buffers = [];
          for await (const chunk of req) buffers.push(chunk);
          let body = {};
          try { body = JSON.parse(Buffer.concat(buffers).toString('utf-8') || '{}'); } catch {}
          const result = await pairEvolutionInstance({ phone: body.phone });
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
          return;
        }

        // 8c. Evolution API Reconnect Endpoint
        if (req.url?.startsWith('/api/evolution/reconnect') && req.method === 'POST') {
          const result = await reconnectEvolutionInstance();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
          return;
        }

        // 8d. Evolution API Disconnect Endpoint
        if (req.url?.startsWith('/api/evolution/disconnect') && req.method === 'POST') {
          const result = await disconnectEvolutionInstance();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
          return;
        }

        // 9. Evolution API Direct WhatsApp Send Endpoint
        if (req.url?.startsWith('/api/evolution/send') && req.method === 'POST') {
          const buffers = [];
          for await (const chunk of req) buffers.push(chunk);
          let body = {};
          try { body = JSON.parse(Buffer.concat(buffers).toString('utf-8') || '{}'); } catch {}
          const result = await sendWhatsAppMessage({ to: body.to, text: body.text });
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
          return;
        }

        // 10. WhatsApp Agent Simulation Endpoint
        if (req.url?.startsWith('/api/evolution/simulate') && req.method === 'POST') {
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

        // 11. WhatsApp Webhook Inbound Handler (/api/whatsapp)
        if (req.url?.startsWith('/api/whatsapp')) {
          if (req.method === 'GET') {
            const urlObj = new URL(req.url, 'http://localhost');
            const mode = urlObj.searchParams.get('hub.mode');
            const challenge = urlObj.searchParams.get('hub.challenge');
            if (mode === 'subscribe' && challenge) {
              res.setHeader('Content-Type', 'text/plain');
              res.end(challenge);
              return;
            }
            const status = await getEvolutionStatus();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(status));
            return;
          }

          if (req.method === 'POST') {
            const buffers = [];
            for await (const chunk of req) buffers.push(chunk);
            let event = {};
            try {
              event = JSON.parse(Buffer.concat(buffers).toString('utf-8') || '{}');
            } catch {}

            // Extract using Evolution API helper or fallback
            const parsed = extractEvolutionMessage(event);
            let sender = parsed?.sender;
            let text = parsed?.body;
            let contactName = parsed?.contactName;

            if (!sender) {
              if (event.text || event.prompt) {
                sender = event.sender || event.to || '15557969980';
                text = event.text || event.prompt || '';
                contactName = event.contactName || '';
              }
            }

            const result = await handleWhatsAppInbound({
              sender: sender || '15557969980',
              text: text || '',
              contactName: contactName || 'Household Member',
            });

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
            return;
          }
        }

        next();
      });
    },
  };
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
