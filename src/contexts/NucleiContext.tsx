import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Nucleus } from '@/types/nucleus';
import { mockNuclei } from '@/data/mockNuclei';

interface NucleiContextType {
  nuclei: Nucleus[];
  setNuclei: React.Dispatch<React.SetStateAction<Nucleus[]>>;
  addNucleus: (nucleus: Nucleus) => void;
  getNucleusById: (id: string) => Nucleus | undefined;
}

const NucleiContext = createContext<NucleiContextType | undefined>(undefined);

export function NucleiProvider({ children }: { children: ReactNode }) {
  const [nuclei, setNuclei] = useState<Nucleus[]>(mockNuclei);

  const addNucleus = (nucleus: Nucleus) => {
    setNuclei(prev => [...prev, nucleus]);
  };

  const getNucleusById = (id: string) => {
    return nuclei.find(nucleus => nucleus.id === id);
  };

  return (
    <NucleiContext.Provider value={{ 
      nuclei, 
      setNuclei, 
      addNucleus, 
      getNucleusById 
    }}>
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