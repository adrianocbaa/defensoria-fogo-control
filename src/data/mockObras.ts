// Tipos de status das obras
export type ObraStatus = 'concluida' | 'em_andamento' | 'planejada' | 'paralisada';

export interface Obra {
  id: string;
  nome: string;
  municipio: string;
  n_contrato?: string;
  status: ObraStatus;
  coordenadas: [number, number]; // [lat, lng]
  tipo: string;
  valor: number;
  valorExecutado: number;
  porcentagemExecucao: number;
  dataInicio: string;
  previsaoTermino: string;
  empresaResponsavel: string;
  secretariaResponsavel: string;
  fotos: (string | any)[];
  documentos: { nome: string; tipo: string }[];
}

// Obras de exemplo demonstrativas - apenas para visitantes não autenticados
export const obrasSimuladas: Obra[] = [
  {
    id: 'exemplo-1',
    nome: 'Exemplo: Construção da Ponte do Rio Teles Pires',
    municipio: 'Sinop',
    n_contrato: 'CNT-2023-001',
    status: 'em_andamento',
    coordenadas: [-11.86, -55.50],
    tipo: 'Infraestrutura',
    valor: 15000000,
    valorExecutado: 9500000,
    porcentagemExecucao: 63,
    dataInicio: '2023-03-15',
    previsaoTermino: '2024-11-30',
    empresaResponsavel: 'Construtora MT Ltda',
    secretariaResponsavel: 'Secretaria de Infraestrutura',
    fotos: [
      'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=400',
      'https://images.unsplash.com/photo-1496307653780-42ee777d4833?w=400',
      'https://images.unsplash.com/photo-1500673922987-e212871fec22?w=400'
    ],
    documentos: [
      { nome: 'Projeto Executivo.pdf', tipo: 'Projeto' },
      { nome: 'Licença Ambiental.pdf', tipo: 'Licença' },
      { nome: 'Cronograma Físico-Financeiro.pdf', tipo: 'Cronograma' }
    ]
  },
  {
    id: 'exemplo-2',
    nome: 'Exemplo: Reforma do Hospital Municipal',
    municipio: 'Cuiabá',
    n_contrato: 'CNT-2022-058',
    status: 'concluida',
    coordenadas: [-15.60, -56.10],
    tipo: 'Saúde',
    valor: 8500000,
    valorExecutado: 8500000,
    porcentagemExecucao: 100,
    dataInicio: '2022-08-10',
    previsaoTermino: '2023-12-20',
    empresaResponsavel: 'Saúde & Construção SA',
    secretariaResponsavel: 'Secretaria de Saúde',
    fotos: [
      'https://images.unsplash.com/photo-1496307653780-42ee777d4833?w=400',
      'https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?w=400'
    ],
    documentos: [
      { nome: 'Projeto Arquitetônico.pdf', tipo: 'Projeto' },
      { nome: 'Habite-se.pdf', tipo: 'Licença' }
    ]
  }
];