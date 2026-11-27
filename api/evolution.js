import {
  evolutionConfig,
  updateEvolutionConfig,
  getEvolutionStatus,
  testEvolutionConnection,
  createEvolutionInstance,
  forceReconnectEvolutionInstance,
  getEvolutionQrCode,
  pairEvolutionInstance,
} from '../server/evolutionAgent.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const action = req.query?.action || req.url?.split('?')[0]?.split('/').pop();

  try {
    if (action === 'config' || req.url?.includes('/config')) {
      if (req.method === 'GET') {
        const cfg = evolutionConfig();
        return res.status(200).json({
          apiUrl: cfg.apiUrl,
          apiKey: cfg.apiKey ? '••••••••' : '',
          apiKeySet: Boolean(cfg.apiKey),
          instanceName: cfg.instanceName,
          instanceId: cfg.instanceId,
          webhookSecret: cfg.webhookSecret,
          whatsappNumber: cfg.whatsappNumber || '',
        });
      }
      if (req.method === 'POST') {
        const body = req.body || {};
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
        return res.status(200).json({ ok: true, config: updated, status });
      }
    }

    if (action === 'status' || req.url?.includes('/status')) {
      const status = await getEvolutionStatus();
      return res.status(200).json(status);
    }

    if (action === 'test' || req.url?.includes('/test')) {
      const body = req.body || {};
      const testResult = await testEvolutionConnection({
        apiUrl: body.apiUrl,
        apiKey: body.apiKey === '••••••••' ? undefined : body.apiKey,
      });
      return res.status(200).json(testResult);
    }

    if (action === 'qr' || action === 'connect' || req.url?.includes('/qr') || req.url?.includes('/connect')) {
      const qr = await getEvolutionQrCode();
      return res.status(200).json(qr);
    }

    if (action === 'pair' || req.url?.includes('/pair')) {
      const body = req.body || {};
      const pair = await pairEvolutionInstance(body.phoneNumber);
      return res.status(200).json(pair);
    }

    if (action === 'create' || req.url?.includes('/create')) {
      const body = req.body || {};
      const result = await createEvolutionInstance({
        name: body.name,
        instanceId: body.instanceId,
        token: body.token,
      });
      return res.status(200).json(result);
    }

    if (action === 'forcereconnect' || req.url?.includes('/forcereconnect')) {
      const result = await forceReconnectEvolutionInstance();
      return res.status(200).json(result);
    }

    // Default status
    const status = await getEvolutionStatus();
    return res.status(200).json(status);
  } catch (err) {
    console.error('[Evolution API Error]:', err);
    return res.status(500).json({ ok: false, error: err.message || 'Evolution service error' });
  }
}
