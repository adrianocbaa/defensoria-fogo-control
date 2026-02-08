-- Reabrir RDO 13 (03/02/2026) da obra Primavera do Leste - Cobertura
-- Limpar assinatura do fiscal para permitir edição

UPDATE rdo_reports
SET 
  assinatura_fiscal_validado_em = NULL,
  assinatura_fiscal_url = NULL,
  assinatura_fiscal_nome = NULL,
  assinatura_fiscal_cargo = NULL,
  assinatura_fiscal_documento = NULL,
  assinatura_fiscal_datetime = NULL,
  fiscal_concluido_em = NULL,
  status = 'preenchendo'
WHERE id = '0c057c72-22ad-444a-bd7a-6be525b1dd9a';