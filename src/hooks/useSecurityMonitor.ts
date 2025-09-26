import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSecurityMonitor() {
  const logLoginAttempt = useCallback(async (
    identifier: string, 
    success: boolean, 
    userAgent?: string
  ) => {
    try {
      // Try to get IP address from request (limited in browser context)
      const ipAddress = null; // Browser limitation - would need server-side implementation
      
      await supabase.rpc('log_login_attempt', {
        p_identifier: identifier,
        p_success: success,
        p_user_agent: userAgent || navigator.userAgent,
        p_ip_address: ipAddress
      });
    } catch (error) {
      console.warn('Falha ao registrar tentativa de login:', error);
    }
  }, []);

  const cleanupOldAttempts = useCallback(async () => {
    try {
      await supabase.rpc('cleanup_old_login_attempts');
    } catch (error) {
      console.warn('Falha ao limpar tentativas antigas:', error);
    }
  }, []);

  return {
    logLoginAttempt,
    cleanupOldAttempts
  };
}