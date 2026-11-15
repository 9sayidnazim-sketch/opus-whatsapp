import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

function fulooziDevApi() {
  return {
    name: 'fuloozi-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
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

        if (req.url?.startsWith('/api/assistant') && req.method === 'POST') {
          const buffers = [];
          for await (const chunk of req) buffers.push(chunk);
          let body = {};
          try {
            body = JSON.parse(Buffer.concat(buffers).toString('utf-8') || '{}');
          } catch {}
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

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), fulooziDevApi()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});

