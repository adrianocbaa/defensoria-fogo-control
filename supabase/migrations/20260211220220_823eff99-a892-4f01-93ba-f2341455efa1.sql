-- Corrigir valor_unitario truncado em TODOS os orcamento_items de todas as obras
-- Recalcula: valor_unitario = valor_total / quantidade (sem truncamento)
UPDATE public.orcamento_items 
SET valor_unitario = valor_total / quantidade 
WHERE quantidade > 0 
  AND ABS(valor_unitario - valor_total / quantidade) > 0.001;