import { Nucleus } from '@/types/nucleus';

export const mockNuclei: Nucleus[] = [
  {
    id: '1',
    name: 'Núcleo de Cuiabá',
    city: 'Cuiabá',
    address: 'Rua Cândido Rondon, 145 - Centro',
    coordinates: { lat: -15.6014, lng: -56.0979 },
    contact: {
      phone: '(65) 3613-4000',
      email: 'cuiaba@defensoria.mt.def.br'
    },
    hydrants: [],
    fireExtinguishers: [
      {
        id: '1',
        type: 'ABC',
        expirationDate: new Date('2024-03-15'),
        location: 'Recepção',
        capacity: '6kg',
        hydrostaticTest: new Date('2023-12-15'),
        status: 'expired'
      },
      {
        id: '2',
        type: 'CO2',
        expirationDate: new Date('2024-08-20'),
        location: 'Sala de Informática',
        capacity: '5kg',
        supportType: 'wall' as const,
        status: 'expiring-soon'
      },
      {
        id: '3',
        type: 'H2O',
        expirationDate: new Date('2025-01-10'),
        location: 'Corredor Principal',
        capacity: '10L',
        hasVerticalSignage: true,
        status: 'valid'
      }
    ],
    documents: [
      {
        id: '1',
        type: 'project',
        name: 'Projeto Preventivo Cuiabá.pdf',
        url: '/documents/projeto-cuiaba.pdf',
        uploadedAt: new Date('2023-08-15'),
        size: 2048000,
        mimeType: 'application/pdf'
      }
    ],
    fireDepartmentLicense: {
      validUntil: new Date('2024-06-30'),
      documentUrl: '/documents/alvara-cuiaba.pdf'
    },
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2024-02-20')
  },
  {
    id: '2',
    name: 'Núcleo de Várzea Grande',
    city: 'Várzea Grande',
    address: 'Av. Couto Magalhães, 234 - Centro',
    coordinates: { lat: -15.6467, lng: -56.1326 },
    contact: {
      phone: '(65) 3613-4100',
      email: 'varzea@defensoria.mt.def.br'
    },
    hydrants: [],
    fireExtinguishers: [
      {
        id: '4',
        type: 'PQS',
        expirationDate: new Date('2024-12-05'),
        location: 'Entrada Principal',
        capacity: '4kg',
        hydrostaticTest: new Date('2024-01-05'),
        status: 'valid'
      },
      {
        id: '5',
        type: 'ABC',
        expirationDate: new Date('2024-08-15'),
        location: 'Sala de Reuniões',
        capacity: '6kg',
        supportType: 'tripod' as const,
        status: 'expiring-soon'
      }
    ],
    documents: [],
    fireDepartmentLicense: {
      validUntil: new Date('2025-03-20')
    },
    createdAt: new Date('2023-02-10'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: '3',
    name: 'Núcleo de Rondonópolis',
    city: 'Rondonópolis',
    address: 'Rua Barão do Rio Branco, 456 - Centro',
    coordinates: { lat: -16.4706, lng: -54.6369 },
    contact: {
      phone: '(66) 3423-5000',
      email: 'rondonopolis@defensoria.mt.def.br'
    },
    hydrants: [],
    fireExtinguishers: [
      {
        id: '6',
        type: 'H2O',
        expirationDate: new Date('2025-02-28'),
        location: 'Hall de Entrada',
        capacity: '10L',
        hasVerticalSignage: false,
        status: 'valid'
      },
      {
        id: '7',
        type: 'CO2',
        expirationDate: new Date('2024-07-10'),
        location: 'Arquivo',
        capacity: '5kg',
        hydrostaticTest: new Date('2023-11-20'),
        status: 'expiring-soon'
      },
      {
        id: '8',
        type: 'ABC',
        expirationDate: new Date('2023-12-01'),
        location: 'Cozinha',
        capacity: '6kg',
        supportType: 'wall' as const,
        status: 'expired'
      }
    ],
    documents: [
      {
        id: '2',
        type: 'fire-license',
        name: 'Alvará Bombeiros Rondonópolis.pdf',
        url: '/documents/alvara-rondonopolis.pdf',
        uploadedAt: new Date('2024-01-20'),
        size: 1024000,
        mimeType: 'application/pdf'
      },
      {
        id: '3',
        type: 'photos',
        name: 'Fotos Preventivos.zip',
        url: '/documents/fotos-rondonopolis.zip',
        uploadedAt: new Date('2024-02-05'),
        size: 5120000,
        mimeType: 'application/zip'
      }
    ],
    fireDepartmentLicense: {
      validUntil: new Date('2024-12-15'),
      documentUrl: '/documents/alvara-rondonopolis.pdf'
    },
    createdAt: new Date('2023-03-05'),
    updatedAt: new Date('2024-02-05')
  },
  {
    id: '4',
    name: 'Núcleo de Sinop',
    city: 'Sinop',
    address: 'Av. das Flores, 789 - Setor Comercial',
    coordinates: { lat: -11.8609, lng: -55.5025 },
    contact: {
      phone: '(66) 3531-2000',
      email: 'sinop@defensoria.mt.def.br'
    },
    hydrants: [],
    fireExtinguishers: [
      {
        id: '9',
        type: 'PQS',
        expirationDate: new Date('2024-11-30'),
        location: 'Recepção',
        capacity: '4kg',
        hydrostaticTest: new Date('2024-02-15'),
        status: 'valid'
      }
    ],
    documents: [],
    fireDepartmentLicense: {
      validUntil: new Date('2024-09-10')
    },
    createdAt: new Date('2023-04-12'),
    updatedAt: new Date('2024-05-30')
  },
  {
    id: '5',
    name: 'Núcleo de Cáceres',
    city: 'Cáceres',
    address: 'Rua Coronel José Dulce, 321 - Centro',
    coordinates: { lat: -16.0735, lng: -57.6781 },
    contact: {
      phone: '(65) 3223-1500',
      email: 'caceres@defensoria.mt.def.br'
    },
    hydrants: [],
    fireExtinguishers: [
      {
        id: '10',
        type: 'ABC',
        expirationDate: new Date('2024-04-20'),
        location: 'Sala dos Defensores',
        capacity: '6kg',
        hasVerticalSignage: true,
        status: 'expired'
      },
      {
        id: '11',
        type: 'H2O',
        expirationDate: new Date('2024-10-05'),
        location: 'Biblioteca',
        capacity: '10L',
        supportType: 'tripod' as const,
        status: 'expiring-soon'
      }
    ],
    documents: [
      {
        id: '4',
        type: 'report',
        name: 'Relatório Preventivos Cáceres 2024.pdf',
        url: '/documents/relatorio-caceres.pdf',
        uploadedAt: new Date('2024-03-15'),
        size: 3072000,
        mimeType: 'application/pdf'
      }
    ],
    fireDepartmentLicense: {
      validUntil: new Date('2024-07-25'),
      documentUrl: '/documents/alvara-caceres.pdf'
    },
    createdAt: new Date('2023-05-20'),
    updatedAt: new Date('2024-03-15')
  }
];