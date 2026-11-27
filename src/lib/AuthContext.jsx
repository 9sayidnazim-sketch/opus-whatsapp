import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/api/client';

const AuthContext = createContext(null);

function getStoredHouseholdSession() {
  try {
    const raw = localStorage.getItem('fuloozi_ledger_session');
    if (raw && raw !== 'null') {
      const parsed = JSON.parse(raw);
      if (parsed?.access_token) return parsed;
    }
  } catch {}
  return null;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getStoredHouseholdSession());

  useEffect(() => {
    let active = true;

    const syncSession = (next) => {
      if (!active) return;
      if (next) {
        setSession(next);
      } else {
        const stored = getStoredHouseholdSession();
        setSession(stored);
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (active) syncSession(data?.session);
    }).catch(() => {
      if (active) syncSession(null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, next) => {
      syncSession(next);
    });

    const handleStorage = (e) => {
      if (e.key === 'fuloozi_ledger_session') {
        syncSession(getStoredHouseholdSession());
      }
    };

    const handleCustomSync = () => {
      syncSession(getStoredHouseholdSession());
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('fuloozi_auth_sync', handleCustomSync);

    return () => {
      active = false;
      subscription?.unsubscribe?.();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('fuloozi_auth_sync', handleCustomSync);
    };
  }, []);

  return <AuthContext.Provider value={session}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

