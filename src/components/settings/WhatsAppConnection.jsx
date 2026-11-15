import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase, openWhatsAppChat } from '@/api/client';

export default function WhatsAppConnection({ whatsappURL }) {
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState(false);
  async function disconnect() {
    setPending(true);
    try {
      const { error } = await supabase.rpc('opus_whatsapp_link', { unlink: true });
      if (error) throw error;
      setStatus('WhatsApp disconnected');
    } catch {
      setStatus('Could not disconnect WhatsApp');
    } finally { setPending(false); }
  }
  return <section className="rounded-xl border bg-card p-5">
    <div className="flex items-start gap-3">
      <MessageCircle className="mt-1 h-5 w-5 text-primary" aria-hidden="true" />
      <div className="flex-1">
        <h2 className="font-medium">WhatsApp</h2>
        <p className="mt-1 text-sm text-muted-foreground">{whatsappURL ? 'Link your account to record income and expenses by chat' : 'WhatsApp is unavailable'}</p>
        {whatsappURL && <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={pending} onClick={() => {
            setStatus('');
            openWhatsAppChat(window.open('about:blank', '_blank')).catch(() => setStatus('Could not open WhatsApp'));
          }}>Chat on WhatsApp</Button>
          <Button disabled={pending} variant="outline" onClick={disconnect}>Disconnect</Button>
        </div>}
        {status && <p className="mt-3 text-sm" role="status">{status}</p>}
      </div>
    </div>
  </section>;
}
