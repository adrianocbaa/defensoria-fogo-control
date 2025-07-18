export interface Nucleus {
  id: string;
  name: string;
  city: string;
  address: string;
  coordinates?: { lat: number; lng: number };
  contact?: {
    phone?: string;
    email?: string;
  };
  fireExtinguishers: FireExtinguisher[];
  hydrants: Hydrant[];
  documents: Document[];
  fireDepartmentLicense?: {
    validUntil: Date;
    documentUrl?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface FireExtinguisher {
  id: string;
  type: ExtinguisherType;
  expirationDate: Date;
  location: string;
  capacity?: string;
  hydrostaticTest?: Date;
  status: ExtinguisherStatus;
  supportType?: ExtinguisherSupportType;
  hasVerticalSignage?: boolean;
}

export type ExtinguisherType = 'H2O' | 'PQS' | 'CO2' | 'ABC';

export type ExtinguisherStatus = 'valid' | 'expired' | 'expiring-soon';

export type ExtinguisherSupportType = 'wall' | 'tripod';

export interface Document {
  id: string;
  type: DocumentType;
  name: string;
  url: string;
  uploadedAt: Date;
  size?: number;
  mimeType?: string;
}

export type DocumentType = 'project' | 'fire-license' | 'photos' | 'report';

export interface Hydrant {
  id: string;
  location: string;
  status: 'verified' | 'not_verified';
  hoseExpirationDate?: Date;
  hasRegister: boolean;
  hasHose: boolean;
  hasKey: boolean;
  hasCoupling: boolean;
  hasAdapter: boolean;
  hasNozzle: boolean;
}

export interface DashboardStats {
  totalExtinguishers: number;
  validExtinguishers: number;
  expiredExtinguishers: number;
  expiringSoonExtinguishers: number;
  extinguishersByType: Record<ExtinguisherType, number>;
  nucleiWithHydrant: number;
  totalNuclei: number;
  expiredLicenses: number;
  expiringSoonLicenses: number;
}