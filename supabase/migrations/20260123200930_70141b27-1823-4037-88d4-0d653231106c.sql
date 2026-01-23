-- Correção retroativa: truncar valores com mais de 2 casas decimais
-- Primeiro desabilitar temporariamente os triggers de proteção

-- Desabilitar triggers de proteção de aditivo_items
ALTER TABLE aditivo_items DISABLE TRIGGER prevent_changes_aditivo_items;
ALTER TABLE aditivo_items DISABLE TRIGGER trg_prevent_changes_on_blocked_aditivo_items;

-- Corrigir valor_unitario em orcamento_items
UPDATE orcamento_items
SET valor_unitario = TRUNC(valor_unitario::numeric, 2)
WHERE valor_unitario != TRUNC(valor_unitario::numeric, 2);

-- Corrigir valor_total em orcamento_items
UPDATE orcamento_items
SET valor_total = TRUNC(valor_total::numeric, 2)
WHERE valor_total != TRUNC(valor_total::numeric, 2);

-- Corrigir total_contrato em orcamento_items
UPDATE orcamento_items
SET total_contrato = TRUNC(total_contrato::numeric, 2)
WHERE total_contrato != TRUNC(total_contrato::numeric, 2);

-- Corrigir total em aditivo_items
UPDATE aditivo_items
SET total = TRUNC(total::numeric, 2)
WHERE total != TRUNC(total::numeric, 2);

-- Corrigir total em medicao_items
UPDATE medicao_items
SET total = TRUNC(total::numeric, 2)
WHERE total != TRUNC(total::numeric, 2);

-- Reabilitar triggers de proteção
ALTER TABLE aditivo_items ENABLE TRIGGER prevent_changes_aditivo_items;
ALTER TABLE aditivo_items ENABLE TRIGGER trg_prevent_changes_on_blocked_aditivo_items;