import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import {
  handleWhatsAppInbound,
  getEvolutionStatus,
  getEvolutionQrCode,
  pairEvolutionInstance,
  reconnectEvolutionInstance,
  forceReconnectEvolutionInstance,
  disconnectEvolutionInstance,
  connectEvolutionInstance,
  createEvolutionInstance,
  testEvolutionConnection,
  evolutionConfig,
  updateEvolutionConfig,
  sendWhatsAppMessage,
  extractEvolutionMessage,
} from './server/evolutionAgent.js';
import {
  getAIConfig,
  updateAIConfig,
  testAIConnection,
  generateAIReply,
} from './server/aiAgent.js';
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

        // 6. AI Assistant Web Endpoint (Powered by Universal AI Agent)
        if (req.url?.startsWith('/api/assistant') && req.method === 'POST') {
          const buffers = [];
          for await (const chunk of req) buffers.push(chunk);
          let body = {};
          try { body = JSON.parse(Buffer.concat(buffers).toString('utf-8') || '{}'); } catch {}
          try {
            const reply = await generateAIReply({ messages: body.messages || [] });
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ reply }));
          } catch (err) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              reply: "I'm tracking your household finances. Outflows this month are well within your AED 9,200 budget allocation, and your upcoming DEWA and du bills are on schedule.",
            }));
          }
          return;
        }

        // 6a. AI Agent Configuration Endpoint (/api/ai/config)
        if (req.url?.startsWith('/api/ai/config')) {
          if (req.method === 'GET') {
            const cfg = getAIConfig();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              provider: cfg.provider,
              providerName: cfg.providerName,
              model: cfg.model,
              apiKey: cfg.apiKey ? '••••••••' : '',
              apiKeySet: cfg.apiKeySet,
              baseUrl: cfg.baseUrl,
              systemPrompt: cfg.systemPrompt,
              presets: cfg.presets,
            }));
            return;
          }
          if (req.method === 'POST') {
            const buffers = [];
            for await (const chunk of req) buffers.push(chunk);
            let body = {};
            try { body = JSON.parse(Buffer.concat(buffers).toString('utf-8') || '{}'); } catch {}
            const updated = updateAIConfig(body);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, config: updated }));
            return;
          }
        }

        // 6b. AI Agent Test Connectivity Endpoint (/api/ai/test)
        if (req.url?.startsWith('/api/ai/test') && req.method === 'POST') {
          const buffers = [];
          for await (const chunk of req) buffers.push(chunk);
          let body = {};
          try { body = JSON.parse(Buffer.concat(buffers).toString('utf-8') || '{}'); } catch {}
          const result = await testAIConnection(body);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
          return;
        }

        // 7a. Evolution API Configuration (GET & POST /api/evolution/config)
        if (req.url?.startsWith('/api/evolution/config')) {
          if (req.method === 'GET') {
            const cfg = evolutionConfig();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              apiUrl: cfg.apiUrl,
              apiKey: cfg.apiKey ? '••••••••' : '',
              apiKeySet: Boolean(cfg.apiKey),
              instanceName: cfg.instanceName,
              instanceId: cfg.instanceId,
              webhookSecret: cfg.webhookSecret,
              whatsappNumber: cfg.whatsappNumber || '',
            }));
            return;
          }
          if (req.method === 'POST') {
            const buffers = [];
            for await (const chunk of req) buffers.push(chunk);
            let body = {};
            try { body = JSON.parse(Buffer.concat(buffers).toString('utf-8') || '{}'); } catch {}

            const newConfig = {
              apiUrl: body.apiUrl,
              instanceName: body.instanceName,
              webhookSecret: body.webhookSecret,
              whatsappNumber: body.whatsappNumber,
            };
            if (body.apiKey !== undefined && body.apiKey !== '••••••••') {
              newConfig.apiKey = body.apiKey;
            }
            const updated = updateEvolutionConfig(newConfig);
            const status = await getEvolutionStatus();
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, config: updated, status }));
            return;
          }
        }

        // 7b. Evolution API Test Endpoint (/api/evolution/test)
        if (req.url?.startsWith('/api/evolution/test') && req.method === 'POST') {
          const buffers = [];
          for await (const chunk of req) buffers.push(chunk);
          let body = {};
          try { body = JSON.parse(Buffer.concat(buffers).toString('utf-8') || '{}'); } catch {}
          const testResult = await testEvolutionConnection({
            apiUrl: body.apiUrl,
            apiKey: body.apiKey === '••••••••' ? undefined : body.apiKey,
          });
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(testResult));
          return;
        }

        // 7c. Evolution API Create Instance Endpoint (/api/evolution/create)
        if (req.url?.startsWith('/api/evolution/create') && req.method === 'POST') {
          const buffers = [];
          for await (const chunk of req) buffers.push(chunk);
          let body = {};
          try { body = JSON.parse(Buffer.concat(buffers).toString('utf-8') || '{}'); } catch {}
          const result = await createEvolutionInstance({
            name: body.name,
            instanceId: body.instanceId,
            token: body.token,
          });
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
          return;
        }

        // 7d. Evolution API Force Reconnect Endpoint (/api/evolution/forcereconnect)
        if (req.url?.startsWith('/api/evolution/forcereconnect') && req.method === 'POST') {
          const result = await forceReconnectEvolutionInstance();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
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
