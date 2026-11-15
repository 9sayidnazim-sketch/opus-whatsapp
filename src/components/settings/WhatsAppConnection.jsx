import { useState, useEffect } from 'react';
import {
  MessageSquare,
  ExternalLink,
  Smartphone,
  CheckCircle,
  Copy,
  QrCode,
  Send,
  Sparkles,
  RefreshCw,
  Receipt,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';

export default function WhatsAppConnection({ whatsappURL }) {
  const [kapsoInfo, setKapsoInfo] = useState({
    connected: true,
    verified_name: 'Mr.Octapus',
    display_phone_number: '+1 555-796-9980',
    code_verification_status: 'VERIFIED',
    loading: true,
  });

  const [showQr, setShowQr] = useState(false);
  const [showTester, setShowTester] = useState(false);
  const [testText, setTestText] = useState('expense 45 lunch at Arabian Tea House');
  const [simulating, setSimulating] = useState(false);
  const [botReply, setBotReply] = useState(null);

  // Outbound send tester
  const [outboundPhone, setOutboundPhone] = useState('');
  const [outboundText, setOutboundText] = useState('Hello from Fuloozi Ledger!');
  const [outboundSending, setOutboundSending] = useState(false);
  const [outboundResult, setOutboundResult] = useState(null);

  const phoneRaw = '15557969980';
  const connectUrl = `https://wa.me/${phoneRaw}?text=${encodeURIComponent('Hi Octapus 7829104921')}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(connectUrl)}`;

  useEffect(() => {
    fetch('/api/kapso/status')
      .then((r) => r.json())
      .then((data) => {
        setKapsoInfo((prev) => ({ ...prev, ...data, loading: false }));
      })
      .catch(() => {
        setKapsoInfo((prev) => ({ ...prev, loading: false }));
      });
  }, []);

  function handleCopy() {
    navigator.clipboard.writeText(connectUrl);
    toast.success('WhatsApp connection link copied to clipboard!');
  }

  async function handleSimulate(customText) {
    const textToRun = customText || testText;
    if (!textToRun.trim()) return;
    setSimulating(true);
    setBotReply(null);
    try {
      const res = await fetch('/api/kapso/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: '971500000000',
          text: textToRun,
        }),
      });
      const data = await res.json();
      setBotReply(data.reply || 'No reply received');
      toast.success('Bot processed response');
    } catch {
      toast.error('Simulation failed');
    } finally {
      setSimulating(false);
    }
  }

  async function handleSendOutbound(e) {
    e.preventDefault();
    if (!outboundPhone.trim() || !outboundText.trim()) {
      toast.error('Please enter a phone number and message');
      return;
    }
    setOutboundSending(true);
    setOutboundResult(null);
    try {
      const res = await fetch('/api/kapso/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: outboundPhone,
          text: outboundText,
        }),
      });
      const data = await res.json();
      setOutboundResult(data);
      if (data.ok) {
        toast.success('WhatsApp message dispatched!');
      } else if (data.is24HourWindow) {
        toast.error('Recipient is outside the Meta 24-hour conversation window.');
      } else {
        toast.error(data.error || 'Failed to send WhatsApp message');
      }
    } catch (err) {
      toast.error('Outbound send failed: ' + err.message);
    } finally {
      setOutboundSending(false);
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
              <span className="px-2 py-0.5 rounded-full bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {kapsoInfo.code_verification_status === 'VERIFIED' ? 'Verified & Active' : 'Connected'}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Official Meta Cloud API via Kapso · Dedicated Number:{' '}
              <strong className="text-foreground">{kapsoInfo.display_phone_number}</strong> ({kapsoInfo.verified_name})
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={connectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-black text-xs font-semibold shadow-sm transition-all"
          >
            <Smartphone className="w-4 h-4" />
            Open in WhatsApp
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>

          <button
            type="button"
            onClick={() => setShowQr(!showQr)}
            className="p-2.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
            title="Show QR Code"
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
        </div>
      </div>

      {/* QR Code Expansion */}
      {showQr && (
        <div className="p-5 rounded-xl border border-border/70 bg-secondary/30 flex flex-col sm:flex-row items-center gap-6 animate-in fade-in duration-200">
          <div className="p-3 bg-white rounded-xl shadow-md border border-border">
            <img
              src={qrCodeUrl}
              alt="Scan to Connect WhatsApp"
              className="w-48 h-48 rounded-lg"
              loading="lazy"
            />
          </div>
          <div className="space-y-3 text-center sm:text-left">
            <div>
              <h3 className="font-semibold text-sm text-foreground">Scan with Your Phone Camera</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Open your smartphone camera or WhatsApp scanner to immediately start chatting with the Fuloozi ledger bot.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-card border border-border/80 text-xs text-muted-foreground font-mono select-all break-all">
              {connectUrl}
            </div>
            <p className="text-[11px] text-[#B5F13E]">
              ✓ Pre-filled greeting: "Hi Octapus 7829104921"
            </p>
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
            <p className="text-muted-foreground text-[11px] mt-0.5">Logs an expense into your ledger automatically with AED currency.</p>
          </div>
          <div className="p-2.5 rounded-lg bg-card border border-border/60">
            <span className="font-mono text-emerald-400">income 3500 consulting</span>
            <p className="text-muted-foreground text-[11px] mt-0.5">Logs household income or reimbursements into live ledger.</p>
          </div>
          <div className="p-2.5 rounded-lg bg-card border border-border/60">
            <span className="font-mono text-amber-400">bills</span>
            <p className="text-muted-foreground text-[11px] mt-0.5">Replies with all upcoming utility due dates (DEWA, telecom, rent).</p>
          </div>
          <div className="p-2.5 rounded-lg bg-card border border-border/60">
            <span className="font-mono text-sky-400">summary</span>
            <p className="text-muted-foreground text-[11px] mt-0.5">Replies with monthly income, total expenses, and net savings cushion.</p>
          </div>
        </div>
      </div>

      {/* Simulator / Direct Outbound Tester Accordion */}
      <div className="pt-2 border-t border-border/60">
        <button
          type="button"
          onClick={() => setShowTester(!showTester)}
          className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          <span className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-[#B5F13E]" />
            Interactive Agent Simulator & Outbound Dispatcher
          </span>
          {showTester ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showTester && (
          <div className="mt-4 space-y-6 animate-in fade-in duration-200">
            {/* Simulation section */}
            <div className="p-4 rounded-xl border border-border bg-secondary/30 space-y-3">
              <h4 className="text-xs font-semibold text-foreground">1. Test Inbound Message Simulation</h4>
              <p className="text-[11px] text-muted-foreground">
                Simulate what happens when a WhatsApp user messages the bot. The response is generated live via the Kapso engine.
              </p>

              <div className="flex gap-2">
                <Input
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  placeholder="e.g. expense 85 dinner or bills"
                  className="h-10 text-xs font-mono"
                />
                <Button
                  onClick={() => handleSimulate()}
                  disabled={simulating}
                  className="fuloozi-btn-primary h-10 px-4 text-xs font-semibold shrink-0"
                >
                  {simulating ? 'Processing...' : 'Simulate'}
                </Button>
              </div>

              {/* Quick sample chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  'expense 120 Spinneys groceries',
                  'bills',
                  'summary',
                  'What is our remaining grocery budget?',
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => {
                      setTestText(chip);
                      handleSimulate(chip);
                    }}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-card border border-border hover:border-[#B5F13E]/50 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {botReply && (
                <div className="mt-3 p-3.5 rounded-lg bg-card border border-[#B5F13E]/30 space-y-1">
                  <p className="text-[10px] font-bold text-[#B5F13E] uppercase tracking-wider">Bot Reply Output:</p>
                  <p className="text-xs font-mono whitespace-pre-wrap text-foreground leading-relaxed">
                    {botReply}
                  </p>
                </div>
              )}
            </div>

            {/* Outbound send test */}
            <form onSubmit={handleSendOutbound} className="p-4 rounded-xl border border-border bg-secondary/30 space-y-3">
              <h4 className="text-xs font-semibold text-foreground">2. Send Direct WhatsApp Outbound Message</h4>
              <p className="text-[11px] text-muted-foreground">
                Dispatch an actual WhatsApp message through Meta's Cloud API to any phone number. (Note: Meta requires an active 24-hr session window for freeform text).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px]">Phone Number</Label>
                  <Input
                    value={outboundPhone}
                    onChange={(e) => setOutboundPhone(e.target.value)}
                    placeholder="e.g. 971501234567"
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-[11px]">Message Body</Label>
                  <div className="flex gap-2">
                    <Input
                      value={outboundText}
                      onChange={(e) => setOutboundText(e.target.value)}
                      placeholder="Message text..."
                      className="h-9 text-xs"
                    />
                    <Button
                      type="submit"
                      disabled={outboundSending}
                      className="h-9 px-4 bg-[#25D366] hover:bg-[#20ba5a] text-black font-semibold text-xs shrink-0"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      {outboundSending ? 'Sending...' : 'Send'}
                    </Button>
                  </div>
                </div>
              </div>

              {outboundResult && (
                <div className={`mt-2 p-3 rounded-lg text-xs font-mono ${outboundResult.ok ? 'bg-emerald-950/30 border border-emerald-800 text-emerald-400' : 'bg-rose-950/30 border border-rose-800 text-rose-300'}`}>
                  {outboundResult.ok ? (
                    <p>✓ Sent successfully! Message ID: {outboundResult.message_id}</p>
                  ) : (
                    <p>✗ {outboundResult.error} {outboundResult.next_steps ? `(${outboundResult.next_steps})` : ''}</p>
                  )}
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
