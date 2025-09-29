-- SECURITY FIX: Recreate financial data views with security_invoker
-- This ensures views respect RLS policies from underlying tables
-- and only authorized users can access sensitive financial data

-- Drop existing views
DROP VIEW IF EXISTS public.medicao_acumulado_por_item;
DROP VIEW IF EXISTS public.medicao_contrato_atual_por_item;

-- Recreate medicao_acumulado_por_item with security_invoker
-- Shows accumulated measurement data per item from blocked sessions
CREATE VIEW public.medicao_acumulado_por_item
WITH (security_invoker = true) AS
SELECT 
  ms.obra_id,
  mi.item_code,
  sum(mi.qtd) AS qtd_sum,
  sum(mi.pct) AS pct_sum,
  sum(mi.total) AS total_sum
FROM medicao_items mi
JOIN medicao_sessions ms ON ms.id = mi.medicao_id
WHERE ms.status = 'bloqueada'
GROUP BY ms.obra_id, mi.item_code;

-- Recreate medicao_contrato_atual_por_item with security_invoker
-- Shows current contract totals per item including contract base and approved amendments
CREATE VIEW public.medicao_contrato_atual_por_item
WITH (security_invoker = true) AS
WITH base_contratual AS (
  SELECT 
    oi.obra_id,
    oi.codigo AS item_code,
    sum(oi.valor_total) AS total_contratual
  FROM orcamento_items oi
  WHERE oi.origem = 'contratual'
  GROUP BY oi.obra_id, oi.codigo
), 
aditivos_bloqueados AS (
  SELECT 
    s.obra_id,
    s.sequencia AS aditivo_seq,
    ai.item_code,
    sum(ai.total) AS total_aditivos
  FROM aditivo_items ai
  JOIN aditivo_sessions s ON s.id = ai.aditivo_id
  WHERE s.status = 'bloqueada'
  GROUP BY s.obra_id, s.sequencia, ai.item_code
)
SELECT 
  ms.obra_id,
  ms.sequencia AS medicao_sequencia,
  b.item_code,
  (
    b.total_contratual + 
    COALESCE(
      (
        SELECT sum(ab.total_aditivos)
        FROM aditivos_bloqueados ab
        WHERE ab.obra_id = ms.obra_id 
          AND ab.item_code = b.item_code 
          AND ab.aditivo_seq < ms.sequencia
      ), 
      0
    )
  ) AS contrato_total_atual
FROM medicao_sessions ms
JOIN base_contratual b ON b.obra_id = ms.obra_id;

-- Add comments explaining the security model
COMMENT ON VIEW public.medicao_acumulado_por_item IS 
'View showing accumulated measurement data per item. Access controlled via RLS policies on underlying tables (medicao_items, medicao_sessions) - only users with edit permissions can query.';

COMMENT ON VIEW public.medicao_contrato_atual_por_item IS 
'View showing current contract totals per item. Access controlled via RLS policies on underlying tables (orcamento_items, aditivo_items, medicao_sessions, aditivo_sessions) - only users with edit permissions can query.';