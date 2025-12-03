-- Fix RDO status for day 3/12 that was reopened and re-signed but didn't auto-approve
UPDATE rdo_reports 
SET status = 'aprovado', updated_at = now()
WHERE id = 'c0f175ec-4a59-4bbd-8b63-c39497b9ceab'
  AND assinatura_fiscal_validado_em IS NOT NULL 
  AND assinatura_contratada_validado_em IS NOT NULL
  AND status != 'aprovado';