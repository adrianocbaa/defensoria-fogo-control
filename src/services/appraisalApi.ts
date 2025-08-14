import { supabase } from '@/integrations/supabase/client';

// Types
export interface Property {
  id?: string;
  org_id?: string;
  kind: 'urban' | 'rural';
  address?: string;
  lat?: number;
  lon?: number;
  land_area?: number;
  built_area?: number;
  quality?: string;
  age?: number;
  condition?: string;
  zoning?: string;
  constraints?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Project {
  id?: string;
  org_id?: string;
  property_id?: string;
  purpose?: string;
  base_date?: string;
  approach?: string;
  status?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Comparable {
  id?: string;
  org_id?: string;
  kind: 'urban' | 'rural';
  source?: string;
  date?: string;
  deal_type?: 'sale' | 'rent' | 'offer';
  price_total?: number;
  price_unit?: number;
  land_area?: number;
  built_area?: number;
  quality?: string;
  age?: number;
  condition?: string;
  payment_terms?: string;
  exposure_time?: number;
  lat?: number;
  lon?: number;
  notes?: string;
  attachments?: any[];
  created_at?: string;
}

// Properties API
export const propertiesApi = {
  async list(): Promise<Property[]> {
    // Return mock data for now - will connect to database later
    return getMockData().properties;
  },

  async create(property: Omit<Property, 'id' | 'created_at' | 'updated_at'>): Promise<Property> {
    // Mock implementation for now
    console.log('Creating property:', property);
    return { id: 'new-' + Date.now(), ...property } as Property;
  },

  async update(id: string, property: Partial<Property>): Promise<Property> {
    // Mock implementation for now
    console.log('Updating property:', id, property);
    return { id, ...property } as Property;
  },

  async delete(id: string): Promise<void> {
    // Mock implementation for now
    console.log('Deleting property:', id);
  },

  async getById(id: string): Promise<Property | null> {
    // Mock implementation for now
    console.log('Getting property by id:', id);
    return getMockData().properties.find(p => p.id === id) || null;
  }
};

// Projects API
export const projectsApi = {
  async list(): Promise<Project[]> {
    // Return mock data for now - will connect to database later
    return getMockData().projects;
  },

  async create(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
    // Mock implementation for now
    console.log('Creating project:', project);
    return { id: 'new-' + Date.now(), ...project } as Project;
  },

  async update(id: string, project: Partial<Project>): Promise<Project> {
    // Mock implementation for now
    console.log('Updating project:', id, project);
    return { id, ...project } as Project;
  },

  async delete(id: string): Promise<void> {
    // Mock implementation for now
    console.log('Deleting project:', id);
  },

  async getById(id: string): Promise<Project | null> {
    // Mock implementation for now
    console.log('Getting project by id:', id);
    return getMockData().projects.find(p => p.id === id) || null;
  }
};

// Comparables API
export const comparablesApi = {
  async list(): Promise<Comparable[]> {
    // Return mock data for now - will connect to database later
    return getMockData().comparables;
  },

  async create(comparable: Omit<Comparable, 'id' | 'created_at'>): Promise<Comparable> {
    // Mock implementation for now
    console.log('Creating comparable:', comparable);
    return { id: 'new-' + Date.now(), ...comparable } as Comparable;
  },

  async update(id: string, comparable: Partial<Comparable>): Promise<Comparable> {
    // Mock implementation for now
    console.log('Updating comparable:', id, comparable);
    return { id, ...comparable } as Comparable;
  },

  async delete(id: string): Promise<void> {
    // Mock implementation for now
    console.log('Deleting comparable:', id);
  },

  async getById(id: string): Promise<Comparable | null> {
    // Mock implementation for now
    console.log('Getting comparable by id:', id);
    return getMockData().comparables.find(c => c.id === id) || null;
  }
};

// Mock data for development (when no real data exists)
export const getMockData = () => ({
  projects: [
    {
      id: 'mock-1',
      purpose: 'Avaliação para garantia hipotecária',
      status: 'in_progress',
      base_date: '2024-01-15',
      approach: 'Comparativo de mercado',
      created_at: '2024-01-15T10:00:00Z'
    }
  ],
  properties: [
    {
      id: 'mock-1',
      address: 'Rua das Flores, 123 - Centro',
      kind: 'urban' as const,
      land_area: 360,
      built_area: 180,
      condition: 'Bom',
      age: 15,
      quality: 'Normal'
    }
  ],
  comparables: [
    {
      id: 'mock-1',
      source: 'Portal Imobiliário',
      date: '2024-01-10',
      deal_type: 'sale' as const,
      price_total: 450000,
      price_unit: 2500,
      land_area: 300,
      built_area: 180,
      kind: 'urban' as const,
      condition: 'Bom'
    }
  ]
});