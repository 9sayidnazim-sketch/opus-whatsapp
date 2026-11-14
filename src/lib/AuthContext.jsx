import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, next) => setSession(next));
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  return <AuthContext.Provider value={session}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
