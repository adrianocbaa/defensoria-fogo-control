export interface Nucleus {
  id: string;
  name: string;
  city: string;
  address: string;
  phone?: string;
  email?: string;
  hasHydrant: boolean;
  fireExtinguishers: FireExtinguisher[];
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
  serialNumber?: string;
  capacity?: string;
  lastInspection?: Date;
  status: ExtinguisherStatus;
}

export type ExtinguisherType = 'H2O' | 'PQS' | 'CO2' | 'ABC';

export type ExtinguisherStatus = 'valid' | 'expired' | 'expiring-soon';

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