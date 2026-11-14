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
  const [signup, setSignup] = useState(false);
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const emailOtpEnabled = import.meta.env.VITE_EMAIL_OTP_ENABLED === 'true';
  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setStatus('');
    const fields = new FormData(event.currentTarget);
    const credentials = { email: fields.get('email'), password: fields.get('password') };
    try {
      const { error } = signup
        ? await supabase.auth.signUp({ ...credentials, options: { emailRedirectTo: window.location.origin } })
        : await supabase.auth.signInWithPassword(credentials);
      if (error) throw error;
      if (signup) setVerificationEmail(credentials.email);
    } catch (error) {
      setStatus(error.message || 'Unable to sign in');
    } finally {
      setPending(false);
    }
  }
  async function verify(event) {
    event.preventDefault();
    setPending(true);
    setStatus('');
    const token = new FormData(event.currentTarget).get('code');
    try {
      const { error } = await supabase.auth.verifyOtp({ email: verificationEmail, token, type: 'email' });
      if (error) throw error;
    } catch {
      setStatus('That code is invalid or has expired. Check it or request a new code.');
    } finally { setPending(false); }
  }

  async function resend() {
    setPending(true);
    setStatus('');
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: verificationEmail });
      if (error) throw error;
      setStatus(emailOtpEnabled ? 'A new code was sent' : 'A new verification email was sent');
    } catch {
      setStatus('Could not resend the verification email. Wait a minute and try again.');
    } finally { setPending(false); }
  }

  if (verificationEmail) return <main className="min-h-screen grid place-items-center bg-background p-6">
    <section className="w-full max-w-md rounded-xl border bg-card p-8">
      <p className="text-sm font-medium text-primary">OPUS by Octapus</p>
      <h1 className="mt-4 text-3xl font-semibold">Verify your email</h1>
      <p className="mt-3 break-words text-muted-foreground">
        {emailOtpEnabled ? 'Enter the six-digit code sent to ' : 'Open the verification link sent to '}{verificationEmail}
      </p>
      {emailOtpEnabled && <form className="mt-6 space-y-4" onSubmit={verify}>
        <label className="block text-sm">Verification code
          <Input className="mt-2" name="code" autoComplete="one-time-code"
            inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required />
        </label>
        <Button className="w-full" disabled={pending}>Verify email</Button>
      </form>}
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-primary">
        <button type="button" className="underline" onClick={resend} disabled={pending}>{emailOtpEnabled ? 'Resend code' : 'Resend verification email'}</button>
        <button type="button" className="underline" disabled={pending} onClick={() => {
          setVerificationEmail('');
          setStatus('');
        }}>Change email</button>
      </div>
      <details className="mt-5 border-t pt-4 text-sm">
        <summary className="cursor-pointer text-primary">Try another verification method</summary>
        <p className="mt-2 text-muted-foreground">Verification currently uses email. If you cannot access this inbox, use a different email address.</p>
        <button type="button" className="mt-2 text-primary underline" disabled={pending} onClick={() => {
          setVerificationEmail('');
          setStatus('');
          setSignup(false);
        }}>Back to sign in</button>
      </details>
      {status && <p role="status" className="mt-4 text-sm">{status}</p>}
    </section>
  </main>;

  return <main className="min-h-screen grid place-items-center bg-background p-6">
    <section className="w-full max-w-md rounded-xl border bg-card p-8">
      <p className="text-sm text-primary font-medium">OPUS by Octapus</p>
      <h1 className="mt-4 text-3xl font-semibold">{signup ? 'Create your account' : 'Sign in to your household ledger'}</h1>
      <p className="mt-3 text-muted-foreground">Track spending, bills and savings in one place</p>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block text-sm">Email<Input name="email" type="email" autoComplete="email" required className="mt-2" /></label>
        <label className="block text-sm">Password<Input name="password" type="password" autoComplete={signup ? 'new-password' : 'current-password'} required minLength={6} className="mt-2" /></label>
        <Button className="w-full" disabled={pending}>{signup ? 'Create account' : 'Sign in'}</Button>
        {status && <p role="status" className="text-sm">{status}</p>}
      </form>
      <button className="mt-4 text-sm text-primary underline" onClick={() => { setSignup(!signup); setStatus(''); }}>
        {signup ? 'Back to sign in' : 'Create an account'}
      </button>
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
