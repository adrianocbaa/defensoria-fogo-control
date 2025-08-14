import { comparablesApi } from '@/services/appraisalApi';

// Test data for OLS modeling
const testComparables = [
  {
    kind: 'urban' as const,
    source: 'Portal Imobiliário',
    date: '2024-01-10',
    deal_type: 'sale' as const,
    price_total: 450000,
    price_unit: 2500,
    land_area: 300,
    built_area: 180,
    quality: 'Normal',
    age: 15,
    condition: 'Bom',
    lat: -15.7942,
    lon: -47.8822,
    notes: 'Casa térrea com garagem'
  },
  {
    kind: 'urban' as const,
    source: 'Imobiliária Local',
    date: '2024-01-15',
    deal_type: 'sale' as const,
    price_total: 520000,
    price_unit: 2600,
    land_area: 350,
    built_area: 200,
    quality: 'Alto',
    age: 10,
    condition: 'Ótimo',
    lat: -15.7950,
    lon: -47.8830,
    notes: 'Casa dois pavimentos'
  },
  {
    kind: 'urban' as const,
    source: 'Classificados',
    date: '2024-01-08',
    deal_type: 'sale' as const,
    price_total: 380000,
    price_unit: 2280,
    land_area: 280,
    built_area: 166.67,
    quality: 'Normal',
    age: 20,
    condition: 'Regular',
    lat: -15.7935,
    lon: -47.8815,
    notes: 'Casa com quintal'
  },
  {
    kind: 'urban' as const,
    source: 'Portal Imobiliário',
    date: '2024-01-20',
    deal_type: 'sale' as const,
    price_total: 480000,
    price_unit: 2400,
    land_area: 320,
    built_area: 200,
    quality: 'Normal',
    age: 12,
    condition: 'Bom',
    lat: -15.7948,
    lon: -47.8825,
    notes: 'Casa com piscina'
  },
  {
    kind: 'urban' as const,
    source: 'Imobiliária Premium',
    date: '2024-01-12',
    deal_type: 'sale' as const,
    price_total: 620000,
    price_unit: 2750,
    land_area: 400,
    built_area: 225.45,
    quality: 'Alto',
    age: 8,
    condition: 'Ótimo',
    lat: -15.7955,
    lon: -47.8835,
    notes: 'Casa de alto padrão'
  },
  {
    kind: 'urban' as const,
    source: 'Classificados',
    date: '2024-01-18',
    deal_type: 'sale' as const,
    price_total: 320000,
    price_unit: 2133,
    land_area: 250,
    built_area: 150,
    quality: 'Baixo',
    age: 25,
    condition: 'Regular',
    lat: -15.7930,
    lon: -47.8810,
    notes: 'Casa simples'
  },
  {
    kind: 'urban' as const,
    source: 'Portal Imobiliário',
    date: '2024-01-25',
    deal_type: 'sale' as const,
    price_total: 550000,
    price_unit: 2619,
    land_area: 360,
    built_area: 210,
    quality: 'Alto',
    age: 6,
    condition: 'Ótimo',
    lat: -15.7960,
    lon: -47.8840,
    notes: 'Casa nova com acabamento'
  },
  {
    kind: 'urban' as const,
    source: 'Imobiliária Local',
    date: '2024-01-05',
    deal_type: 'sale' as const,
    price_total: 420000,
    price_unit: 2333,
    land_area: 310,
    built_area: 180,
    quality: 'Normal',
    age: 18,
    condition: 'Bom',
    lat: -15.7940,
    lon: -47.8820,
    notes: 'Casa com varanda'
  },
  {
    kind: 'urban' as const,
    source: 'Classificados',
    date: '2024-01-30',
    deal_type: 'sale' as const,
    price_total: 510000,
    price_unit: 2550,
    land_area: 340,
    built_area: 200,
    quality: 'Normal',
    age: 14,
    condition: 'Bom',
    lat: -15.7945,
    lon: -47.8828,
    notes: 'Casa em condomínio'
  },
  {
    kind: 'urban' as const,
    source: 'Portal Premium',
    date: '2024-01-22',
    deal_type: 'sale' as const,
    price_total: 680000,
    price_unit: 2833,
    land_area: 420,
    built_area: 240,
    quality: 'Alto',
    age: 5,
    condition: 'Ótimo',
    lat: -15.7965,
    lon: -47.8845,
    notes: 'Casa de luxo'
  },
  {
    kind: 'urban' as const,
    source: 'Imobiliária Local',
    date: '2024-01-14',
    deal_type: 'sale' as const,
    price_total: 360000,
    price_unit: 2000,
    land_area: 270,
    built_area: 180,
    quality: 'Baixo',
    age: 30,
    condition: 'Regular',
    lat: -15.7925,
    lon: -47.8805,
    notes: 'Casa antiga reformada'
  },
  {
    kind: 'urban' as const,
    source: 'Classificados',
    date: '2024-01-28',
    deal_type: 'sale' as const,
    price_total: 470000,
    price_unit: 2350,
    land_area: 330,
    built_area: 200,
    quality: 'Normal',
    age: 16,
    condition: 'Bom',
    lat: -15.7952,
    lon: -47.8832,
    notes: 'Casa com área gourmet'
  }
];

export async function seedTestComparables() {
  console.log('Creating test comparables for OLS modeling...');
  
  try {
    const results = await comparablesApi.createBatch(testComparables);
    console.log(`✅ Created ${results.success} comparables successfully`);
    
    if (results.errors.length > 0) {
      console.log(`❌ Failed to create ${results.errors.length} comparables:`, results.errors);
    }
    
    return results;
  } catch (error) {
    console.error('Error seeding test comparables:', error);
    throw error;
  }
}

// Also create a test project
export async function createTestProject() {
  const { projectsApi } = await import('@/services/appraisalApi');
  
  try {
    const result = await projectsApi.create({
      purpose: 'Teste OLS - Avaliação Residencial Urbana',
      base_date: '2024-01-31',
      approach: 'Comparativo de Mercado (OLS)',
      status: 'in_progress'
    });
    
    console.log('✅ Test project created:', result.data?.id);
    return result.data?.id;
  } catch (error) {
    console.error('Error creating test project:', error);
    throw error;
  }
}