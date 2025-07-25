import React, { createContext, useContext, ReactNode } from 'react';
import { Nucleus } from '@/types/nucleus';
import { useNuclei as useNucleiData } from '@/hooks/useNuclei';

interface NucleiContextType {
  nuclei: Nucleus[];
  loading: boolean;
  error: string | null;
  addNucleus: (nucleus: Omit<Nucleus, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateNucleus: (nucleus: Nucleus) => Promise<void>;
  deleteNucleus: (nucleusId: string) => Promise<void>;
  getNucleusById: (id: string) => Nucleus | undefined;
  refetch: () => Promise<void>;
}

const NucleiContext = createContext<NucleiContextType | undefined>(undefined);

export function NucleiProvider({ children }: { children: ReactNode }) {
  const nucleiContextData = useNucleiData();

  return (
    <NucleiContext.Provider value={nucleiContextData}>
      {children}
    </NucleiContext.Provider>
  );
}

export function useNucleiContext() {
  const context = useContext(NucleiContext);
  if (context === undefined) {
    throw new Error('useNucleiContext must be used within a NucleiProvider');
  }
  return context;
}