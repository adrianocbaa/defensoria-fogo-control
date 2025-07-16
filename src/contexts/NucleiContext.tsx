import React, { createContext, useContext, ReactNode } from 'react';
import { Nucleus } from '@/types/nucleus';
import { useNuclei as useNucleiHook } from '@/hooks/useNuclei';

interface NucleiContextType {
  nuclei: Nucleus[];
  loading: boolean;
  error: string | null;
  addNucleus: (nucleus: Omit<Nucleus, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateNucleus: (nucleus: Nucleus) => Promise<void>;
  getNucleusById: (id: string) => Nucleus | undefined;
  refetch: () => Promise<void>;
}

const NucleiContext = createContext<NucleiContextType | undefined>(undefined);

export function NucleiProvider({ children }: { children: ReactNode }) {
  const nucleiData = useNucleiHook();

  return (
    <NucleiContext.Provider value={nucleiData}>
      {children}
    </NucleiContext.Provider>
  );
}

export function useNuclei() {
  const context = useContext(NucleiContext);
  if (context === undefined) {
    throw new Error('useNuclei must be used within a NucleiProvider');
  }
  return context;
}