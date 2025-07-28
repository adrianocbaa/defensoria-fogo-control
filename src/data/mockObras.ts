// Tipos de status das obras
export type ObraStatus = 'concluida' | 'em_andamento' | 'planejada' | 'paralisada';

export interface Obra {
  id: string;
  nome: string;
  municipio: string;
  status: ObraStatus;
  coordenadas: [number, number]; // [lat, lng]
  tipo: string;
  valor: number;
}

// Dados simulados de obras em Mato Grosso
export const obrasSimuladas: Obra[] = [
  {
    id: '1',
    nome: 'Construção da Ponte do Rio Teles Pires',
    municipio: 'Sinop',
    status: 'em_andamento',
    coordenadas: [-11.86, -55.50],
    tipo: 'Infraestrutura',
    valor: 15000000
  },
  {
    id: '2',
    nome: 'Reforma do Hospital Municipal',
    municipio: 'Cuiabá',
    status: 'concluida',
    coordenadas: [-15.60, -56.10],
    tipo: 'Saúde',
    valor: 8500000
  },
  {
    id: '3',
    nome: 'Construção de Escola Estadual',
    municipio: 'Várzea Grande',
    status: 'planejada',
    coordenadas: [-15.65, -56.13],
    tipo: 'Educação',
    valor: 5200000
  },
  {
    id: '4',
    nome: 'Pavimentação da Rodovia MT-208',
    municipio: 'Tangará da Serra',
    status: 'paralisada',
    coordenadas: [-14.65, -57.50],
    tipo: 'Rodovia',
    valor: 25000000
  },
  {
    id: '5',
    nome: 'Centro de Convenções Municipal',
    municipio: 'Rondonópolis',
    status: 'em_andamento',
    coordenadas: [-16.47, -54.64],
    tipo: 'Cultura',
    valor: 12000000
  },
  {
    id: '6',
    nome: 'Complexo Esportivo Regional',
    municipio: 'Cáceres',
    status: 'planejada',
    coordenadas: [-16.07, -57.68],
    tipo: 'Esporte',
    valor: 7800000
  },
  {
    id: '7',
    nome: 'Modernização do Aeroporto',
    municipio: 'Barra do Garças',
    status: 'concluida',
    coordenadas: [-15.89, -52.39],
    tipo: 'Transporte',
    valor: 18500000
  }
];