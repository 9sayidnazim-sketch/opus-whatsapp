import FulooziBrand from "@/components/FulooziBrand";
import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes, Link, Navigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/api/client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { pagesConfig } from './pages.config';
import { Sparkles, ArrowRight, ShieldCheck, Fingerprint, ScanFace } from 'lucide-react';
import {
  checkBiometricsSupport,
  authenticateWithBiometrics,
  registerBiometrics,
  getRegisteredCredentials,
} from '@/utils/webauthn';

const { Pages, Layout } = pagesConfig;
const Dashboard = Pages.Dashboard;

function SignIn() {
  const [step, setStep] = useState('name');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [created, setCreated] = useState(null);
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [registeredCreds, setRegisteredCreds] = useState([]);
  const [biometricPending, setBiometricPending] = useState(false);

  useEffect(() => {
    checkBiometricsSupport().then(({ supported }) => {
      let allowed = true;
      try {
        const policy = JSON.parse(localStorage.getItem('fuloozi_admin_biometrics_policy') || '{}');
        if (policy.allowLogin === false) allowed = false;
      } catch {}
      setBiometricsAvailable(supported && allowed);
      if (supported) {
        const creds = getRegisteredCredentials();
        setRegisteredCreds(creds);
      }
    });
  }, []);

  async function startSession(account) {
    const { error } = await supabase.auth.setSession({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      username: account.username,
    });
    if (error) throw error;
  }

  async function handleBiometricSignIn() {
    setPending(true);
    setStatus('');
    try {
      const res = await authenticateWithBiometrics();
      if (res.success && res.account) {
        toast.success('Biometric authentication verified');
        await startSession(res.account);
      }
    } catch (err) {
      if (!err.message?.includes('cancelled')) {
        setStatus(err.message || 'Biometric authentication failed. Please enter your MPIN.');
      }
    } finally {
      setPending(false);
    }
  }

  async function handleRegisterBiometricsOnCreate() {
    if (!created) return;
    setBiometricPending(true);
    try {
      await registerBiometrics({
        username: created.username,
        displayName: name || created.username,
      });
      toast.success('Touch ID / Face ID registered for this device!');
      await startSession(created);
    } catch (err) {
      setStatus(err.message || 'Could not register biometrics');
      setBiometricPending(false);
    }
  }

  async function handleDemoLogin() {
    setPending(true);
    try {
      await startSession({
        username: 'owner',
        access_token: 'demo-access-token',
        refresh_token: 'demo-refresh-token',
      });
    } catch (err) {
      setStatus(err.message || 'Could not start demo session');
    } finally {
      setPending(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    setStatus('');
    const fields = new FormData(event.currentTarget);
    const enteredPin = fields.get('pin');

    if (step === 'name') {
      const val = (fields.get('name') || '').trim();
      if (!val) {
        setStatus('Please enter your name');
        return;
      }
      setName(val);
      setStep('pin');
      return;
    }

    if (step === 'pin') {
      if (!/^\d{4}$/.test(enteredPin)) {
        setStatus('Please enter exactly 4 digits');
        return;
      }
      setPin(enteredPin);
      setStep('confirm');
      return;
    }

    if (step === 'confirm' && enteredPin !== pin) {
      setStatus('The MPINs do not match. Enter the same four digits.');
      return;
    }

    setPending(true);
    try {
      const response = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: step === 'login' ? 'login' : 'create',
          name: step === 'login' ? fields.get('name') : name,
          pin: enteredPin,
        }),
      });
      const account = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(account.error || 'Account service is unavailable');
      if (step === 'login') await startSession(account);
      else {
        setCreated(account);
        setPin('');
        setStep('created');
      }
    } catch (error) {
      setStatus(error.message);
    } finally {
      setPending(false);
    }
  }

  const titles = {
    name: 'What’s your name?',
    pin: 'Create 4-Digit MPIN',
    confirm: 'Confirm your MPIN',
    login: 'Sign in to Fuloozi',
    created: 'Your ledger is ready',
  };
  const labels = { name: 'Next', pin: 'Next', confirm: 'Create Account', login: 'Sign In' };

  function navigate(next) {
    setStep(next);
    setStatus('');
    setPin('');
  }

  return (
    <main className="min-h-screen grid place-items-center bg-background p-4 sm:p-6 text-foreground">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <FulooziBrand size={36} />
          <span className="px-2 py-0.5 rounded-full bg-[#B5F13E]/15 text-[#B5F13E] text-[10px] font-bold uppercase tracking-wider">
            Ledger
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-bold font-heading tracking-tight">{titles[step]}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Secure household access with simple 4-digit authentication
          </p>
        </div>

        {step === 'created' ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-secondary/60 p-4" role="status">
              <p className="text-xs text-muted-foreground">Your Household Handle</p>
              <p className="mt-1 text-xl font-bold text-[#B5F13E] font-heading">@{created.username}</p>
            </div>

            {biometricsAvailable && (
              <button
                type="button"
                onClick={handleRegisterBiometricsOnCreate}
                disabled={biometricPending || pending}
                className="w-full h-11 rounded-xl bg-secondary hover:bg-secondary/80 border border-[#B5F13E]/40 text-foreground flex items-center justify-center gap-2 text-xs font-semibold transition-all hover:border-[#B5F13E]"
              >
                <Fingerprint className="w-4 h-4 text-[#B5F13E]" />
                {biometricPending ? 'Enrolling Touch ID / Face ID...' : 'Enable Face ID / Touch ID on This Device'}
              </button>
            )}

            <button
              className="fuloozi-btn-primary w-full h-11 text-sm font-semibold shadow-lime"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                try {
                  await startSession(created);
                } catch {
                  setStatus('Could not open your account. Sign in with the ID shown above.');
                  setPending(false);
                }
              }}
            >
              Open Household Ledger
            </button>
          </div>
        ) : (
          <>
            {biometricsAvailable && (step === 'name' || step === 'login') && (
              <div className="space-y-3 pb-1">
                <button
                  type="button"
                  onClick={handleBiometricSignIn}
                  disabled={pending}
                  className="w-full h-12 rounded-xl bg-secondary/80 hover:bg-secondary border border-[#B5F13E]/30 hover:border-[#B5F13E] text-foreground flex items-center justify-center gap-2.5 font-semibold text-sm transition-all group shadow-sm disabled:opacity-50"
                >
                  <Fingerprint className="w-5 h-5 text-[#B5F13E] group-hover:scale-110 transition-transform" />
                  <span>Sign in with Face ID / Touch ID</span>
                </button>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground justify-center uppercase tracking-wider">
                  <span className="h-px bg-border/80 flex-1" />
                  <span>or enter MPIN</span>
                  <span className="h-px bg-border/80 flex-1" />
                </div>
              </div>
            )}

            <form key={step} className="space-y-4" onSubmit={submit}>
              {(step === 'name' || step === 'login') && (
                <div className="space-y-1.5">
                  <label htmlFor="auth-name" className="text-xs font-medium text-foreground">
                    {step === 'name' ? 'Your Name' : 'Username (@handle)'}
                  </label>
                  <Input
                    id="auth-name"
                    name="name"
                    required
                    minLength={2}
                    maxLength={60}
                    placeholder={step === 'name' ? 'e.g. Tariq' : 'e.g. owner'}
                    autoComplete={step === 'name' ? 'name' : 'username'}
                    className="h-11 rounded-xl bg-secondary/50 border-border text-sm"
                    autoFocus
                  />
                </div>
              )}

              {step !== 'name' && (
                <div className="space-y-1.5">
                  <label htmlFor="auth-pin" className="text-xs font-medium text-foreground">
                    {step === 'confirm' ? 'Confirm 4-digit MPIN' : '4-digit MPIN passcode'}
                  </label>
                  <Input
                    id="auth-pin"
                    name="pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]{4}"
                    minLength={4}
                    maxLength={4}
                    placeholder="••••"
                    required
                    autoComplete={step === 'login' ? 'current-password' : 'new-password'}
                    className="h-11 rounded-xl bg-secondary/50 border-border text-center text-lg tracking-[0.4em] font-heading"
                    autoFocus
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={pending}
                className="fuloozi-btn-primary w-full h-11 text-sm font-semibold shadow-lime disabled:opacity-50"
              >
                {labels[step]}
              </button>
            </form>

            <div className="flex flex-col gap-2 pt-2 border-t border-border/60 text-center">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                disabled={pending}
                onClick={() => navigate(step === 'name' ? 'login' : step === 'confirm' ? 'pin' : 'name')}
              >
                {step === 'name'
                  ? 'Already have an MPIN? Sign in'
                  : step === 'confirm'
                  ? 'Choose a different MPIN'
                  : step === 'pin'
                  ? 'Back to name'
                  : 'New here? Create an account'}
              </button>

              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={pending}
                className="inline-flex items-center justify-center gap-1.5 text-xs text-[#B5F13E] hover:underline pt-2 font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" /> Instant Preview (One-click Demo)
              </button>
            </div>
          </>
        )}

        {status && (
          <p role="alert" className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-rose-400">
            {status}
          </p>
        )}
      </section>
    </main>
  );
}

function Workspace() {
  const [cache] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));

  return (
    <QueryClientProvider client={cache}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Layout currentPageName="Dashboard"><Dashboard /></Layout>} />
          
          {Object.entries(Pages).map(([name, Page]) => {
            const pathLower = name.toLowerCase();
            return (
              <Route
                key={name}
                path={`/${pathLower}`}
                element={<Layout currentPageName={name}><Page /></Layout>}
              />
            );
          })}

          {/* Fallback & aliases */}
          <Route path="/ledger" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#181b1f',
            color: '#fafafa',
            border: '1px solid #262a30',
            borderRadius: '12px',
            fontSize: '13px',
          },
        }}
      />
    </QueryClientProvider>
  );
}

function SessionGate() {
  const session = useAuth();
  if (session === undefined) {
    return (
      <main className="min-h-screen grid place-items-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <FulooziBrand size={40} />
          <p className="text-xs text-muted-foreground animate-pulse">Opening your ledger...</p>
        </div>
      </main>
    );
  }
  return session ? <Workspace key={session.user.id} /> : <SignIn />;
}

export default function App() {
  return (
    <AuthProvider>
      <SessionGate />
    </AuthProvider>
  );
}
