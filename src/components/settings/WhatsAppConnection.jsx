import { useState, useEffect } from 'react';
import {
  MessageSquare,
  ExternalLink,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Copy,
  QrCode,
  RefreshCw,
  Sparkles,
  Server,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getWhatsAppConnectionLink, openWhatsAppChat } from '@/api/client';

export default function WhatsAppConnection({ whatsappURL }) {
  const [evolutionInfo, setEvolutionInfo] = useState({ connected: false, loading: true });
  const [openingWhatsApp, setOpeningWhatsApp] = useState(false);
  const [qr, setQr] = useState(null);
  const [qrPending, setQrPending] = useState(false);
  const botNumber = (whatsappURL || '').replace(/^https:\/\/wa\.me\//, '');

  const fetchStatus = () => {
    setEvolutionInfo((prev) => ({ ...prev, loading: true }));
    fetch(import.meta.env.DEV ? '/api/evolution/status' : '/api/whatsapp')
      .then((r) => {
        if (!r.ok) throw new Error('Status unavailable');
        return r.json();
      })
      .then((data) => {
        setEvolutionInfo({
          ...data,
          connected: Boolean(data.connected),
          instanceName: data.instanceName || 'fuloozi',
          apiUrl: data.apiUrl || 'http://localhost:8080',
          loading: false,
        });
      })
      .catch(() => {
        setEvolutionInfo({
          connected: false,
          error: 'Could not reach the Evolution API status service',
          loading: false,
        });
      });
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const statusLabel = evolutionInfo.loading
    ? 'Checking...'
    : evolutionInfo.connected
      ? 'Instance connected'
      : evolutionInfo.state === 'connecting'
        ? 'Connecting...'
        : 'Instance offline';

  async function handleOpen() {
    setOpeningWhatsApp(true);
    try {
      await openWhatsAppChat();
    } catch {
      toast.error('Could not prepare your WhatsApp link. Try again or use the QR code.');
    } finally {
      setOpeningWhatsApp(false);
    }
  }

  async function handleCopy() {
    try {
      const { url } = await getWhatsAppConnectionLink();
      await navigator.clipboard.writeText(url);
      toast.success('WhatsApp connection link copied');
    } catch {
      toast.error('Could not copy your WhatsApp link. Use Open in WhatsApp instead.');
    }
  }

  async function handleQr() {
    if (qr) {
      setQr(null);
      return;
    }
    setQrPending(true);

    // 1. Try Evolution API live QR code endpoint first
    try {
      const evoRes = await fetch('/api/evolution/connect');
      if (evoRes.ok) {
        const evoData = await evoRes.json();
        if (evoData.base64) {
          setQr({
            image: evoData.base64.startsWith('data:') ? evoData.base64 : `data:image/png;base64,${evoData.base64}`,
            source: 'evolution',
            pairingCode: evoData.pairingCode,
          });
          setQrPending(false);
          return;
        }
      }
    } catch {
      // Fallback to wa.me pairing code QR
    }

    // 2. Fallback: Generate QR code from pairing URL
    try {
      const { url, message } = await getWhatsAppConnectionLink();
      const { default: QRCode } = await import('qrcode');
      const image = await QRCode.toDataURL(url, { width: 240, margin: 2 });
      setQr({ url, message, image, source: 'link' });
    } catch {
      toast.error('Could not generate your WhatsApp QR code.');
    } finally {
      setQrPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-[#25D366]/15 text-[#25D366] shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-base text-foreground">WhatsApp Finance Bot</h2>
              <span
                className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                  evolutionInfo.loading
                    ? 'bg-secondary text-muted-foreground border-border'
                    : evolutionInfo.connected
                      ? 'bg-[#25D366]/15 text-[#25D366] border-[#25D366]/30'
                      : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                }`}
              >
                {evolutionInfo.loading ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : evolutionInfo.connected ? (
                  <CheckCircle className="w-3 h-3" />
                ) : (
                  <AlertCircle className="w-3 h-3" />
                )}
                {statusLabel}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Evolution API Gateway · Instance:{' '}
              <strong className="text-foreground">{evolutionInfo.instanceName || 'fuloozi'}</strong>
              {evolutionInfo.apiUrl && (
                <>
                  {' '}· Server: <span className="font-mono text-muted-foreground text-[11px]">{evolutionInfo.apiUrl}</span>
                </>
              )}
              {evolutionInfo.display_phone_number && (
                <>
                  {' '}· Number: <strong className="text-foreground">+{evolutionInfo.display_phone_number.replace(/^\+/, '')}</strong>
                </>
              )}
            </p>
            {!evolutionInfo.loading && !evolutionInfo.connected && evolutionInfo.error && (
              <p role="alert" className="mt-1 text-xs text-rose-400">
                Evolution API: {evolutionInfo.error}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpen}
            disabled={openingWhatsApp}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-black text-xs font-semibold shadow-sm transition-all"
          >
            <Smartphone className="w-4 h-4" />
            {openingWhatsApp ? 'Opening WhatsApp…' : 'Open in WhatsApp'}
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </button>

          <button
            type="button"
            onClick={handleQr}
            disabled={qrPending}
            className="p-2.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
            title="Scan QR Code to Connect"
          >
            <QrCode className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="p-2.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
            title="Copy connection link"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={fetchStatus}
            disabled={evolutionInfo.loading}
            className="p-2.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
            title="Refresh Status"
          >
            <RefreshCw className={`w-4 h-4 ${evolutionInfo.loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* QR Code Expansion */}
      {qr && (
        <div className="p-5 rounded-xl border border-border/70 bg-secondary/30 flex flex-col sm:flex-row items-center gap-6 animate-in fade-in duration-200">
          <div className="p-3 bg-white rounded-xl shadow-md border border-border shrink-0">
            <img
              src={qr.image}
              alt="Scan to Connect WhatsApp"
              className="w-48 h-48 rounded-lg object-contain"
              loading="lazy"
            />
          </div>
          <div className="space-y-3 text-center sm:text-left">
            <div>
              <h3 className="font-semibold text-sm text-foreground">
                {qr.source === 'evolution'
                  ? 'Scan with WhatsApp (Linked Devices)'
                  : 'Scan with Your Phone Camera'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                {qr.source === 'evolution'
                  ? 'Open WhatsApp on your phone → Settings / Linked Devices → Link a Device, and scan this QR code to authenticate the instance.'
                  : 'Open your phone camera to start chatting with the Fuloozi finance ledger bot.'}
              </p>
            </div>
            {qr.pairingCode && (
              <div className="p-2.5 rounded-lg bg-card border border-border text-xs text-foreground font-mono">
                Pairing code: <strong className="text-[#B5F13E]">{qr.pairingCode}</strong>
              </div>
            )}
            {qr.url && (
              <div className="p-3 rounded-lg bg-card border border-border/80 text-xs text-muted-foreground font-mono select-all break-all">
                {qr.url}
              </div>
            )}
            {qr.message && (
              <p className="text-[11px] text-[#B5F13E]">Pre-filled message: {qr.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Quick Guide to Supported Commands */}
      <div className="p-4 rounded-xl border border-border/60 bg-secondary/20 space-y-3">
        <p className="text-xs font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#B5F13E]" />
          Instant Commands Supported on WhatsApp
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
          <div className="p-2.5 rounded-lg bg-card border border-border/60">
            <span className="font-mono text-[#B5F13E]">expense 45 groceries</span>
            <p className="text-muted-foreground text-[11px] mt-0.5">
              Logs an expense into your ledger automatically with AED currency.
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-card border border-border/60">
            <span className="font-mono text-[#B5F13E]">income 2500 consulting</span>
            <p className="text-muted-foreground text-[11px] mt-0.5">
              Records inflow and updates household net savings cushion live.
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-card border border-border/60">
            <span className="font-mono text-[#B5F13E]">bills</span>
            <p className="text-muted-foreground text-[11px] mt-0.5">
              Queries upcoming utility and telecom due dates (DEWA, du, rent).
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-card border border-border/60">
            <span className="font-mono text-[#B5F13E]">summary</span>
            <p className="text-muted-foreground text-[11px] mt-0.5">
              Returns monthly budget utilization, total inflows, and current savings rate.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
