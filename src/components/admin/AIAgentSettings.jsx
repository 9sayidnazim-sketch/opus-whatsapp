import { useState, useEffect } from 'react';
import {
  Sparkles,
  Cpu,
  Key,
  Globe,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Zap,
  Send,
  Sliders,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AIAgentSettings() {
  const [config, setConfig] = useState({
    provider: 'gemini',
    providerName: 'Google Gemini',
    model: 'gemini-1.5-flash',
    apiKey: '',
    apiKeySet: false,
    baseUrl: '',
    systemPrompt: '',
    presets: {},
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Quick playground test
  const [testPrompt, setTestPrompt] = useState('How should I prioritize my emergency fund vs summer holiday?');
  const [playgroundLoading, setPlaygroundLoading] = useState(false);
  const [playgroundReply, setPlaygroundReply] = useState(null);

  // Fetch current AI configuration
  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/config');
      const data = await res.json();
      if (data) {
        setConfig({
          provider: data.provider || 'gemini',
          providerName: data.providerName || 'Google Gemini',
          model: data.model || 'gemini-1.5-flash',
          apiKey: data.apiKey || '',
          apiKeySet: Boolean(data.apiKeySet),
          baseUrl: data.baseUrl || '',
          systemPrompt: data.systemPrompt || '',
          presets: data.presets || {},
        });
      }
    } catch {
      toast.error('Failed to load AI configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // When provider changes, update model and baseUrl defaults
  const handleProviderChange = (newProvider) => {
    const preset = config.presets?.[newProvider];
    setConfig((prev) => ({
      ...prev,
      provider: newProvider,
      providerName: preset?.name || newProvider,
      model: preset?.defaultModel || prev.model,
      baseUrl: preset?.baseUrl || prev.baseUrl,
      apiKey: '',
      apiKeySet: false,
    }));
    setTestResult(null);
  };

  // Save configuration
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: config.provider,
          model: config.model,
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          systemPrompt: config.systemPrompt,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`AI Agent configured with ${config.provider.toUpperCase()} (${config.model})`);
        await fetchConfig();
      } else {
        toast.error(data.error || 'Failed to save AI configuration');
      }
    } catch {
      toast.error('Network error saving AI configuration');
    } finally {
      setSaving(false);
    }
  };

  // Test live AI connection
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: config.provider,
          model: config.model,
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
        }),
      });
      const data = await res.json();
      setTestResult(data);
      if (data.ok) {
        toast.success(data.message || 'AI Agent connection verified!');
      } else {
        toast.error(data.message || 'AI Connection failed');
      }
    } catch (err) {
      setTestResult({
        ok: false,
        message: err.message || 'Failed to reach AI testing endpoint',
      });
      toast.error('AI testing failed');
    } finally {
      setTesting(false);
    }
  };

  // Interactive playground test
  const handlePlaygroundSend = async () => {
    if (!testPrompt.trim()) return;
    setPlaygroundLoading(true);
    setPlaygroundReply(null);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: testPrompt }],
        }),
      });
      const data = await res.json();
      setPlaygroundReply(data.reply || 'No response returned');
      toast.success('AI reply received');
    } catch {
      toast.error('Error generating AI reply');
    } finally {
      setPlaygroundLoading(false);
    }
  };

  const currentPreset = config.presets?.[config.provider] || {};
  const availableModels = currentPreset.models || [config.model];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-6 shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-[#B5F13E]/15 text-[#B5F13E] shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-semibold text-base text-foreground">Universal AI Agent Hub</h2>
                <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border text-[10px] font-bold uppercase tracking-wider">
                  Multi-Provider LLM
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                    config.apiKeySet || config.provider === 'ollama'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {config.apiKeySet || config.provider === 'ollama' ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}
                  {config.apiKeySet || config.provider === 'ollama'
                    ? 'AI Provider Connected'
                    : 'Local Reasoning Fallback'}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Power both in-app assistant and WhatsApp finance bot with any AI model (Gemini, OpenAI, Groq, Claude, OpenRouter, or Ollama).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchConfig}
              disabled={loading || saving}
              className="p-2.5 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors disabled:opacity-50"
              title="Reload AI Config"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Configuration Form */}
        <form onSubmit={handleSave} className="space-y-4 pt-2 border-t border-border/70">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Provider Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#B5F13E]" />
                AI Agent Provider
              </label>
              <select
                value={config.provider}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border text-foreground text-xs font-semibold focus:outline-none focus:border-[#B5F13E]"
              >
                <option value="gemini">Google Gemini (Recommended)</option>
                <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                <option value="groq">Groq (Ultra-Fast Llama 3.3)</option>
                <option value="anthropic">Anthropic Claude (Sonnet / Haiku)</option>
                <option value="openrouter">OpenRouter (Any Open or Unified Model)</option>
                <option value="ollama">Ollama (Local LLM / Private)</option>
                <option value="custom">Custom OpenAI-Compatible Endpoint</option>
              </select>
              <p className="text-[10px] text-muted-foreground">
                Select your preferred AI engine or switch providers at any time.
              </p>
            </div>

            {/* Model Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#B5F13E]" />
                Model Identifier
              </label>
              <input
                type="text"
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                placeholder={currentPreset.defaultModel || 'model-name'}
                className="w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border text-foreground text-xs font-mono focus:outline-none focus:border-[#B5F13E]"
                required
              />
              {/* Presets chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-muted-foreground">Presets:</span>
                {availableModels.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setConfig({ ...config, model: m })}
                    className={`text-[10px] px-2 py-0.5 rounded font-mono border transition-colors ${
                      config.model === m
                        ? 'bg-[#B5F13E]/20 text-[#B5F13E] border-[#B5F13E]/40'
                        : 'bg-secondary text-muted-foreground border-border hover:text-foreground'
                    }`}
                  >
                    {m.replace(/^.*\//, '')}
                  </button>
                ))}
              </div>
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#B5F13E]" />
                  API Secret Key
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {config.apiKeySet ? '✓ Key stored securely' : 'Optional for Ollama'}
                </span>
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder={config.apiKeySet ? '•••••••• (Configured)' : 'Enter API Key...'}
                  className="w-full h-10 px-3 pr-10 rounded-xl bg-secondary/40 border border-border text-foreground text-xs font-mono focus:outline-none focus:border-[#B5F13E]"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Persisted to <code>.env.local</code> and runtime environment.
              </p>
            </div>

            {/* Base URL (Endpoint) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#B5F13E]" />
                API Base URL (Endpoint)
              </label>
              <input
                type="text"
                value={config.baseUrl}
                onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                placeholder={currentPreset.baseUrl || 'https://api.openai.com/v1'}
                className="w-full h-10 px-3 rounded-xl bg-secondary/40 border border-border text-foreground text-xs font-mono focus:outline-none focus:border-[#B5F13E]"
              />
              <p className="text-[10px] text-muted-foreground">
                Useful for local Ollama, custom proxies, or enterprise gateways.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/50">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || saving}
              className="px-4 py-2 rounded-xl border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 text-[#B5F13E] ${testing ? 'animate-pulse' : ''}`} />
              {testing ? 'Pinging Provider...' : 'Test AI Connection'}
            </button>

            <button
              type="submit"
              disabled={saving}
              className="fuloozi-btn-primary px-5 py-2 text-xs font-semibold shadow-lime disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save AI Configuration'}
            </button>
          </div>

          {/* Diagnostic Test Result Box */}
          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in ${
                testResult.ok
                  ? 'bg-emerald-950/30 border border-emerald-800/40 text-emerald-300'
                  : 'bg-rose-950/30 border border-rose-900/40 text-rose-300'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <strong className="block font-semibold">
                  {testResult.ok ? 'AI Provider Responding' : 'Connection Failed'}
                </strong>
                <p className="text-[11px] leading-relaxed opacity-90">{testResult.message}</p>
                {testResult.reply && (
                  <p className="text-[10px] font-mono text-muted-foreground">Sample reply: "{testResult.reply}"</p>
                )}
                {testResult.latencyMs && (
                  <span className="text-[10px] text-muted-foreground block">
                    Response time: {testResult.latencyMs}ms
                  </span>
                )}
              </div>
            </div>
          )}
        </form>

        {/* Live Playground Tester */}
        <div className="pt-4 border-t border-border/60 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-[#B5F13E]" />
              Live AI Ledger Playground
            </h3>
            <span className="text-[10px] text-muted-foreground">
              Test how the AI Agent responds with live household financial context
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Ask the financial AI assistant anything..."
              className="h-10 px-3 rounded-xl bg-secondary/40 border border-border text-foreground text-xs flex-1 focus:outline-none focus:border-[#B5F13E]"
            />
            <button
              type="button"
              onClick={handlePlaygroundSend}
              disabled={playgroundLoading || !testPrompt.trim()}
              className="fuloozi-btn-primary h-10 px-4 text-xs font-semibold shadow-lime shrink-0 disabled:opacity-50"
            >
              {playgroundLoading ? 'Thinking...' : 'Ask AI'}
            </button>
          </div>

          {playgroundReply && (
            <div className="p-3.5 rounded-xl bg-secondary/40 border border-[#B5F13E]/30 space-y-1 animate-in fade-in">
              <span className="text-[10px] font-bold text-[#B5F13E] uppercase tracking-wider block">
                {config.providerName} ({config.model}) Reply:
              </span>
              <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                {playgroundReply}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
