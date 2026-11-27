import { getAIConfig, updateAIConfig, testAIConnection } from '../server/aiAgent.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const action = req.query?.action || req.url?.split('?')[0]?.split('/').pop();

  try {
    // 1. Get or update AI Configuration (/api/ai/config)
    if (action === 'config' || req.url?.includes('/config')) {
      if (req.method === 'GET') {
        const cfg = getAIConfig();
        return res.status(200).json({
          provider: cfg.provider,
          providerName: cfg.providerName,
          model: cfg.model,
          apiKey: cfg.apiKey ? '••••••••' : '',
          apiKeySet: cfg.apiKeySet,
          baseUrl: cfg.baseUrl,
          systemPrompt: cfg.systemPrompt,
          presets: cfg.presets,
        });
      }

      if (req.method === 'POST') {
        const body = req.body || {};
        const updated = updateAIConfig(body);
        return res.status(200).json({ ok: true, config: updated });
      }
    }

    // 2. Test AI Connection (/api/ai/test)
    if ((action === 'test' || req.url?.includes('/test')) && req.method === 'POST') {
      const body = req.body || {};
      const result = await testAIConnection(body);
      return res.status(200).json(result);
    }

    // Default status
    const cfg = getAIConfig();
    return res.status(200).json({
      status: 'active',
      provider: cfg.providerName,
      model: cfg.model,
      ready: cfg.apiKeySet,
    });
  } catch (err) {
    console.error('[AI API Error]:', err);
    return res.status(500).json({ ok: false, message: err.message || 'Internal AI service error' });
  }
}
