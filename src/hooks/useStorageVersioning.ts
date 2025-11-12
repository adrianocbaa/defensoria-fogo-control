import { useEffect } from 'react';

const CURRENT_VERSION = '2.0.0'; // Incrementar quando houver mudanças estruturais
const VERSION_KEY = 'app_storage_version';

export function useStorageVersioning() {
  useEffect(() => {
    try {
      const storedVersion = localStorage.getItem(VERSION_KEY);
      
      // Se não há versão ou é diferente da atual, limpar tudo
      if (!storedVersion || storedVersion !== CURRENT_VERSION) {
        console.log('Detectada versão antiga ou corrompida do storage. Limpando...');
        
        // Limpar todo localStorage exceto a versão
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key !== VERSION_KEY) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Limpar sessionStorage também
        sessionStorage.clear();
        
        // Definir nova versão
        localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
        
        console.log('Storage limpo com sucesso. Nova versão:', CURRENT_VERSION);
        
        // Se houver usuário logado, fazer logout para evitar conflitos
        const hasAuthToken = keysToRemove.some(key => 
          key.includes('auth-token') || key.includes('supabase')
        );
        
        if (hasAuthToken && window.location.pathname !== '/auth') {
          console.log('Redirecionando para login após limpeza...');
          window.location.replace('/auth');
        }
      }
    } catch (error) {
      console.error('Erro ao verificar versão do storage:', error);
    }
  }, []);
}
