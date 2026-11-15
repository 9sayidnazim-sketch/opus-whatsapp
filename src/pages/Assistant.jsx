import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Plus, Send, Sparkles, MessageSquare, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { db, askAssistant, whatsappURL, openWhatsAppChat } from '@/api/client';
import { FulooziMark } from '@/components/FulooziBrand';

const SUGGESTIONS = [
  "How much have we spent on groceries this month?",
  "What household bills are due in the next 7 days?",
  "How are we tracking toward our vacation goal?",
  "Give me 3 ways to optimize our utility and dining expenses",
];

export default function Assistant() {
  const cache = useQueryClient();
  const { data: threads = [], isError } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => db.entities.Conversation.list()
  });
  const [selected, setSelected] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const thread = threads.find(item => item.id === selected);
  const messages = thread?.messages ?? [];

  async function handleSend(contentToSend) {
    const prompt = (contentToSend || text).trim();
    if (!prompt || busy) return;
    setBusy(true);
    setError('');

    try {
      const userMessage = { role: 'user', content: prompt };
      const reply = await askAssistant([...messages, userMessage].slice(-12));
      const next = [...messages, userMessage, { role: 'assistant', content: reply.slice(0, 2000) }];
      
      const saved = thread
        ? await db.entities.Conversation.update(thread.id, { messages: next })
        : await db.entities.Conversation.create({ name: prompt.slice(0, 40), messages: next });

      await cache.invalidateQueries({ queryKey: ['conversations'] });
      setSelected(saved.id);
      setText('');
    } catch (failure) {
      setError(failure.message || 'Could not send this message');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            Finance Assistant
            <span className="px-2 py-0.5 rounded-full bg-[#B5F13E]/15 text-[#B5F13E] text-xs font-bold uppercase tracking-wider">
              AI
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Ask questions about household spending, upcoming bills, and budget targets
          </p>
        </div>

        {whatsappURL && (
          <button
            onClick={() => {
              setError('');
              openWhatsAppChat(window.open('about:blank', '_blank')).catch(() => setError('Could not open WhatsApp. Try again.'));
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/30 text-xs sm:text-sm font-semibold transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            Chat on WhatsApp
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </button>
        )}
      </header>

      {/* Main chat layout */}
      <div className="grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
        {/* Sidebar history */}
        <aside className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start rounded-xl text-xs sm:text-sm font-medium border-border"
            disabled={busy}
            onClick={() => {
              setSelected(null);
              setText('');
              setError('');
            }}
          >
            <Plus className="mr-2 h-4 w-4 text-[#B5F13E]" /> New Conversation
          </Button>

          <div className="pt-2 border-t border-border/60">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
              Recent Chats
            </p>
            {threads.length === 0 ? (
              <p className="text-xs text-muted-foreground px-1 py-2">No past conversations</p>
            ) : (
              <ul className="space-y-1">
                {threads.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setSelected(item.id)}
                      className={`w-full truncate rounded-xl p-2.5 text-left text-xs font-medium transition-colors ${
                        selected === item.id
                          ? 'bg-[#B5F13E]/15 text-[#B5F13E] border border-[#B5F13E]/20'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                      }`}
                    >
                      {item.name || 'Chat Session'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {isError && <p role="alert" className="text-xs text-destructive">Could not load chats</p>}
        </aside>

        {/* Chat Canvas */}
        <section className="rounded-2xl border border-border bg-card p-4 md:p-6 flex flex-col h-[600px] justify-between">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1" aria-live="polite">
            {!messages.length && (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto p-4 space-y-4">
                <FulooziMark size={48} variant="squircle" />
                <div>
                  <h3 className="font-heading font-semibold text-base text-foreground">
                    How can I assist your finances today?
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ask me about your monthly budget, bill due dates, or advice on reaching savings targets.
                  </p>
                </div>

                <div className="w-full space-y-2 pt-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleSend(suggestion)}
                      className="w-full text-left p-2.5 rounded-xl bg-secondary/50 hover:bg-secondary text-xs text-foreground/90 border border-border/60 hover:border-[#B5F13E]/40 transition-all"
                    >
                      💡 {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, index) => {
              const isUser = message.role === 'user';
              return (
                <div
                  key={index}
                  className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                      <FulooziMark size={20} variant="plain" />
                    </div>
                  )}

                  <div
                    className={`whitespace-pre-wrap break-words rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? 'max-w-[85%] bg-secondary text-foreground border border-border'
                        : 'max-w-[90%] bg-secondary/30 text-foreground border border-[#B5F13E]/20 shadow-sm'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Form */}
          <div className="pt-4 border-t border-border/80">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
              <Input
                aria-label="Message"
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={2000}
                placeholder="Ask Fuloozi about your spending, bills, or budgets..."
                disabled={busy}
                className="h-11 rounded-xl bg-secondary/50 border-border text-xs sm:text-sm focus-visible:ring-[#B5F13E]"
              />
              <button
                type="submit"
                disabled={busy || !text.trim()}
                className="fuloozi-btn-primary px-4 h-11 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold shadow-lime shrink-0 disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">{busy ? 'Thinking...' : 'Send'}</span>
              </button>
            </form>
            {error && <p role="alert" className="mt-2 text-xs text-rose-400">{error}</p>}
          </div>
        </section>
      </div>
    </section>
  );
}
