-- Adicionar modo_atividades à tabela rdo_reports
ALTER TABLE public.rdo_reports 
ADD COLUMN IF NOT EXISTS modo_atividades text DEFAULT 'manual' CHECK (modo_atividades IN ('manual', 'planilha'));

-- Adicionar campos para integração com planilha orçamentária
ALTER TABLE public.rdo_activities 
ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'manual' CHECK (tipo IN ('manual', 'planilha')),
ADD COLUMN IF NOT EXISTS item_code text,
ADD COLUMN IF NOT EXISTS orcamento_item_id uuid REFERENCES public.orcamento_items(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS quantidade_total numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS executado_dia numeric DEFAULT 0;

-- Criar tabela para observações específicas de itens da planilha
CREATE TABLE IF NOT EXISTS public.rdo_activity_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.rdo_reports(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES public.rdo_activities(id) ON DELETE CASCADE,
  orcamento_item_id uuid REFERENCES public.orcamento_items(id) ON DELETE CASCADE,
  texto text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.rdo_activity_notes ENABLE ROW LEVEL SECURITY;

-- Policies para rdo_activity_notes
CREATE POLICY "Users with edit permission can view rdo_activity_notes"
  ON public.rdo_activity_notes FOR SELECT
  USING (can_edit_rdo());

CREATE POLICY "Users with edit permission can insert rdo_activity_notes"
  ON public.rdo_activity_notes FOR INSERT
  WITH CHECK (can_edit_rdo());

CREATE POLICY "Users with edit permission can update rdo_activity_notes"
  ON public.rdo_activity_notes FOR UPDATE
  USING (can_edit_rdo());

CREATE POLICY "Users with edit permission can delete rdo_activity_notes"
  ON public.rdo_activity_notes FOR DELETE
  USING (can_edit_rdo());

CREATE POLICY "Public can view rdo_activity_notes of public obras"
  ON public.rdo_activity_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rdo_reports
      JOIN public.obras ON obras.id = rdo_reports.obra_id
      WHERE rdo_reports.id = rdo_activity_notes.report_id
      AND obras.is_public = true
    )
  );

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_rdo_activity_notes_report_id ON public.rdo_activity_notes(report_id);
CREATE INDEX IF NOT EXISTS idx_rdo_activity_notes_activity_id ON public.rdo_activity_notes(activity_id);
CREATE INDEX IF NOT EXISTS idx_rdo_activities_report_tipo ON public.rdo_activities(report_id, tipo);
CREATE INDEX IF NOT EXISTS idx_rdo_activities_orcamento_item ON public.rdo_activities(orcamento_item_id);

-- Criar view para calcular acumulado de execução por item
CREATE OR REPLACE VIEW public.rdo_activities_acumulado AS
SELECT 
  a.orcamento_item_id,
  a.obra_id,
  r.data,
  SUM(a.executado_dia) OVER (
    PARTITION BY a.orcamento_item_id 
    ORDER BY r.data 
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) as executado_acumulado,
  a.quantidade_total,
  CASE 
    WHEN a.quantidade_total > 0 THEN 
      (SUM(a.executado_dia) OVER (
        PARTITION BY a.orcamento_item_id 
        ORDER BY r.data 
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      ) / a.quantidade_total * 100)
    ELSE 0
  END as percentual_acumulado
FROM public.rdo_activities a
JOIN public.rdo_reports r ON r.id = a.report_id
WHERE a.tipo = 'planilha' AND a.orcamento_item_id IS NOT NULL;