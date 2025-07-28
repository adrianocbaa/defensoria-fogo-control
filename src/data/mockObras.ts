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

// Obra de exemplo demonstrativa - apenas para visitantes não autenticados
export const obrasSimuladas: Obra[] = [
  {
    id: 'exemplo-1',
    nome: 'Exemplo: Construção da Ponte do Rio Teles Pires',
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
  }
];