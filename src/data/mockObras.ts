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
  valorExecutado: number;
  porcentagemExecucao: number;
  dataInicio: string;
  previsaoTermino: string;
  empresaResponsavel: string;
  secretariaResponsavel: string;
  fotos: string[];
  documentos: { nome: string; tipo: string }[];
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
    id: '2',
    nome: 'Reforma do Hospital Municipal',
    municipio: 'Cuiabá',
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
  },
  {
    id: '3',
    nome: 'Construção de Escola Estadual',
    municipio: 'Várzea Grande',
    status: 'planejada',
    coordenadas: [-15.65, -56.13],
    tipo: 'Educação',
    valor: 5200000,
    valorExecutado: 0,
    porcentagemExecucao: 0,
    dataInicio: '2024-06-01',
    previsaoTermino: '2025-12-15',
    empresaResponsavel: 'EduConstrução Ltda',
    secretariaResponsavel: 'Secretaria de Educação',
    fotos: [],
    documentos: [
      { nome: 'Projeto Básico.pdf', tipo: 'Projeto' },
      { nome: 'Orçamento Detalhado.pdf', tipo: 'Orçamento' }
    ]
  },
  {
    id: '4',
    nome: 'Pavimentação da Rodovia MT-208',
    municipio: 'Tangará da Serra',
    status: 'paralisada',
    coordenadas: [-14.65, -57.50],
    tipo: 'Rodovia',
    valor: 25000000,
    valorExecutado: 12000000,
    porcentagemExecucao: 48,
    dataInicio: '2023-01-20',
    previsaoTermino: '2024-08-30',
    empresaResponsavel: 'ViaEstrada Construções',
    secretariaResponsavel: 'Secretaria de Infraestrutura',
    fotos: [
      'https://images.unsplash.com/photo-1500673922987-e212871fec22?w=400'
    ],
    documentos: [
      { nome: 'Projeto Geométrico.pdf', tipo: 'Projeto' },
      { nome: 'Relatório de Paralisação.pdf', tipo: 'Relatório' }
    ]
  },
  {
    id: '5',
    nome: 'Centro de Convenções Municipal',
    municipio: 'Rondonópolis',
    status: 'em_andamento',
    coordenadas: [-16.47, -54.64],
    tipo: 'Cultura',
    valor: 12000000,
    valorExecutado: 7200000,
    porcentagemExecucao: 60,
    dataInicio: '2023-05-10',
    previsaoTermino: '2024-10-15',
    empresaResponsavel: 'Cultura & Arte Construções',
    secretariaResponsavel: 'Secretaria de Cultura',
    fotos: [
      'https://images.unsplash.com/photo-1496307653780-42ee777d4833?w=400',
      'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=400'
    ],
    documentos: [
      { nome: 'Projeto Executivo Cultural.pdf', tipo: 'Projeto' },
      { nome: 'Medições Mensais.pdf', tipo: 'Medição' }
    ]
  },
  {
    id: '6',
    nome: 'Complexo Esportivo Regional',
    municipio: 'Cáceres',
    status: 'planejada',
    coordenadas: [-16.07, -57.68],
    tipo: 'Esporte',
    valor: 7800000,
    valorExecutado: 0,
    porcentagemExecucao: 0,
    dataInicio: '2024-08-01',
    previsaoTermino: '2026-02-28',
    empresaResponsavel: 'Esporte Total Engenharia',
    secretariaResponsavel: 'Secretaria de Esporte',
    fotos: [],
    documentos: [
      { nome: 'Estudo de Viabilidade.pdf', tipo: 'Estudo' },
      { nome: 'Projeto Esportivo.pdf', tipo: 'Projeto' }
    ]
  },
  {
    id: '7',
    nome: 'Modernização do Aeroporto',
    municipio: 'Barra do Garças',
    status: 'concluida',
    coordenadas: [-15.89, -52.39],
    tipo: 'Transporte',
    valor: 18500000,
    valorExecutado: 18500000,
    porcentagemExecucao: 100,
    dataInicio: '2022-03-01',
    previsaoTermino: '2023-11-30',
    empresaResponsavel: 'AeroEngenharia Brasil',
    secretariaResponsavel: 'Secretaria de Transportes',
    fotos: [
      'https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?w=400',
      'https://images.unsplash.com/photo-1500673922987-e212871fec22?w=400',
      'https://images.unsplash.com/photo-1496307653780-42ee777d4833?w=400'
    ],
    documentos: [
      { nome: 'Projeto de Modernização.pdf', tipo: 'Projeto' },
      { nome: 'Certificado de Conclusão.pdf', tipo: 'Certificado' },
      { nome: 'Manual de Operação.pdf', tipo: 'Manual' }
    ]
  }
];