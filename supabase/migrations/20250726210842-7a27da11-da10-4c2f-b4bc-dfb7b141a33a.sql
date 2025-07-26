-- Add maintenance permission to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manutencao';

-- Add materials field to maintenance_tickets table
ALTER TABLE maintenance_tickets 
ADD COLUMN IF NOT EXISTS materials jsonb;