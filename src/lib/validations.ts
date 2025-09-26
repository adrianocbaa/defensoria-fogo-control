import { z } from 'zod';

// Validation schemas
export const ContactSchema = z.object({
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
});

export const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const FireExtinguisherSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['H2O', 'PQS', 'CO2', 'ABC'], {
    errorMap: () => ({ message: 'Tipo de extintor inválido' })
  }),
  expirationDate: z.date({
    errorMap: () => ({ message: 'Data de vencimento é obrigatória' })
  }),
  location: z.string().min(1, 'Localização é obrigatória'),
  serialNumber: z.string().optional(),
  capacity: z.string().optional(),
  lastInspection: z.date().optional(),
  status: z.enum(['valid', 'expired', 'expiring-soon']).optional(),
});

export const DocumentSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['project', 'fire-license', 'photos', 'report'], {
    errorMap: () => ({ message: 'Tipo de documento inválido' })
  }),
  name: z.string().min(1, 'Nome do documento é obrigatório'),
  url: z.string().url('URL inválida'),
  uploadedAt: z.date().optional(),
  size: z.number().optional(),
  mimeType: z.string().optional(),
});

export const FireDepartmentLicenseSchema = z.object({
  validUntil: z.date({
    errorMap: () => ({ message: 'Data de validade é obrigatória' })
  }),
  documentUrl: z.string().url('URL do documento inválida').optional(),
});

export const NucleusSchema = z.object({
  id: z.string().optional(),
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  city: z.string()
    .min(2, 'Cidade deve ter pelo menos 2 caracteres')
    .max(50, 'Cidade deve ter no máximo 50 caracteres'),
  address: z.string()
    .min(5, 'Endereço deve ter pelo menos 5 caracteres')
    .max(200, 'Endereço deve ter no máximo 200 caracteres'),
  hasHydrant: z.boolean(),
  coordinates: CoordinatesSchema.optional(),
  contact: ContactSchema.optional(),
  fireExtinguishers: z.array(FireExtinguisherSchema).default([]),
  documents: z.array(DocumentSchema).default([]),
  fireDepartmentLicense: FireDepartmentLicenseSchema.optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Form validation schemas (for creating new items)
export const NucleusFormSchema = NucleusSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const FireExtinguisherFormSchema = FireExtinguisherSchema.omit({
  id: true,
  status: true,
});

export const DocumentFormSchema = DocumentSchema.omit({
  id: true,
  uploadedAt: true,
});

// Utility functions for validation
export function validateExtinguisherStatus(expirationDate: Date): 'valid' | 'expired' | 'expiring-soon' {
  const now = new Date();
  const diffInMonths = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
  
  if (diffInMonths < 0) {
    return 'expired';
  } else if (diffInMonths <= 6) {
    return 'expiring-soon';
  } else {
    return 'valid';
  }
}

export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

export function validateFileSize(file: File, maxSizeInMB: number): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
}

// Authentication validation schemas
export const AuthLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email é obrigatório')
    .email('Email inválido')
    .max(255, 'Email muito longo'),
  password: z
    .string()
    .min(1, 'Senha é obrigatória')
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
});

export const AuthSignupSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email é obrigatório')
    .email('Email inválido')
    .max(255, 'Email muito longo'),
  password: z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .max(128, 'Senha muito longa')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula e 1 número'
    ),
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
  displayName: z
    .string()
    .trim()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo')
    .regex(
      /^[a-zA-ZÀ-ÿ\s]+$/,
      'Nome deve conter apenas letras e espaços'
    )
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword'],
});

// Input sanitization functions
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// Rate limiting helper (client-side tracking)
export function createRateLimiter(maxAttempts: number, windowMs: number) {
  const attempts = new Map<string, number[]>();

  return (identifier: string): boolean => {
    const now = Date.now();
    const userAttempts = attempts.get(identifier) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = userAttempts.filter(time => now - time < windowMs);
    
    if (recentAttempts.length >= maxAttempts) {
      return false; // Rate limited
    }
    
    recentAttempts.push(now);
    attempts.set(identifier, recentAttempts);
    return true; // Allow attempt
  };
}

// Type exports
export type ContactData = z.infer<typeof ContactSchema>;
export type CoordinatesData = z.infer<typeof CoordinatesSchema>;
export type FireExtinguisherData = z.infer<typeof FireExtinguisherSchema>;
export type DocumentData = z.infer<typeof DocumentSchema>;
export type FireDepartmentLicenseData = z.infer<typeof FireDepartmentLicenseSchema>;
export type NucleusData = z.infer<typeof NucleusSchema>;
export type NucleusFormData = z.infer<typeof NucleusFormSchema>;
export type FireExtinguisherFormData = z.infer<typeof FireExtinguisherFormSchema>;
export type DocumentFormData = z.infer<typeof DocumentFormSchema>;
export type AuthLoginData = z.infer<typeof AuthLoginSchema>;
export type AuthSignupData = z.infer<typeof AuthSignupSchema>;