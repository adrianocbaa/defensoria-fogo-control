UPDATE rdo_reports 
SET status = 'aprovado' 
WHERE id = 'a5f8a4fb-d3e0-4e80-b11a-6fa49376fce5' 
AND assinatura_fiscal_validado_em IS NOT NULL 
AND assinatura_contratada_validado_em IS NOT NULL;