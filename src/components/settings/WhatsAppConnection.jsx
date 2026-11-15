import { useState } from 'react';
import { MessageSquare, ExternalLink, CheckCircle, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase, openWhatsAppChat } from '@/api/client';
import toast from 'react-hot-toast';

export default function WhatsAppConnection({ whatsappURL }) {
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState(false);

  async function disconnect() {
    setPending(true);
    try {
      const { error } = await supabase.rpc('opus_whatsapp_link', { unlink: true });
      if (error) throw error;
      setStatus('WhatsApp disconnected');
      toast.success('WhatsApp bot unlinked');
    } catch {
      setStatus('Could not disconnect WhatsApp');
      toast.error('Could not disconnect WhatsApp');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-[#25D366]/15 text-[#25D366] shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-base text-foreground">WhatsApp Finance Bot</h2>
              <span className="px-2 py-0.5 rounded-full bg-[#25D366]/15 text-[#25D366] text-[10px] font-bold uppercase">
                Meta Kapso
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Link your phone to log expenses on the fly (e.g. <code className="text-[#B5F13E]">OPUS expense 25 groceries</code>) or ask finance questions.
            </p>
          </div>
        </div>

        {whatsappURL && (
          <div className="flex items-center gap-2">
            <button
              disabled={pending}
              onClick={() => {
                setStatus('');
                openWhatsAppChat(window.open('about:blank', '_blank')).catch(() => {
                  setStatus('Could not open WhatsApp');
                  toast.error('Could not open WhatsApp');
                });
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-black text-xs font-semibold transition-all"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Connect WhatsApp
              <ExternalLink className="w-3 h-3 opacity-80" />
            </button>
            <Button
              disabled={pending}
              variant="outline"
              size="sm"
              onClick={disconnect}
              className="rounded-xl text-xs h-9"
            >
              Unlink
            </Button>
          </div>
        )}
      </div>

      {status && (
        <div className="p-3 rounded-xl bg-secondary/50 border border-border text-xs text-foreground">
          {status}
        </div>
      )}
    </section>
  );
}
