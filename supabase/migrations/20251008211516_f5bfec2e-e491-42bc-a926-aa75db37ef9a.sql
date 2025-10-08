-- Add validation timestamp columns to rdo_reports for signatures
ALTER TABLE rdo_reports 
ADD COLUMN IF NOT EXISTS assinatura_fiscal_validado_em timestamp with time zone,
ADD COLUMN IF NOT EXISTS assinatura_contratada_validado_em timestamp with time zone;