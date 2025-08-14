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
    try {
      const { data, error } = await supabase.rpc('get_properties');
      if (error) throw error;
      return (data || []).map((item: any) => ({
        ...item,
        kind: item.kind as 'urban' | 'rural'
      }));
    } catch (error) {
      console.error('Error fetching properties:', error);
      return [];
    }
  },

  async create(property: Omit<Property, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: Property | null; error: any }> {
    try {
      const { data, error } = await supabase.rpc('create_property', {
        p_kind: property.kind,
        p_address: property.address || '',
        p_lat: property.lat,
        p_lon: property.lon,
        p_land_area: property.land_area,
        p_built_area: property.built_area,
        p_quality: property.quality,
        p_age: property.age,
        p_condition: property.condition,
        p_zoning: property.zoning,
        p_constraints: property.constraints
      });
      
      if (error) throw error;
      return { data: { id: data, ...property } as Property, error: null };
    } catch (error) {
      console.error('Error creating property:', error);
      return { data: null, error };
    }
  },

  async update(id: string, property: Partial<Property>): Promise<Property | null> {
    try {
      const { data, error } = await supabase.rpc('update_property', {
        property_id: id,
        p_kind: property.kind,
        p_address: property.address,
        p_lat: property.lat,
        p_lon: property.lon,
        p_land_area: property.land_area,
        p_built_area: property.built_area,
        p_quality: property.quality,
        p_age: property.age,
        p_condition: property.condition,
        p_zoning: property.zoning,
        p_constraints: property.constraints,
      });
      if (error) throw error;
      return { ...data, kind: data.kind as 'urban' | 'rural' } as Property;
    } catch (error) {
      console.error('Error updating property:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<{ error: any }> {
    try {
      // Mock implementation for now
      console.log('Deleting property:', id);
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  async getById(id: string): Promise<Property | null> {
    try {
      // Mock implementation for now
      console.log('Getting property by id:', id);
      return null;
    } catch (error) {
      console.error('Error getting property:', error);
      return null;
    }
  }
};

// Projects API
export const projectsApi = {
  async list(): Promise<Project[]> {
    try {
      const { data, error } = await supabase.rpc('get_projects');
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
  },

  async create(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: Project | null; error: any }> {
    try {
      const { data, error } = await supabase.rpc('create_project', {
        p_purpose: project.purpose || '',
        p_base_date: project.base_date || new Date().toISOString().split('T')[0],
        p_approach: project.approach || '',
        p_property_id: project.property_id
      });
      
      if (error) throw error;
      return { data: { id: data, ...project } as Project, error: null };
    } catch (error) {
      console.error('Error creating project:', error);
      return { data: null, error };
    }
  },

  async update(id: string, project: Partial<Project>): Promise<{ data: Project | null; error: any }> {
    try {
      const { data, error } = await supabase.rpc('update_project', {
        project_id: id,
        p_purpose: project.purpose,
        p_base_date: project.base_date,
        p_approach: project.approach,
        p_status: project.status
      });
      
      if (error) throw error;
      return { data: { id, ...project } as Project, error: null };
    } catch (error) {
      console.error('Error updating project:', error);
      return { data: null, error };
    }
  },

  async delete(id: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase.rpc('delete_project', {
        project_id: id
      });
      
      return { error };
    } catch (error) {
      console.error('Error deleting project:', error);
      return { error };
    }
  },

  async getById(id: string): Promise<Project | null> {
    try {
      const { data, error } = await supabase.rpc('get_project_by_id', {
        project_id: id
      });
      
      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error('Error getting project:', error);
      return null;
    }
  }
};

// Comparables API
export const comparablesApi = {
  async list(): Promise<Comparable[]> {
    try {
      const { data, error } = await supabase.rpc('get_comparables');
      if (error) throw error;
      return (data || []).map((item: any) => ({
        ...item,
        kind: item.kind as 'urban' | 'rural',
        deal_type: item.deal_type as 'sale' | 'rent' | 'offer'
      }));
    } catch (error) {
      console.error('Error fetching comparables:', error);
      return [];
    }
  },

  async create(comparable: Omit<Comparable, 'id' | 'created_at'>): Promise<{ data: Comparable | null; error: any }> {
    try {
      const { data, error } = await supabase.rpc('create_comparable', {
        p_kind: comparable.kind,
        p_source: comparable.source || '',
        p_date: comparable.date || new Date().toISOString().split('T')[0],
        p_deal_type: comparable.deal_type || 'sale',
        p_price_total: comparable.price_total || 0,
        p_price_unit: comparable.price_unit,
        p_land_area: comparable.land_area,
        p_built_area: comparable.built_area,
        p_quality: comparable.quality,
        p_age: comparable.age,
        p_condition: comparable.condition,
        p_lat: comparable.lat,
        p_lon: comparable.lon,
        p_notes: comparable.notes
      });
      
      if (error) throw error;
      return { data: { id: data, ...comparable } as Comparable, error: null };
    } catch (error) {
      console.error('Error creating comparable:', error);
      return { data: null, error };
    }
  },

  async createBatch(comparables: Omit<Comparable, 'id' | 'created_at'>[]): Promise<{ success: number; errors: any[] }> {
    const results = { success: 0, errors: [] as any[] };
    
    for (let i = 0; i < comparables.length; i++) {
      const comparable = comparables[i];
      try {
        const result = await this.create(comparable);
        if (result.error) {
          results.errors.push({ row: i + 1, error: result.error });
        } else {
          results.success++;
        }
      } catch (error) {
        results.errors.push({ row: i + 1, error });
      }
    }
    
    return results;
  },

  async update(id: string, comparable: Partial<Comparable>): Promise<{ data: Comparable | null; error: any }> {
    try {
      // Mock implementation for now
      console.log('Updating comparable:', id, comparable);
      return { data: { id, ...comparable } as Comparable, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async delete(id: string): Promise<{ error: any }> {
    try {
      // Mock implementation for now
      console.log('Deleting comparable:', id);
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  async getById(id: string): Promise<Comparable | null> {
    try {
      // Mock implementation for now
      console.log('Getting comparable by id:', id);
      return null;
    } catch (error) {
      console.error('Error getting comparable:', error);
      return null;
    }
  }
};

// Mock data for development (when no real data exists)
// Model runs API (temporary mock until RPC functions are available)
export const modelRunsApi = {
  async list(projectId: string) {
    console.log('Mock: getting model runs for project', projectId);
    return [];
  },

  async create(
    projectId: string,
    method: string,
    featuresJson: any,
    targetColumn: string,
    transformConfig: any,
    metricsJson: any,
    diagnosticsJson: any,
    artifacts: any[] = []
  ) {
    console.log('Mock: creating model run', { projectId, method });
    return 'mock-model-run-id';
  }
};

// Results API (temporary mock until RPC functions are available)
export const resultsApi = {
  async create(
    projectId: string,
    modelRunId: string,
    estimatedValue: number,
    confidenceIntervalLower: number,
    confidenceIntervalUpper: number,
    elasticitiesJson: any = {}
  ) {
    console.log('Mock: creating result', { projectId, modelRunId, estimatedValue });
    return 'mock-result-id';
  }
};

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