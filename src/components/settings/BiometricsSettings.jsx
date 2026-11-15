import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Fingerprint,
  ShieldCheck,
  Trash2,
  Laptop,
  Sliders,
  RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  checkBiometricsSupport,
  registerBiometrics,
  authenticateWithBiometrics,
  getRegisteredCredentials,
  removeCredential,
  getDeviceName,
} from "@/utils/webauthn";
import { useAuth } from "@/lib/AuthContext";

const POLICY_KEY = 'fuloozi_admin_biometrics_policy';

export default function BiometricsSettings() {
  const session = useAuth();
  const username = session?.user?.user_metadata?.username || 'owner';
  const displayName = session?.user?.user_metadata?.full_name || 'Household Admin';

  const [supportInfo, setSupportInfo] = useState({ supported: false, hasBiometrics: false, loading: true });
  const [credentials, setCredentials] = useState([]);
  const [enrolling, setEnrolling] = useState(false);
  const [testing, setTesting] = useState(false);

  const [policy, setPolicy] = useState(() => {
    try {
      const saved = localStorage.getItem(POLICY_KEY);
      return saved ? JSON.parse(saved) : {
        allowLogin: true,
        requireStepUp: false,
        stepUpThreshold: 1000,
      };
    } catch {
      return { allowLogin: true, requireStepUp: false, stepUpThreshold: 1000 };
    }
  });

  useEffect(() => {
    checkBiometricsSupport().then(({ supported, hasBiometrics }) => {
      setSupportInfo({ supported, hasBiometrics, loading: false });
      if (supported) {
        setCredentials(getRegisteredCredentials());
      }
    });
  }, []);

  function handlePolicyChange(field, value) {
    const next = { ...policy, [field]: value };
    setPolicy(next);
    localStorage.setItem(POLICY_KEY, JSON.stringify(next));
    toast.success('Admin passkey policy updated');
  }

  async function handleEnroll() {
    setEnrolling(true);
    try {
      const result = await registerBiometrics({
        username,
        displayName,
      });

      if (result.success) {
        toast.success("Touch ID / Face ID passkey enrolled successfully!");
        setCredentials(getRegisteredCredentials());
      }
    } catch (err) {
      if (!err.message?.includes('cancelled')) {
        toast.error(err.message || "Failed to register biometrics");
      }
    } finally {
      setEnrolling(false);
    }
  }

  async function handleTestBiometrics() {
    setTesting(true);
    try {
      const res = await authenticateWithBiometrics(username);
      if (res.success) {
        toast.success("Biometric verification verified by device enclave!");
      }
    } catch (err) {
      if (!err.message?.includes('cancelled')) {
        toast.error(err.message || "Biometric test failed");
      }
    } finally {
      setTesting(false);
    }
  }

  function handleRemove(id) {
    const updated = removeCredential(id);
    setCredentials(updated);
    toast.success("Passkey credential revoked from this device");
  }

  return (
    <div className="space-y-6">
      {/* Main Admin Card */}
      <Card className="rounded-2xl border-border bg-card shadow-none">
        <CardHeader className="p-5 border-b border-border/80 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#B5F13E]/15 rounded-xl text-[#B5F13E]">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold">Passkey Biometrics & Device Control</CardTitle>
                <span className="px-2 py-0.5 rounded-full bg-[#B5F13E]/15 text-[#B5F13E] border border-[#B5F13E]/30 text-[10px] font-bold uppercase tracking-wider">
                  Admin Only
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  supportInfo.supported
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                }`}>
                  {supportInfo.supported ? 'Touch ID / Face ID Ready' : 'Unsupported Browser'}
                </span>
              </div>
              <CardDescription className="text-xs">
                Restricted administrator control over WebAuthn passkey registration, enrolled hardware, and sign-in enforcement policies.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-6">
          {/* Hardware Enrolment Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-secondary/40 border border-border/60">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#B5F13E]" />
                <p className="text-sm font-semibold text-foreground">
                  {credentials.length > 0
                    ? `${credentials.length} passkey credential(s) active on this machine`
                    : 'No passkeys registered on this device yet'}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Detected hardware: <strong className="text-foreground">{getDeviceName()}</strong> · Platform Authenticator:{' '}
                <strong className={supportInfo.hasBiometrics ? 'text-emerald-400' : 'text-muted-foreground'}>
                  {supportInfo.hasBiometrics ? 'Available' : 'Emulated / Security Key'}
                </strong>
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleEnroll}
                disabled={enrolling || !supportInfo.supported}
                className="fuloozi-btn-primary px-4 py-2 text-xs font-semibold shadow-lime inline-flex items-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                <Fingerprint className="w-3.5 h-3.5" />
                {enrolling ? 'Touch Sensor / Scan Face...' : 'Enroll This Device'}
              </button>

              {credentials.length > 0 && (
                <button
                  type="button"
                  onClick={handleTestBiometrics}
                  disabled={testing}
                  className="px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#B5F13E]" />
                  {testing ? 'Verifying...' : 'Test Sensor'}
                </button>
              )}
            </div>
          </div>

          {/* Household Biometric Policies */}
          <div className="p-4 rounded-xl border border-border/70 bg-secondary/20 space-y-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#B5F13E]" />
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Household Access Policies (Admin Managed)
              </h3>
            </div>

            <div className="space-y-3 divide-y divide-border/60 text-xs">
              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="font-semibold text-foreground">Enable Biometric Login on Sign In Screen</p>
                  <p className="text-muted-foreground text-[11px] mt-0.5">
                    Allow users to unlock the ledger with Touch ID or Face ID directly from the authentication screen.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handlePolicyChange('allowLogin', !policy.allowLogin)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    policy.allowLogin ? 'bg-[#B5F13E]' : 'bg-secondary'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                      policy.allowLogin ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="font-semibold text-foreground">Biometric Confirmation for High-Value Transactions</p>
                  <p className="text-muted-foreground text-[11px] mt-0.5">
                    Require Touch ID or Face ID step-up before recording single expenses exceeding AED 1,000.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handlePolicyChange('requireStepUp', !policy.requireStepUp)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    policy.requireStepUp ? 'bg-[#B5F13E]' : 'bg-secondary'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                      policy.requireStepUp ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Credentials Registry */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Enrolled Device Passkeys ({credentials.length})
              </p>
              <span className="text-[11px] text-muted-foreground">Admin credential registry</span>
            </div>

            {credentials.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-border text-center text-muted-foreground space-y-1">
                <Fingerprint className="w-8 h-8 mx-auto text-muted-foreground/40 mb-1" />
                <p className="text-xs">No passkey credentials registered on this browser.</p>
                <p className="text-[11px] text-muted-foreground/70">Click "Enroll This Device" above to create an authenticated passkey.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {credentials.map((cred) => (
                  <div
                    key={cred.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-secondary/20 hover:bg-secondary/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-card border border-border">
                        <Laptop className="w-4 h-4 text-[#B5F13E]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-foreground">{cred.deviceName || 'Enrolled Device'}</p>
                          <span className="px-1.5 py-0.2 rounded bg-secondary text-[10px] text-muted-foreground border border-border">
                            @{cred.username}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Enrolled on {new Date(cred.created_at).toLocaleDateString('en-AE', { month: 'short', day: 'numeric', year: 'numeric' })} · ID: {cred.id.slice(0, 16)}...
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemove(cred.id)}
                      className="p-2 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Revoke passkey"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Security Standards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground pt-1 border-t border-border/60">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#B5F13E]" />
              <span>SimpleWebAuthn / FIDO2</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Apple Secure Enclave / TPM</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>Admin Controlled Policies</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
