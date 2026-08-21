CREATE TABLE public.plano_expansao_revisoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ano_vigencia text NOT NULL,
  vigente boolean NOT NULL DEFAULT false,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plano_expansao_revisoes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.plano_expansao_revisoes TO authenticated;
GRANT ALL ON public.plano_expansao_revisoes TO service_role;
ALTER TABLE public.plano_expansao_revisoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pe_revisoes_select" ON public.plano_expansao_revisoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "pe_revisoes_write" ON public.plano_expansao_revisoes FOR ALL TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));

CREATE TABLE public.plano_expansao_metas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revisao_id uuid REFERENCES public.plano_expansao_revisoes(id) ON DELETE SET NULL,
  categoria text NOT NULL DEFAULT 'empreendimento',
  municipio text NOT NULL,
  nucleo_nome text,
  tipo_intervencao text NOT NULL DEFAULT 'nova_locacao',
  jornada text NOT NULL DEFAULT 'nova_locacao',
  etapa_index integer NOT NULL DEFAULT 0,
  etapa_atual text,
  progresso integer NOT NULL DEFAULT 0,
  previsao_conclusao date,
  situacao text NOT NULL DEFAULT 'pendente',
  nivel_atencao text NOT NULL DEFAULT 'normal',
  motivo_atencao text,
  estagio_econucleo integer,
  obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  sei_numero text,
  observacoes text,
  status_plano text NOT NULL DEFAULT 'mantido',
  justificativa text,
  documento_ref text,
  data_inclusao date,
  data_retirada date,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plano_expansao_metas TO authenticated;
GRANT ALL ON public.plano_expansao_metas TO service_role;
ALTER TABLE public.plano_expansao_metas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pe_metas_select" ON public.plano_expansao_metas FOR SELECT TO authenticated USING (true);
CREATE POLICY "pe_metas_write" ON public.plano_expansao_metas FOR ALL TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));

CREATE TABLE public.plano_expansao_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_id uuid NOT NULL REFERENCES public.plano_expansao_metas(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT current_date,
  titulo text NOT NULL,
  descricao text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plano_expansao_historico TO authenticated;
GRANT ALL ON public.plano_expansao_historico TO service_role;
ALTER TABLE public.plano_expansao_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pe_hist_select" ON public.plano_expansao_historico FOR SELECT TO authenticated USING (true);
CREATE POLICY "pe_hist_write" ON public.plano_expansao_historico FOR ALL TO authenticated USING (public.can_edit(auth.uid())) WITH CHECK (public.can_edit(auth.uid()));

CREATE INDEX idx_pe_metas_revisao ON public.plano_expansao_metas(revisao_id);
CREATE INDEX idx_pe_metas_categoria ON public.plano_expansao_metas(categoria);
CREATE INDEX idx_pe_hist_meta ON public.plano_expansao_historico(meta_id);

CREATE TRIGGER trg_pe_revisoes_updated BEFORE UPDATE ON public.plano_expansao_revisoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pe_metas_updated BEFORE UPDATE ON public.plano_expansao_metas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pe_hist_updated BEFORE UPDATE ON public.plano_expansao_historico FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.plano_expansao_revisoes (nome, ano_vigencia, vigente) VALUES ('Versão Original', '2025/2026', false), ('Revisão 01', '2025/2026', true);