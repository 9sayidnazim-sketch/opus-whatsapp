import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Fingerprint, ScanFace, ShieldCheck, Trash2, Smartphone, Check, Laptop } from "lucide-react";
import toast from "react-hot-toast";
import {
  checkBiometricsSupport,
  registerBiometrics,
  getRegisteredCredentials,
  removeCredential,
  getDeviceName,
} from "@/utils/webauthn";
import { useAuth } from "@/lib/AuthContext";

export default function BiometricsSettings() {
  const session = useAuth();
  const username = session?.user?.user_metadata?.username || 'owner';
  const displayName = session?.user?.user_metadata?.full_name || 'Household Owner';

  const [supportInfo, setSupportInfo] = useState({ supported: false, hasBiometrics: false, loading: true });
  const [credentials, setCredentials] = useState([]);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    checkBiometricsSupport().then(({ supported, hasBiometrics }) => {
      setSupportInfo({ supported, hasBiometrics, loading: false });
      if (supported) {
        setCredentials(getRegisteredCredentials(username));
      }
    });
  }, [username]);

  async function handleEnroll() {
    setEnrolling(true);
    try {
      const result = await registerBiometrics({
        username,
        displayName,
      });

      if (result.success) {
        toast.success("Touch ID / Face ID registered for this device!");
        setCredentials(getRegisteredCredentials(username));
      }
    } catch (err) {
      if (!err.message?.includes('cancelled')) {
        toast.error(err.message || "Failed to register biometrics");
      }
    } finally {
      setEnrolling(false);
    }
  }

  function handleRemove(id) {
    const updated = removeCredential(id);
    setCredentials(updated.filter(c => c.username?.toLowerCase() === username.toLowerCase()));
    toast.success("Biometric credential removed from this device");
  }

  return (
    <Card className="rounded-2xl border-border bg-card">
      <CardHeader className="p-5 border-b border-border/80 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#B5F13E]/15 rounded-xl text-[#B5F13E]">
            <Fingerprint className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">Biometric Security & Passkeys</CardTitle>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                supportInfo.supported
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}>
                {supportInfo.supported ? 'Touch ID / Face ID Ready' : 'Unsupported Browser'}
              </span>
            </div>
            <CardDescription className="text-xs">
              Fast, passwordless sign-in with your device's fingerprint or facial scanner via WebAuthn
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-5">
        {/* Enrolled Status Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-secondary/40 border border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#B5F13E]" />
              <p className="text-sm font-semibold text-foreground">
                {credentials.length > 0
                  ? 'Passkey biometrics active on this device'
                  : 'No passkeys registered yet'}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Current hardware: <strong className="text-foreground">{getDeviceName()}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={handleEnroll}
            disabled={enrolling || !supportInfo.supported}
            className="fuloozi-btn-primary px-4 py-2 text-xs font-semibold shadow-lime inline-flex items-center gap-1.5 shrink-0 disabled:opacity-50"
          >
            <Fingerprint className="w-3.5 h-3.5" />
            {enrolling ? 'Touch Sensor / Look at Camera...' : 'Register Touch ID / Face ID'}
          </button>
        </div>

        {/* Credentials List */}
        {credentials.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Enrolled Passkeys ({credentials.length})
            </p>
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
                      <p className="text-xs font-semibold text-foreground">{cred.deviceName || 'Personal Device'}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Enrolled {new Date(cred.created_at).toLocaleDateString('en-AE', { month: 'short', day: 'numeric', year: 'numeric' })} · Passkey ID: {cred.id.slice(0, 10)}...
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemove(cred.id)}
                    className="p-2 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Remove passkey"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feature bullets */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground pt-1 border-t border-border/60">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#B5F13E]" />
            <span>FIDO2 / W3C WebAuthn compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Hardware biometric enclave</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>End-to-end cryptographic keys</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

