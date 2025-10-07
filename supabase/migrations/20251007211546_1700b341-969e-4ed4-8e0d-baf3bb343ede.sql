-- Ampliar rdo_reports com campos de clima, condições e assinaturas
ALTER TABLE public.rdo_reports
ADD COLUMN observacoes text,
ADD COLUMN clima_manha text CHECK (clima_manha IN ('claro', 'nublado', 'chuvoso')),
ADD COLUMN clima_tarde text CHECK (clima_tarde IN ('claro', 'nublado', 'chuvoso')),
ADD COLUMN clima_noite text CHECK (clima_noite IN ('claro', 'nublado', 'chuvoso')),
ADD COLUMN cond_manha text CHECK (cond_manha IN ('praticavel', 'impraticavel')),
ADD COLUMN cond_tarde text CHECK (cond_tarde IN ('praticavel', 'impraticavel')),
ADD COLUMN cond_noite text CHECK (cond_noite IN ('praticavel', 'impraticavel')),
ADD COLUMN pluviometria_mm numeric,
ADD COLUMN assinatura_fiscal_url text,
ADD COLUMN assinatura_empresa_url text;

-- Ampliar rdo_activities com progresso, status e observacao
ALTER TABLE public.rdo_activities
ADD COLUMN progresso integer DEFAULT 0 CHECK (progresso >= 0 AND progresso <= 100),
ADD COLUMN status text DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'concluida')),
ADD COLUMN observacao text;

-- Ampliar rdo_occurrences com impacto e ação imediata
ALTER TABLE public.rdo_occurrences
ADD COLUMN impacto_cronograma boolean DEFAULT false,
ADD COLUMN acao_imediata text;

-- Criar tabela rdo_visits
CREATE TABLE public.rdo_visits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  report_id uuid NOT NULL REFERENCES public.rdo_reports(id) ON DELETE CASCADE,
  visitante text NOT NULL,
  cargo text,
  instituicao text,
  hora time,
  assunto text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rdo_visits_report_id ON public.rdo_visits(report_id);

-- Criar tabela rdo_equipment
CREATE TABLE public.rdo_equipment (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  report_id uuid NOT NULL REFERENCES public.rdo_reports(id) ON DELETE CASCADE,
  equipamento text NOT NULL,
  proprio_ou_terceiro text CHECK (proprio_ou_terceiro IN ('proprio', 'terceiro')),
  horas_trabalhadas numeric,
  situacao text CHECK (situacao IN ('operante', 'parado', 'manutencao')),
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rdo_equipment_report_id ON public.rdo_equipment(report_id);

-- Criar tabela rdo_workforce
CREATE TABLE public.rdo_workforce (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  report_id uuid NOT NULL REFERENCES public.rdo_reports(id) ON DELETE CASCADE,
  funcao text NOT NULL,
  origem text CHECK (origem IN ('propria', 'empreiteira')),
  quantidade integer NOT NULL DEFAULT 0,
  horas numeric NOT NULL DEFAULT 0,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rdo_workforce_report_id ON public.rdo_workforce(report_id);

-- Adicionar campo descricao em rdo_media
ALTER TABLE public.rdo_media
ADD COLUMN descricao text;

-- RLS policies para rdo_visits
ALTER TABLE public.rdo_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with edit permission can view rdo_visits"
ON public.rdo_visits FOR SELECT
USING (can_edit());

CREATE POLICY "Users with edit permission can insert rdo_visits"
ON public.rdo_visits FOR INSERT
WITH CHECK (can_edit());

CREATE POLICY "Users with edit permission can update rdo_visits"
ON public.rdo_visits FOR UPDATE
USING (can_edit());

CREATE POLICY "Users with edit permission can delete rdo_visits"
ON public.rdo_visits FOR DELETE
USING (can_edit());

-- RLS policies para rdo_equipment
ALTER TABLE public.rdo_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with edit permission can view rdo_equipment"
ON public.rdo_equipment FOR SELECT
USING (can_edit());

CREATE POLICY "Users with edit permission can insert rdo_equipment"
ON public.rdo_equipment FOR INSERT
WITH CHECK (can_edit());

CREATE POLICY "Users with edit permission can update rdo_equipment"
ON public.rdo_equipment FOR UPDATE
USING (can_edit());

CREATE POLICY "Users with edit permission can delete rdo_equipment"
ON public.rdo_equipment FOR DELETE
USING (can_edit());

-- RLS policies para rdo_workforce
ALTER TABLE public.rdo_workforce ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with edit permission can view rdo_workforce"
ON public.rdo_workforce FOR SELECT
USING (can_edit());

CREATE POLICY "Users with edit permission can insert rdo_workforce"
ON public.rdo_workforce FOR INSERT
WITH CHECK (can_edit());

CREATE POLICY "Users with edit permission can update rdo_workforce"
ON public.rdo_workforce FOR UPDATE
USING (can_edit());

CREATE POLICY "Users with edit permission can delete rdo_workforce"
ON public.rdo_workforce FOR DELETE
USING (can_edit());