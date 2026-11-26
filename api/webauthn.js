export default function handler(_req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(503).json({ error: 'Device passkeys are unavailable. Sign in with your MPIN.' });
}
