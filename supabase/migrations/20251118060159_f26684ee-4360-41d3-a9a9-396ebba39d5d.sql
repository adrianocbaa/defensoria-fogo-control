-- Adicionar campos para rastrear conclusão separada de Fiscal e Contratada
ALTER TABLE rdo_reports 
  ADD COLUMN fiscal_concluido_em TIMESTAMP WITH TIME ZONE,
  ADD COLUMN contratada_concluido_em TIMESTAMP WITH TIME ZONE;

-- Comentários para documentar
COMMENT ON COLUMN rdo_reports.fiscal_concluido_em IS 'Timestamp quando o fiscal/gestor concluiu o RDO';
COMMENT ON COLUMN rdo_reports.contratada_concluido_em IS 'Timestamp quando a contratada concluiu o RDO';