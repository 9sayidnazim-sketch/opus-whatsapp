import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Plus, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { db, askAssistant, whatsappURL, openWhatsAppChat } from '@/api/client';

export default function Assistant() {
  const cache = useQueryClient();
  const { data: threads = [], isError } = useQuery({ queryKey: ['conversations'], queryFn: () => db.entities.Conversation.list() });
  const [selected, setSelected] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const thread = threads.find(item => item.id === selected);
  const messages = thread?.messages ?? [];
  async function send(event) {
    event.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const userMessage = { role: 'user', content: text.trim() };
      const reply = await askAssistant([...messages, userMessage].slice(-12));
      const next = [...messages, userMessage, { role: 'assistant', content: reply.slice(0, 2000) }];
      const saved = thread
        ? await db.entities.Conversation.update(thread.id, { messages: next })
        : await db.entities.Conversation.create({ name: text.trim().slice(0, 60), messages: next });
      await cache.invalidateQueries({ queryKey: ['conversations'] });
      setSelected(saved.id);
      setText('');
    } catch (failure) {
      setError(failure.message || 'Could not send this message');
    } finally {
      setBusy(false);
    }
  }
  return <section className="mx-auto max-w-7xl p-4 md:p-8">
    <header className="mb-6 flex flex-wrap justify-between gap-4">
      <div><h1 className="text-3xl font-semibold">Finance assistant</h1><p className="mt-2 text-muted-foreground">Work through spending, bills and savings with Claude</p></div>
      {whatsappURL && <Button variant="outline" onClick={() => {
        setError('');
        openWhatsAppChat(window.open('about:blank', '_blank')).catch(() => setError('Could not open WhatsApp. Try again.'));
      }}>Chat on WhatsApp <ExternalLink className="ml-2 h-4 w-4" /></Button>}
    </header>
    <div className="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="rounded-xl border bg-card p-4">
        <Button variant="outline" className="w-full justify-start" disabled={busy} onClick={() => { setSelected(null); setText(''); setError(''); }}><Plus className="mr-2 h-4 w-4" />New conversation</Button>
        <ul className="mt-3 space-y-1">{threads.map(item => <li key={item.id}><button type="button" disabled={busy} onClick={() => setSelected(item.id)} className={`w-full truncate rounded-md p-2 text-left text-sm ${selected === item.id ? 'bg-accent' : 'hover:bg-muted'}`}>{item.name}</button></li>)}</ul>
        {isError && <p role="alert" className="mt-3 text-sm">Could not load conversations</p>}
      </aside>
      <section className="rounded-xl border bg-card p-4 md:p-6">
        <div className="min-h-60 space-y-4" aria-live="polite">
          {!messages.length && <p className="text-muted-foreground">Ask for help setting up a budget or planning for your next bill.</p>}
          {messages.map((message, index) => <div key={index} className={`whitespace-pre-wrap break-words rounded-lg p-3 text-sm ${message.role === 'user' ? 'ml-auto max-w-[85%] bg-accent' : 'max-w-[95%] bg-muted'}`}>{message.content}</div>)}
        </div>
        <form onSubmit={send} className="mt-4 flex gap-2">
          <Input aria-label="Message" value={text} onChange={event => setText(event.target.value)} maxLength={2000} placeholder="Ask OPUS" disabled={busy} />
          <Button disabled={busy || !text.trim()}><Send className="mr-2 h-4 w-4" />{busy ? 'Sending' : 'Send'}</Button>
        </form>
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      </section>
    </div>
  </section>;
}
