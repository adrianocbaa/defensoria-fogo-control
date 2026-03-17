-- Tabela para armazenar PDFs de projeto vinculados a obras
CREATE TABLE IF NOT EXISTS public.checklist_pdfs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  nome_arquivo text NOT NULL,
  pdf_url text NOT NULL,
  total_paginas integer DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid
);

ALTER TABLE public.checklist_pdfs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklist_pdfs_select" ON public.checklist_pdfs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "checklist_pdfs_insert" ON public.checklist_pdfs
  FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()));

CREATE POLICY "checklist_pdfs_update" ON public.checklist_pdfs
  FOR UPDATE TO authenticated USING (public.can_edit(auth.uid()));

CREATE POLICY "checklist_pdfs_delete" ON public.checklist_pdfs
  FOR DELETE TO authenticated USING (public.can_edit(auth.uid()));

-- Tabela para ambientes marcados nas páginas do PDF
CREATE TABLE IF NOT EXISTS public.checklist_ambientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_id uuid NOT NULL REFERENCES public.checklist_pdfs(id) ON DELETE CASCADE,
  obra_id uuid NOT NULL,
  pagina integer NOT NULL DEFAULT 1,
  nome text NOT NULL,
  pos_x numeric NOT NULL DEFAULT 0,
  pos_y numeric NOT NULL DEFAULT 0,
  pos_w numeric NOT NULL DEFAULT 10,
  pos_h numeric NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid
);

ALTER TABLE public.checklist_ambientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklist_ambientes_select" ON public.checklist_ambientes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "checklist_ambientes_insert" ON public.checklist_ambientes
  FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()));

CREATE POLICY "checklist_ambientes_update" ON public.checklist_ambientes
  FOR UPDATE TO authenticated USING (public.can_edit(auth.uid()));

CREATE POLICY "checklist_ambientes_delete" ON public.checklist_ambientes
  FOR DELETE TO authenticated USING (public.can_edit(auth.uid()));

-- Tabela para serviços a verificar por ambiente
CREATE TABLE IF NOT EXISTS public.checklist_servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambiente_id uuid NOT NULL REFERENCES public.checklist_ambientes(id) ON DELETE CASCADE,
  obra_id uuid NOT NULL,
  descricao text NOT NULL,
  is_padrao boolean NOT NULL DEFAULT false,
  ordem integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  observacao text,
  foto_reprovacao_url text,
  foto_correcao_url text,
  data_avaliacao timestamptz,
  avaliado_por uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid
);

ALTER TABLE public.checklist_servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklist_servicos_select" ON public.checklist_servicos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "checklist_servicos_insert" ON public.checklist_servicos
  FOR INSERT TO authenticated WITH CHECK (public.can_edit(auth.uid()));

CREATE POLICY "checklist_servicos_update" ON public.checklist_servicos
  FOR UPDATE TO authenticated USING (public.can_edit(auth.uid()));

CREATE POLICY "checklist_servicos_delete" ON public.checklist_servicos
  FOR DELETE TO authenticated USING (public.can_edit(auth.uid()));

CREATE TRIGGER update_checklist_servicos_updated_at
  BEFORE UPDATE ON public.checklist_servicos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public)
VALUES ('checklist-pdfs', 'checklist-pdfs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "checklist_pdfs_storage_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'checklist-pdfs');

CREATE POLICY "checklist_pdfs_storage_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'checklist-pdfs');

CREATE POLICY "checklist_pdfs_storage_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'checklist-pdfs');

INSERT INTO storage.buckets (id, name, public)
VALUES ('checklist-fotos', 'checklist-fotos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "checklist_fotos_storage_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'checklist-fotos');

CREATE POLICY "checklist_fotos_storage_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'checklist-fotos');

CREATE POLICY "checklist_fotos_storage_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'checklist-fotos');