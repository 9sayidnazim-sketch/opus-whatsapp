import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/api/client';

export default function WhatsAppConnection({ whatsappURL }) {
  const [link, setLink] = useState('');
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState(false);
  async function update(unlink) {
    setPending(true);
    setStatus('');
    setLink('');
    try {
      const { data, error } = await supabase.rpc('opus_whatsapp_link', { unlink });
      if (error) throw error;
      if (unlink) setStatus('WhatsApp disconnected');
      else if (data.linked) setStatus('WhatsApp is already linked');
      else {
        setLink(`${whatsappURL}?text=${encodeURIComponent(`OPUS link ${data.code}`)}`);
        setStatus('Open WhatsApp and send the prefilled message within 10 minutes');
      }
    } catch {
      setStatus('Could not update your WhatsApp connection');
    } finally { setPending(false); }
  }
  return <section className="rounded-xl border bg-card p-5">
    <div className="flex items-start gap-3">
      <MessageCircle className="mt-1 h-5 w-5 text-primary" aria-hidden="true" />
      <div className="flex-1">
        <h2 className="font-medium">WhatsApp</h2>
        <p className="mt-1 text-sm text-muted-foreground">{whatsappURL ? 'Link your account to record income and expenses by chat' : 'WhatsApp is unavailable'}</p>
        {whatsappURL && <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={pending} onClick={() => update(false)}>Link WhatsApp</Button>
          <Button disabled={pending} variant="outline" onClick={() => update(true)}>Disconnect</Button>
          {link && <Button asChild variant="outline"><a href={link} target="_blank" rel="noreferrer">Open WhatsApp</a></Button>}
        </div>}
        {status && <p className="mt-3 text-sm" role="status">{status}</p>}
      </div>
    </div>
  </section>;
}
