import { handleWebAuthnRequest } from '../server/webauthnService.js';

// /api/webauthn/:action is rewritten to /api/webauthn?action=:action in vercel.json.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const action = req.query?.action || req.url?.split('?')[0]?.split('/').pop();
  const { status, body } = await handleWebAuthnRequest({
    action,
    method: req.method,
    body: req.body,
    headers: req.headers,
  });
  return res.status(status).json(body);
}
