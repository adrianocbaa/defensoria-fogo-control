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

  // CRITICAL: Check recovery mode BEFORE React renders anything
  useEffect(() => {
    const handleRecoveryFlow = async () => {
      const currentUrl = new URL(window.location.href);
      const urlParams = new URLSearchParams(currentUrl.search);
      const type = urlParams.get('type');
      const accessToken = urlParams.get('access_token');
      const refreshToken = urlParams.get('refresh_token');
      
      // Recovery mode detected
      if (type === 'recovery' && accessToken && refreshToken) {
        console.log('Recovery mode detected, preventing auto-login');
        
        // IMMEDIATELY sign out to prevent auto-login
        await supabase.auth.signOut();
        
        // Store tokens for password reset
        sessionStorage.setItem('recovery_access_token', accessToken);
        sessionStorage.setItem('recovery_refresh_token', refreshToken);
        sessionStorage.setItem('in_recovery_mode', 'true');
        
        // Clear state
        setSession(null);
        setUser(null);
        setLoading(false);
        
        // Clean URL
        window.history.replaceState({}, '', '/auth');
        
        return; // Stop here, don't set up listeners
      }

      // Normal auth flow
      const isRecoveryMode = sessionStorage.getItem('in_recovery_mode') === 'true';
      
      if (!isRecoveryMode) {
        // Set up auth state listener
        const suppressInitial = sessionStorage.getItem('suppress_initial_session') === 'true';
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            console.log('Auth state changed:', event);
            if (event === 'INITIAL_SESSION' && suppressInitial) {
              console.log('Initial session suppressed after signout');
              sessionStorage.removeItem('suppress_initial_session');
              setLoading(false);
              return;
            }
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
          }
        );

        // Check for existing session only if not suppressing
        if (!suppressInitial) {
          const { data: { session } } = await supabase.auth.getSession();
          setSession(session);
          setUser(session?.user ?? null);
        } else {
          sessionStorage.removeItem('suppress_initial_session');
        }
        setLoading(false);

        // Cleanup
        cleanupOldAttempts();

        return () => {
          subscription.unsubscribe();
        };
      } else {
        // In recovery mode - no auth checks
        console.log('In recovery mode, skipping auth setup');
        setLoading(false);
        cleanupOldAttempts();
      }
    };

    handleRecoveryFlow();
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

    // If login successful, check if user is active
    if (!error) {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (userId) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_active')
          .eq('user_id', userId)
          .maybeSingle();

        if (profileError || !profile || profile.is_active === false) {
          // User is inactive, sign them out immediately
          await supabase.auth.signOut();
          await logLoginAttempt(email, false, 'login');
          return { 
            error: { 
              message: 'Sua conta está bloqueada. Entre em contato com o administrador do sistema.',
              name: 'UserInactiveError',
              status: 403
            } as any 
          };
        }
      }
    }

    // Log the login attempt
    await logLoginAttempt(email, !error, 'login');

    return { error };
  };

  const signOut = async () => {
    try {
      // 1) Clear React state immediately
      setSession(null);
      setUser(null);

      // 2) Proactively clear any auth artifacts from storage
      try {
        const projectRef = 'mmumfgxngzaivvyqfbed';
        const possibleKeys = [
          `sb-${projectRef}-auth-token`,
          'supabase.auth.token',
        ];
        possibleKeys.forEach((k) => localStorage.removeItem(k));
        // Remove any leftover sb-* auth keys
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i) || '';
          if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
            localStorage.removeItem(key);
          }
        }
        // Clear recovery flow flags
        sessionStorage.removeItem('recovery_access_token');
        sessionStorage.removeItem('recovery_refresh_token');
        sessionStorage.removeItem('in_recovery_mode');
        // Mark to suppress INITIAL_SESSION once after signout
        sessionStorage.setItem('suppress_initial_session', 'true');
      } catch {}

      // 3) Invalidate current session with Supabase (global to revoke refresh token)
      await supabase.auth.signOut({ scope: 'global' });

      // 4) Small delay to ensure storage is flushed
      await new Promise((resolve) => setTimeout(resolve, 120));

      // 5) Hard redirect to login
      window.location.replace('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      window.location.replace('/auth');
    }
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