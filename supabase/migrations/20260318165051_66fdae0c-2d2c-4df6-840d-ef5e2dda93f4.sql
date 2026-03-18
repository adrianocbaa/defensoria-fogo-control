
-- Criar tabela de ocorrências individuais dentro de um serviço do checklist
CREATE TABLE public.checklist_ocorrencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servico_id UUID NOT NULL REFERENCES public.checklist_servicos(id) ON DELETE CASCADE,
  obra_id UUID NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'reprovado')),
  gravidade TEXT DEFAULT 'medio' CHECK (gravidade IN ('critico', 'medio', 'estetico')),
  observacao TEXT,
  foto_reprovacao_url TEXT,
  foto_correcao_url TEXT,
  location_pin JSONB,
  ordem INTEGER NOT NULL DEFAULT 0,
  data_avaliacao TIMESTAMPTZ,
  avaliado_por UUID,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.checklist_ocorrencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklist_ocorrencias_select" ON public.checklist_ocorrencias
  FOR SELECT USING (true);

CREATE POLICY "checklist_ocorrencias_insert" ON public.checklist_ocorrencias
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "checklist_ocorrencias_update" ON public.checklist_ocorrencias
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "checklist_ocorrencias_delete" ON public.checklist_ocorrencias
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Trigger updated_at
CREATE TRIGGER update_checklist_ocorrencias_updated_at
  BEFORE UPDATE ON public.checklist_ocorrencias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices
CREATE INDEX idx_checklist_ocorrencias_servico_id ON public.checklist_ocorrencias(servico_id);
CREATE INDEX idx_checklist_ocorrencias_obra_id ON public.checklist_ocorrencias(obra_id);
