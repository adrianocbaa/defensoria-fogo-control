-- Adicionar colunas de assinatura e aprovação na tabela rdo_reports
ALTER TABLE public.rdo_reports
ADD COLUMN IF NOT EXISTS assinatura_fiscal_url text,
ADD COLUMN IF NOT EXISTS assinatura_fiscal_nome text,
ADD COLUMN IF NOT EXISTS assinatura_fiscal_cargo text,
ADD COLUMN IF NOT EXISTS assinatura_fiscal_documento text,
ADD COLUMN IF NOT EXISTS assinatura_fiscal_datetime timestamptz,
ADD COLUMN IF NOT EXISTS assinatura_contratada_url text,
ADD COLUMN IF NOT EXISTS assinatura_contratada_nome text,
ADD COLUMN IF NOT EXISTS assinatura_contratada_cargo text,
ADD COLUMN IF NOT EXISTS assinatura_contratada_documento text,
ADD COLUMN IF NOT EXISTS assinatura_contratada_datetime timestamptz,
ADD COLUMN IF NOT EXISTS aprovacao_observacao text,
ADD COLUMN IF NOT EXISTS pdf_url text,
ADD COLUMN IF NOT EXISTS hash_verificacao text UNIQUE;

-- Criar índice para hash_verificacao
CREATE INDEX IF NOT EXISTS idx_rdo_reports_hash_verificacao ON public.rdo_reports(hash_verificacao);

-- Criar tabela de auditoria do RDO
CREATE TABLE IF NOT EXISTS public.rdo_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  report_id uuid NOT NULL REFERENCES public.rdo_reports(id) ON DELETE CASCADE,
  acao text NOT NULL,
  detalhes jsonb,
  actor_id uuid REFERENCES auth.users(id),
  actor_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela de auditoria
ALTER TABLE public.rdo_audit_log ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para rdo_audit_log
CREATE POLICY "Users with edit permission can view rdo_audit_log"
  ON public.rdo_audit_log
  FOR SELECT
  USING (can_edit());

CREATE POLICY "Users with edit permission can insert rdo_audit_log"
  ON public.rdo_audit_log
  FOR INSERT
  WITH CHECK (can_edit());

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_rdo_audit_log_report_id ON public.rdo_audit_log(report_id);
CREATE INDEX IF NOT EXISTS idx_rdo_audit_log_obra_id ON public.rdo_audit_log(obra_id);
CREATE INDEX IF NOT EXISTS idx_rdo_audit_log_created_at ON public.rdo_audit_log(created_at DESC);

-- Criar bucket de storage para assinaturas (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('rdo-signatures', 'rdo-signatures', false)
ON CONFLICT (id) DO NOTHING;

-- Criar bucket de storage para PDFs (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('rdo-pdf', 'rdo-pdf', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para bucket rdo-signatures
CREATE POLICY "Users with edit permission can upload signatures"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'rdo-signatures' AND can_edit());

CREATE POLICY "Users with edit permission can view signatures"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'rdo-signatures' AND can_edit());

CREATE POLICY "Users with edit permission can delete signatures"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'rdo-signatures' AND can_edit());

-- Políticas RLS para bucket rdo-pdf (público para leitura)
CREATE POLICY "Anyone can view PDFs"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'rdo-pdf');

CREATE POLICY "Users with edit permission can upload PDFs"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'rdo-pdf' AND can_edit());

CREATE POLICY "Users with edit permission can delete PDFs"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'rdo-pdf' AND can_edit());