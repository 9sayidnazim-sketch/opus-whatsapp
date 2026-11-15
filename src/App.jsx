import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/api/client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { pagesConfig } from './pages.config';

const { Pages, Layout } = pagesConfig;
const Dashboard = Pages.Dashboard;

function SignIn() {
  const [step, setStep] = useState('name');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [created, setCreated] = useState(null);
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState(false);

  async function startSession(account) {
    const { error } = await supabase.auth.setSession({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
    });
    if (error) throw error;
  }

  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    setStatus('');
    const fields = new FormData(event.currentTarget);
    const enteredPin = fields.get('pin');
    if (step === 'name') {
      setName(fields.get('name').trim());
      setStep('pin');
      return;
    }
    if (step === 'pin') {
      setPin(enteredPin);
      setStep('confirm');
      return;
    }
    if (step === 'confirm' && enteredPin !== pin) {
      setStatus('The MPINs don’t match. Enter the same four digits.');
      return;
    }
    setPending(true);
    try {
      const response = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
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
    } finally { setPending(false); }
  }

  const titles = { name:'What’s your name?', pin:'Create your MPIN', confirm:'Confirm your MPIN',
    login:'Sign in to OPUS', created:'Your account is ready' };
  const labels = { name:'Next', pin:'Next', confirm:'Create account', login:'Sign in' };
  function navigate(next) {
    setStep(next);
    setStatus('');
    setPin('');
  }

  return <main className="min-h-screen grid place-items-center bg-background p-6">
    <section className="w-full max-w-md rounded-xl border bg-card p-8">
      <p className="text-sm font-medium text-primary">OPUS by Octapus</p>
      <h1 className="mt-4 text-3xl font-semibold">{titles[step]}</h1>
      {step === 'created' ? <>
        <div className="my-5 rounded-lg border bg-accent p-4" role="status">
          <p className="text-sm text-muted-foreground">Your sign-in ID</p>
          <p className="mt-1 text-xl font-semibold">@{created.username}</p>
        </div>
        <Button className="w-full" disabled={pending} onClick={async () => {
          setPending(true);
          try { await startSession(created); }
          catch { setStatus('Could not open your account. Sign in with the ID shown above.'); setPending(false); }
        }}>Open my ledger</Button>
      </> : <>
        <form key={step} className="mt-6 space-y-4" onSubmit={submit}>
          {(step === 'name' || step === 'login') && <label className="block text-sm">
            {step === 'name' ? 'Name' : 'Username'}
            <Input name="name" required minLength={2} maxLength={60}
              autoComplete={step === 'name' ? 'name' : 'username'} className="mt-2" />
          </label>}
          {step !== 'name' && <label className="block text-sm">
            {step === 'confirm' ? 'Confirm four-digit MPIN' : 'Four-digit MPIN'}
            <Input name="pin" type="password" inputMode="numeric" pattern="[0-9]{4}"
              minLength={4} maxLength={4} required autoComplete={step === 'login' ? 'current-password' : 'new-password'} className="mt-2" />
          </label>}
          <Button className="w-full" disabled={pending}>{labels[step]}</Button>
        </form>
        <button type="button" className="mt-4 text-sm text-primary underline" disabled={pending}
          onClick={() => navigate(step === 'name' ? 'login' : step === 'confirm' ? 'pin' : 'name')}>
          {step === 'name' ? 'I already have a username' : step === 'confirm' ? 'Choose a different MPIN' : step === 'pin' ? 'Change name' : 'Create an account'}
        </button>
      </>}
      {status && <p role="alert" className="mt-4 text-sm text-destructive">{status}</p>}
    </section>
  </main>;
}

function Workspace() {
  const [cache] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));
  return <QueryClientProvider client={cache}><BrowserRouter><Routes>
    <Route path="/" element={<Layout currentPageName="Dashboard"><Dashboard /></Layout>} />
    {Object.entries(Pages).map(([name, Page]) =>
      <Route key={name} path={`/${name}`} element={<Layout currentPageName={name}><Page /></Layout>} />
    )}
    <Route path="*" element={<main className="p-8"><Link to="/">Return to dashboard</Link></main>} />
  </Routes></BrowserRouter><Toaster /></QueryClientProvider>;
}

function SessionGate() {
  const session = useAuth();
  if (session === undefined) return <p className="p-8" role="status">Loading OPUS</p>;
  return session ? <Workspace key={session.user.id} /> : <SignIn />;
}

export default function App() {
  return <AuthProvider><SessionGate /></AuthProvider>;
}
