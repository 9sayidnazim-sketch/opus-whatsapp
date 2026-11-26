import {
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
} from '../server/webauthnService.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const originHeader = req.headers.origin || req.headers.referer;
  const action = req.query?.action || req.url?.split('?')[0]?.split('/').pop();

  try {
    if (action === 'registration-options' && req.method === 'POST') {
      const { username, displayName } = req.body || {};
      const options = await getRegistrationOptions({ username, displayName, originHeader });
      return res.status(200).json(options);
    }

    if (action === 'verify-registration' && req.method === 'POST') {
      const { username, response, expectedChallenge, deviceName } = req.body || {};
      const result = await verifyRegistration({
        username,
        response,
        expectedChallenge,
        originHeader,
        deviceName,
      });
      return res.status(200).json(result);
    }

    if (action === 'authentication-options' && req.method === 'POST') {
      const { username } = req.body || {};
      const options = await getAuthenticationOptions({ username, originHeader });
      return res.status(200).json(options);
    }

    if (action === 'verify-authentication' && req.method === 'POST') {
      const { username, response, expectedChallenge } = req.body || {};
      const result = await verifyAuthentication({
        username,
        response,
        expectedChallenge,
        originHeader,
      });
      return res.status(200).json(result);
    }

    return res.status(404).json({ error: 'Unknown WebAuthn endpoint' });
  } catch (err) {
    console.error('WebAuthn API error:', err);
    return res.status(400).json({ error: err.message || 'WebAuthn request failed' });
  }
}

