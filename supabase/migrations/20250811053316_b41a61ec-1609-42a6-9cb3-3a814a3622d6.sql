-- 1) Tabelas normalizadas para medições
-- Cria tabela de sessões de medição (uma por número de medição por obra)
CREATE TABLE IF NOT EXISTS public.medicao_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL,
  sequencia integer NOT NULL,
  status text NOT NULL DEFAULT 'aberta', -- 'aberta' | 'bloqueada'
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT medicao_sessions_status_chk CHECK (status IN ('aberta','bloqueada'))
);

-- Índices e unicidade
CREATE UNIQUE INDEX IF NOT EXISTS medicao_sessions_obra_seq_uidx
  ON public.medicao_sessions(obra_id, sequencia);
CREATE INDEX IF NOT EXISTS medicao_sessions_obra_idx
  ON public.medicao_sessions(obra_id);

-- Trigger de updated_at
DROP TRIGGER IF EXISTS trg_medicao_sessions_updated_at ON public.medicao_sessions;
CREATE TRIGGER trg_medicao_sessions_updated_at
BEFORE UPDATE ON public.medicao_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Itens de cada sessão de medição
CREATE TABLE IF NOT EXISTS public.medicao_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medicao_id uuid NOT NULL REFERENCES public.medicao_sessions(id) ON DELETE CASCADE,
  item_code text NOT NULL,
  qtd numeric NOT NULL DEFAULT 0,
  pct numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices e unicidade por medição+item
CREATE UNIQUE INDEX IF NOT EXISTS medicao_items_medicao_item_uidx
  ON public.medicao_items(medicao_id, item_code);
CREATE INDEX IF NOT EXISTS medicao_items_medicao_idx
  ON public.medicao_items(medicao_id);
CREATE INDEX IF NOT EXISTS medicao_items_item_code_idx
  ON public.medicao_items(item_code);

-- Trigger de updated_at
DROP TRIGGER IF EXISTS trg_medicao_items_updated_at ON public.medicao_items;
CREATE TRIGGER trg_medicao_items_updated_at
BEFORE UPDATE ON public.medicao_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) RLS Policies
ALTER TABLE public.medicao_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicao_items ENABLE ROW LEVEL SECURITY;

-- medicao_sessions policies
DROP POLICY IF EXISTS "Public can view medicao_sessions" ON public.medicao_sessions;
CREATE POLICY "Public can view medicao_sessions"
ON public.medicao_sessions FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users with edit permission can insert medicao_sessions" ON public.medicao_sessions;
CREATE POLICY "Users with edit permission can insert medicao_sessions"
ON public.medicao_sessions FOR INSERT
WITH CHECK (public.can_edit());

DROP POLICY IF EXISTS "Users with edit permission can update medicao_sessions" ON public.medicao_sessions;
CREATE POLICY "Users with edit permission can update medicao_sessions"
ON public.medicao_sessions FOR UPDATE
USING (public.can_edit());

DROP POLICY IF EXISTS "Users with edit permission can delete medicao_sessions" ON public.medicao_sessions;
CREATE POLICY "Users with edit permission can delete medicao_sessions"
ON public.medicao_sessions FOR DELETE
USING (public.can_edit());

-- medicao_items policies
DROP POLICY IF EXISTS "Public can view medicao_items" ON public.medicao_items;
CREATE POLICY "Public can view medicao_items"
ON public.medicao_items FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users with edit permission can insert medicao_items" ON public.medicao_items;
CREATE POLICY "Users with edit permission can insert medicao_items"
ON public.medicao_items FOR INSERT
WITH CHECK (public.can_edit());

DROP POLICY IF EXISTS "Users with edit permission can update medicao_items" ON public.medicao_items;
CREATE POLICY "Users with edit permission can update medicao_items"
ON public.medicao_items FOR UPDATE
USING (public.can_edit());

DROP POLICY IF EXISTS "Users with edit permission can delete medicao_items" ON public.medicao_items;
CREATE POLICY "Users with edit permission can delete medicao_items"
ON public.medicao_items FOR DELETE
USING (public.can_edit());

-- 4) View de acumulado por item somente das sessões bloqueadas
CREATE OR REPLACE VIEW public.medicao_acumulado_por_item AS
SELECT
  ms.obra_id,
  mi.item_code,
  SUM(mi.qtd) AS qtd_sum,
  SUM(mi.pct) AS pct_sum,
  SUM(mi.total) AS total_sum
FROM public.medicao_items mi
JOIN public.medicao_sessions ms ON ms.id = mi.medicao_id
WHERE ms.status = 'bloqueada'
GROUP BY ms.obra_id, mi.item_code;

-- 5) Migração de dados a partir da tabela existente public.medicoes (se houver)
-- Criar sessões por obra_id + numero_medicao
INSERT INTO public.medicao_sessions (obra_id, sequencia, status, user_id, created_at, updated_at)
SELECT m.obra_id, m.numero_medicao, 'bloqueada', m.user_id, MIN(m.created_at), NOW()
FROM public.medicoes m
GROUP BY m.obra_id, m.numero_medicao, m.user_id
ON CONFLICT (obra_id, sequencia) DO NOTHING;

-- Inserir itens para cada sessão
INSERT INTO public.medicao_items (medicao_id, item_code, qtd, pct, total, user_id, created_at, updated_at)
SELECT ms.id, m.servico_codigo, m.quantidade_executada,
       CASE WHEN COALESCE(m.quantidade_projeto, 0) = 0 THEN 0
            ELSE (m.quantidade_executada / NULLIF(m.quantidade_projeto,0)) * 100 END AS pct,
       m.valor_executado,
       m.user_id,
       m.created_at,
       NOW()
FROM public.medicoes m
JOIN public.medicao_sessions ms
  ON ms.obra_id = m.obra_id AND ms.sequencia = m.numero_medicao;