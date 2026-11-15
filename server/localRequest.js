/*
 * Guard for dev-server endpoints that act as the business WhatsApp number
 * (/api/kapso/send, /api/kapso/simulate).
 *
 * vite.config.js listens on every interface (`host: true`) and accepts any Host
 * header (`allowedHosts: true`), and plugin middleware runs before Vite's own
 * CORS and host checks. So these endpoints check for themselves that a request
 * was made on this machine, to this machine, by this app.
 */

const LOOPBACK_IPV4 = /^127(?:\.\d{1,3}){3}$/;
const PROXY_HEADERS = ['forwarded', 'x-forwarded-for', 'x-forwarded-host', 'x-real-ip', 'cf-connecting-ip'];

function isLoopbackAddress(address) {
  if (typeof address !== 'string') return false;
  const ip = address.replace(/^::ffff:/i, '');
  return ip === '::1' || LOOPBACK_IPV4.test(ip);
}

function loopbackHostname(host) {
  let hostname;
  try {
    hostname = new URL(`http://${host}`).hostname;
  } catch {
    return false;
  }
  return hostname === 'localhost' || hostname === '[::1]' || LOOPBACK_IPV4.test(hostname);
}

export function isLocalRequest(req) {
  // 1. The connection comes from this machine, not another device on the network.
  if (!isLoopbackAddress(req.socket?.remoteAddress)) return false;

  // 2. It was not relayed by a tunnel or proxy running on this machine.
  if (PROXY_HEADERS.some((name) => req.headers[name] !== undefined)) return false;

  // 3. It is addressed to a loopback name. This rules out DNS rebinding and
  //    tunnels that pass their public hostname through.
  const host = String(req.headers.host || '').toLowerCase();
  if (!loopbackHostname(host)) return false;

  // 4. A browser request must come from this app's own origin, not from another
  //    site or local port open in the same browser. Browsers attach Origin to
  //    every POST; curl and scripts on this machine send none.
  const origin = req.headers.origin;
  if (origin !== undefined) {
    try {
      if (new URL(origin).host.toLowerCase() !== host) return false;
    } catch {
      return false;
    }
  }

  return true;
}
