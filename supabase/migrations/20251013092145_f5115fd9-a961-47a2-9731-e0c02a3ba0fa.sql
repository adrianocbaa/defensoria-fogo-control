-- Criar tabela de templates de atividades PRIMEIRO
CREATE TABLE IF NOT EXISTS public.rdo_templates_atividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  tipo_obra text,
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.rdo_templates_atividades ENABLE ROW LEVEL SECURITY;

-- Policies para templates
CREATE POLICY "Users with edit permission can view templates"
  ON public.rdo_templates_atividades FOR SELECT
  USING (can_edit_rdo());

CREATE POLICY "Users with edit permission can create templates"
  ON public.rdo_templates_atividades FOR INSERT
  WITH CHECK (can_edit_rdo());

CREATE POLICY "Users with edit permission can update templates"
  ON public.rdo_templates_atividades FOR UPDATE
  USING (can_edit_rdo());

CREATE POLICY "Users with edit permission can delete templates"
  ON public.rdo_templates_atividades FOR DELETE
  USING (can_edit_rdo());

-- AGORA adicionar template_id à tabela rdo_reports
ALTER TABLE public.rdo_reports 
ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.rdo_templates_atividades(id) ON DELETE SET NULL;

-- Atualizar constraint de modo_atividades para incluir 'template'
ALTER TABLE public.rdo_reports 
DROP CONSTRAINT IF EXISTS rdo_reports_modo_atividades_check;

ALTER TABLE public.rdo_reports 
ADD CONSTRAINT rdo_reports_modo_atividades_check 
CHECK (modo_atividades IN ('manual', 'planilha', 'template'));

-- Atualizar constraint de tipo em rdo_activities para incluir 'template'
ALTER TABLE public.rdo_activities 
DROP CONSTRAINT IF EXISTS rdo_activities_tipo_check;

ALTER TABLE public.rdo_activities 
ADD CONSTRAINT rdo_activities_tipo_check 
CHECK (tipo IN ('manual', 'planilha', 'template'));

-- Adicionar campos a rdo_activity_notes
ALTER TABLE public.rdo_activity_notes
ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS item_ref text;

-- Adicionar constraint para source após adicionar a coluna
ALTER TABLE public.rdo_activity_notes
DROP CONSTRAINT IF EXISTS rdo_activity_notes_source_check;

ALTER TABLE public.rdo_activity_notes
ADD CONSTRAINT rdo_activity_notes_source_check 
CHECK (source IN ('manual', 'planilha', 'template'));

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_rdo_templates_tipo_obra ON public.rdo_templates_atividades(tipo_obra);
CREATE INDEX IF NOT EXISTS idx_rdo_reports_template_id ON public.rdo_reports(template_id);
CREATE INDEX IF NOT EXISTS idx_rdo_activity_notes_source ON public.rdo_activity_notes(source);

-- Trigger para updated_at
CREATE TRIGGER update_rdo_templates_updated_at
  BEFORE UPDATE ON public.rdo_templates_atividades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir templates de exemplo
INSERT INTO public.rdo_templates_atividades (titulo, descricao, tipo_obra, itens) VALUES
('Fundação - Básico', 'Template padrão para serviços de fundação', 'Edificação', 
  '[
    {"key":"escavacao","descricao":"Escavação manual de valas","un":"m³","qtd_base":50},
    {"key":"concreto_fundacao","descricao":"Concreto para fundação","un":"m³","qtd_base":20},
    {"key":"armacao","descricao":"Armação de aço","un":"kg","qtd_base":500},
    {"key":"forma","descricao":"Formas de madeira","un":"m²","qtd_base":80}
  ]'::jsonb),
('Alvenaria - Padrão', 'Template para execução de alvenaria', 'Edificação',
  '[
    {"key":"alvenaria_blocos","descricao":"Alvenaria de blocos cerâmicos","un":"m²","qtd_base":200},
    {"key":"vergas","descricao":"Execução de vergas e contravergas","un":"m","qtd_base":30},
    {"key":"encunhamento","descricao":"Encunhamento de alvenaria","un":"m²","qtd_base":200}
  ]'::jsonb),
('Revestimento - Interno', 'Template para revestimentos internos', 'Edificação',
  '[
    {"key":"chapisco","descricao":"Chapisco em paredes internas","un":"m²","qtd_base":300},
    {"key":"reboco","descricao":"Reboco paulista","un":"m²","qtd_base":300},
    {"key":"massa_corrida","descricao":"Massa corrida","un":"m²","qtd_base":300},
    {"key":"pintura","descricao":"Pintura látex PVA","un":"m²","qtd_base":300}
  ]'::jsonb)
ON CONFLICT DO NOTHING;