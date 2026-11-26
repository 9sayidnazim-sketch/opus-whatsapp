import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  QrCode,
  RefreshCw,
  Send,
  Power,
  RotateCcw,
  Sparkles,
  KeyRound,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function WhatsAppConnection() {
  const [status, setStatus] = useState({
    connected: false,
    loading: true,
    state: 'checking',
    instanceName: 'fuloozi',
    apiUrl: 'http://localhost:8080',
    display_phone_number: '',
    error: null,
  });

  const [activePairMethod, setActivePairMethod] = useState('qr'); // 'qr' | 'pairCode'
  const [qrCodeData, setQrCodeData] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Phone pairing state
  const [pairPhone, setPairPhone] = useState('');
  const [pairingCodeResult, setPairingCodeResult] = useState(null);
  const [pairLoading, setPairLoading] = useState(false);

  // Direct send state
  const [sendPhone, setSendPhone] = useState('');
  const [sendText, setSendText] = useState('');
  const [sending, setSending] = useState(false);
  const [lastSentResult, setLastSentResult] = useState(null);

  // Simulation state
  const [simText, setSimText] = useState('expense 45 groceries');
  const [simulating, setSimulating] = useState(false);
  const [simReply, setSimReply] = useState(null);

  // Reconnect / Disconnect loading
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStatus = async () => {
    setStatus((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch('/api/evolution/status');
      const data = await res.json();
      setStatus({
        connected: Boolean(data.connected),
        loading: false,
        state: data.state || (data.connected ? 'open' : 'close'),
        instanceName: data.instanceName || 'fuloozi',
        apiUrl: data.apiUrl || 'http://localhost:8080',
        display_phone_number: data.display_phone_number || '',
        error: data.error || null,
      });
      if (data.connected && data.display_phone_number && !sendPhone) {
        setSendPhone(data.display_phone_number.replace(/\D/g, ''));
      }
    } catch (err) {
      setStatus({
        connected: false,
        loading: false,
        state: 'error',
        instanceName: 'fuloozi',
        apiUrl: 'http://localhost:8080',
        display_phone_number: '',
        error: 'Could not connect to Evolution API server',
      });
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Fetch QR Code from Evolution-Go
  const fetchQrCode = async () => {
    setQrLoading(true);
    setQrCodeData(null);
    try {
      const res = await fetch('/api/evolution/qr');
      const data = await res.json();
      if (data.ok && data.base64) {
        setQrCodeData(data.base64);
        toast.success('Live QR code loaded from Evolution API');
      } else {
        toast.error(data.error || 'Failed to retrieve QR code');
      }
    } catch {
      toast.error('Network error requesting Evolution QR code');
    } finally {
      setQrLoading(false);
    }
  };

  // Request phone pairing code
  const handleRequestPairCode = async (e) => {
    e.preventDefault();
    if (!pairPhone.trim()) {
      toast.error('Enter your phone number with country code (e.g. 971501234567)');
      return;
    }
    setPairLoading(true);
    setPairingCodeResult(null);
    try {
      const res = await fetch('/api/evolution/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: pairPhone }),
      });
      const data = await res.json();
      if (data.ok && data.code) {
        setPairingCodeResult(data.code);
        toast.success('Pairing code generated! Enter it in WhatsApp.');
      } else {
        toast.error(data.error || 'Could not generate pairing code');
      }
    } catch {
      toast.error('Failed to communicate with Evolution API');
    } finally {
      setPairLoading(false);
    }
  };

  // Force reconnect instance
  const handleReconnect = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/evolution/reconnect', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        toast.success('Reconnect command dispatched to instance');
        setTimeout(fetchStatus, 2000);
      } else {
        toast.error(data.error || 'Reconnect request failed');
      }
    } catch {
      toast.error('Failed to reach Evolution API');
    } finally {
      setActionLoading(false);
    }
  };

  // Disconnect instance
  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect this WhatsApp instance from Evolution API?')) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/evolution/disconnect', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        toast.success('Instance disconnected');
        setTimeout(fetchStatus, 1500);
      } else {
        toast.error(data.error || 'Disconnect request failed');
      }
    } catch {
      toast.error('Failed to reach Evolution API');
    } finally {
      setActionLoading(false);
    }
  };

  // Send direct WhatsApp text message via POST /send/text
  const handleSendText = async (e) => {
    e.preventDefault();
    if (!sendPhone || !sendText) {
      toast.error('Phone number and message text are required');
      return;
    }
    setSending(true);
    setLastSentResult(null);
    try {
      const res = await fetch('/api/evolution/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: sendPhone, text: sendText }),
      });
      const data = await res.json();
      setLastSentResult(data);
      if (data.ok) {
        toast.success('Message sent through Evolution API!');
        setSendText('');
      } else {
        toast.error(data.error || 'Failed to send message');
      }
    } catch (err) {
      toast.error(err.message || 'Send error');
    } finally {
      setSending(false);
    }
  };

  // Run financial command simulation
  const handleSimulate = async (customPrompt) => {
    const textToRun = (customPrompt || simText).trim();
    if (!textToRun) return;
    setSimulating(true);
    setSimReply(null);
    try {
      const res = await fetch('/api/evolution/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: status.display_phone_number || '971501234567',
          text: textToRun,
        }),
      });
      const data = await res.json();
      setSimReply(data.reply || 'No response returned');
      toast.success('Financial command processed!');
    } catch {
      toast.error('Simulation failed');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Gateway Card */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-6 shadow-none">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-[#25D366]/15 text-[#25D366] shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold text-base text-foreground">Evolution WhatsApp Gateway</h2>
                <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border text-[10px] font-bold uppercase tracking-wider">
                  Orbit / whatsmeow
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                    status.loading
                      ? 'bg-secondary text-muted-foreground border-border'
                      : status.connected
                        ? 'bg-[#25D366]/15 text-[#25D366] border-[#25D366]/30'
                        : status.state === 'connecting'
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {status.loading ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : status.connected ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}
                  {status.loading
                    ? 'Checking...'
                    : status.connected
                      ? 'Connected (Active)'
                      : status.state === 'connecting'
                        ? 'Connecting'
                        : 'Awaiting Connection'}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                High-performance WhatsApp automation engine for tracking household expenses, bills, and budgets.
              </p>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchStatus}
              disabled={status.loading || actionLoading}
              className="p-2.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors disabled:opacity-50"
              title="Refresh Gateway Status"
            >
              <RefreshCw className={`w-4 h-4 ${status.loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleReconnect}
              disabled={actionLoading}
              className="px-3 py-2 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Force Reconnect Instance"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#B5F13E]" />
              Reconnect
            </button>

            {status.connected && (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={actionLoading}
                className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-50"
                title="Disconnect Instance"
              >
                <Power className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Server & Instance Details Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-secondary/40 border border-border/70 text-xs">
          <div>
            <span className="text-muted-foreground text-[11px] block">Instance Name</span>
            <strong className="text-foreground font-mono text-sm">{status.instanceName}</strong>
          </div>
          <div>
            <span className="text-muted-foreground text-[11px] block">Server URL</span>
            <span className="text-muted-foreground font-mono text-[11px] truncate block">{status.apiUrl}</span>
          </div>
          <div>
            <span className="text-muted-foreground text-[11px] block">Linked Phone</span>
            <strong className="text-[#B5F13E] font-mono text-sm">
              {status.display_phone_number ? `+${status.display_phone_number.replace(/^\+/, '')}` : 'Not Linked Yet'}
            </strong>
          </div>
        </div>

        {status.error && !status.connected && (
          <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-900/40 text-xs text-rose-300">
            <strong>Evolution API Notice:</strong> {status.error}
          </div>
        )}

        {/* Pairing Hub (Visible when instance needs linking or user wants to re-pair) */}
        {!status.connected && (
          <div className="rounded-xl border border-border/80 bg-secondary/20 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#B5F13E]" />
                  Pair Your WhatsApp Account
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Link any WhatsApp account (personal or business) directly to your Evolution instance.
                </p>
              </div>

              {/* Toggle Method Tabs */}
              <div className="flex items-center gap-1 bg-card p-1 rounded-lg border border-border shrink-0">
                <button
                  type="button"
                  onClick={() => setActivePairMethod('qr')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                    activePairMethod === 'qr'
                      ? 'bg-[#B5F13E] text-[#121417]'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5 inline mr-1" />
                  Scan QR Code
                </button>
                <button
                  type="button"
                  onClick={() => setActivePairMethod('pairCode')}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                    activePairMethod === 'pairCode'
                      ? 'bg-[#B5F13E] text-[#121417]'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5 inline mr-1" />
                  Pairing Code
                </button>
              </div>
            </div>

            {/* Method A: QR Code */}
            {activePairMethod === 'qr' && (
              <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                <div className="p-3 bg-white rounded-xl shadow-md border border-border shrink-0 flex items-center justify-center min-w-[190px] min-h-[190px]">
                  {qrCodeData ? (
                    <img
                      src={qrCodeData}
                      alt="Evolution WhatsApp QR Code"
                      className="w-44 h-44 rounded-lg object-contain"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <QrCode className="w-10 h-10 mx-auto text-neutral-400 mb-2" />
                      <button
                        type="button"
                        onClick={fetchQrCode}
                        disabled={qrLoading}
                        className="px-3 py-1.5 bg-[#121417] text-[#B5F13E] rounded-lg text-xs font-semibold hover:bg-neutral-900 transition-colors"
                      >
                        {qrLoading ? 'Generating...' : 'Click to Load QR'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-3 text-left">
                  <div>
                    <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider text-[#B5F13E]">
                      How to Scan:
                    </h4>
                    <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1.5 mt-2">
                      <li>Open WhatsApp on your phone</li>
                      <li>Go to <strong>Settings</strong> → <strong>Linked Devices</strong></li>
                      <li>Tap <strong>Link a Device</strong> and point your camera at this QR code</li>
                    </ol>
                  </div>

                  {qrCodeData && (
                    <button
                      type="button"
                      onClick={fetchQrCode}
                      disabled={qrLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs text-foreground hover:bg-secondary transition-colors"
                    >
                      <RefreshCw className={`w-3 h-3 ${qrLoading ? 'animate-spin' : ''}`} />
                      Refresh QR Code
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Method B: 8-Digit Pairing Code */}
            {activePairMethod === 'pairCode' && (
              <div className="space-y-4 pt-1 max-w-lg">
                <form onSubmit={handleRequestPairCode} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Phone Number (with Country Code)</label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={pairPhone}
                        onChange={(e) => setPairPhone(e.target.value)}
                        placeholder="e.g. 971501234567"
                        className="h-10 px-3 rounded-xl bg-card border border-border text-foreground text-xs font-mono flex-1 focus:outline-none focus:border-[#B5F13E]"
                        required
                      />
                      <button
                        type="submit"
                        disabled={pairLoading}
                        className="fuloozi-btn-primary h-10 px-4 text-xs font-semibold shadow-lime shrink-0 disabled:opacity-50"
                      >
                        {pairLoading ? 'Generating...' : 'Get Pairing Code'}
                      </button>
                    </div>
                  </div>
                </form>

                {pairingCodeResult && (
                  <div className="p-4 rounded-xl bg-card border border-[#B5F13E]/40 space-y-2 animate-in fade-in">
                    <span className="text-[11px] font-bold text-[#B5F13E] uppercase tracking-wider block">
                      Your WhatsApp Pairing Code:
                    </span>
                    <div className="text-2xl font-bold font-mono tracking-widest text-foreground select-all">
                      {pairingCodeResult}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Open WhatsApp → Linked Devices → <strong>Link with phone number instead</strong>, and enter this code.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Live Interactive Testing & Simulation Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2 border-t border-border/60">
          {/* Outbound Sender */}
          <form onSubmit={handleSendText} className="p-4 rounded-xl border border-border/70 bg-secondary/20 space-y-3">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-[#B5F13E]" />
              Direct Message Dispatch (POST /send/text)
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Send an actual WhatsApp message from your Evolution API instance to any phone number.
            </p>

            <div className="space-y-2">
              <input
                type="tel"
                value={sendPhone}
                onChange={(e) => setSendPhone(e.target.value)}
                placeholder="Recipient phone (e.g. 971501234567)"
                className="w-full h-9 px-3 rounded-lg bg-card border border-border text-foreground text-xs font-mono focus:outline-none focus:border-[#B5F13E]"
                required
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sendText}
                  onChange={(e) => setSendText(e.target.value)}
                  placeholder="Message text..."
                  className="h-9 px-3 rounded-lg bg-card border border-border text-foreground text-xs flex-1 focus:outline-none focus:border-[#B5F13E]"
                  required
                />
                <button
                  type="submit"
                  disabled={sending || !sendPhone || !sendText}
                  className="h-9 px-4 bg-[#25D366] hover:bg-[#20ba5a] text-black font-semibold text-xs rounded-lg transition-colors shrink-0 disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>

            {lastSentResult && (
              <div
                className={`p-2.5 rounded-lg text-[11px] font-mono ${
                  lastSentResult.ok
                    ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-400'
                    : 'bg-rose-950/40 border border-rose-800/40 text-rose-300'
                }`}
              >
                {lastSentResult.ok ? (
                  <span>✓ Delivered! ID: {lastSentResult.message_id || 'ok'}</span>
                ) : (
                  <span>✗ {lastSentResult.error}</span>
                )}
              </div>
            )}
          </form>

          {/* Inbound Financial Command Simulator */}
          <div className="p-4 rounded-xl border border-border/70 bg-secondary/20 space-y-3">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#B5F13E]" />
              Financial Command Simulator
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Simulate incoming WhatsApp messages and test ledger processing in real time.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={simText}
                onChange={(e) => setSimText(e.target.value)}
                placeholder="e.g. expense 45 lunch"
                className="h-9 px-3 rounded-lg bg-card border border-border text-foreground text-xs font-mono flex-1 focus:outline-none focus:border-[#B5F13E]"
              />
              <button
                type="button"
                onClick={() => handleSimulate()}
                disabled={simulating}
                className="fuloozi-btn-primary h-9 px-4 text-xs font-semibold shadow-lime shrink-0 disabled:opacity-50"
              >
                {simulating ? 'Processing...' : 'Simulate'}
              </button>
            </div>

            {/* Quick Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                'expense 120 Spinneys groceries',
                'expense 180 ENOC petrol',
                'income 5000 consulting',
                'bills',
                'summary',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setSimText(chip);
                    handleSimulate(chip);
                  }}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-card border border-border hover:border-[#B5F13E]/50 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>

            {simReply && (
              <div className="mt-2 p-3 rounded-lg bg-card border border-[#B5F13E]/30 space-y-1">
                <span className="text-[10px] font-bold text-[#B5F13E] uppercase tracking-wider block">
                  WhatsApp Bot Reply Output:
                </span>
                <p className="text-xs font-mono whitespace-pre-wrap text-foreground leading-relaxed">
                  {simReply}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Supported Commands Reference Card */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-none">
        <p className="text-xs font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#B5F13E]" />
          Supported WhatsApp Financial Commands
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
            <span className="font-mono text-[#B5F13E] font-semibold block mb-1">expense [amount] [name]</span>
            <p className="text-muted-foreground text-[11px] leading-tight">
              Auto-categorizes and logs expenses with AED Dirhams currency.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
            <span className="font-mono text-[#B5F13E] font-semibold block mb-1">income [amount] [name]</span>
            <p className="text-muted-foreground text-[11px] leading-tight">
              Logs inflows and updates net savings cushion in your ledger.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
            <span className="font-mono text-[#B5F13E] font-semibold block mb-1">bills</span>
            <p className="text-muted-foreground text-[11px] leading-tight">
              Queries upcoming utility and telecom due dates (DEWA, du, rent).
            </p>
          </div>
          <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
            <span className="font-mono text-[#B5F13E] font-semibold block mb-1">summary</span>
            <p className="text-muted-foreground text-[11px] leading-tight">
              Returns monthly budget totals, spent percentages, and savings rates.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
