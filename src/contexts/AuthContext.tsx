import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useSecurityMonitor } from '@/hooks/useSecurityMonitor';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { logLoginAttempt, cleanupOldAttempts } = useSecurityMonitor();

  useEffect(() => {
    let isRecoveryFlow = false;

    // Check if we're in a password recovery flow
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    
    if (type === 'recovery' && accessToken && refreshToken) {
      isRecoveryFlow = true;
      
      // Store tokens temporarily in sessionStorage for password reset
      sessionStorage.setItem('recovery_access_token', accessToken);
      sessionStorage.setItem('recovery_refresh_token', refreshToken);
      
      // Immediately sign out any existing session
      supabase.auth.signOut();
      
      // Clear state to prevent auto-login
      setSession(null);
      setUser(null);
      setLoading(false);
      
      // The AuthPage will handle showing the password reset form
      return;
    }

    // Set up auth state listener only for non-recovery flows
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Double check we're not in recovery mode
        if (sessionStorage.getItem('recovery_access_token')) {
          return; // Don't process auth changes during recovery
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session only if not in recovery flow
    if (!isRecoveryFlow) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });
    }

    // Cleanup old login attempts on app start
    cleanupOldAttempts();

    return () => subscription.unsubscribe();
  }, [cleanupOldAttempts]);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName || email.split('@')[0]
        }
      }
    });

    // Log the signup attempt
    await logLoginAttempt(email, !error, 'signup');

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Log the login attempt
    await logLoginAttempt(email, !error, 'login');

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });

    return { error };
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signOut,
      resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}