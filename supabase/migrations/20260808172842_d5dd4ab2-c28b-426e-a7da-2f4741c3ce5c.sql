
-- ============ BIBLIOTECA / TEMPLATES ============
CREATE TABLE public.entrega_biblioteca_grupos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  responsabilidade_padrao text NOT NULL DEFAULT 'contratada'
    CHECK (responsabilidade_padrao IN ('contratada','dif_engenharia','administracao','terceiro')),
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entrega_biblioteca_grupos TO authenticated;
GRANT ALL ON public.entrega_biblioteca_grupos TO service_role;
ALTER TABLE public.entrega_biblioteca_grupos ENABLE ROW LEVEL SECURITY;
CREATE POLICY ebg_select ON public.entrega_biblioteca_grupos FOR SELECT TO authenticated USING (true);
CREATE POLICY ebg_admin ON public.entrega_biblioteca_grupos FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.entrega_biblioteca_verificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id uuid NOT NULL REFERENCES public.entrega_biblioteca_grupos(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ebv_grupo ON public.entrega_biblioteca_verificacoes(grupo_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entrega_biblioteca_verificacoes TO authenticated;
GRANT ALL ON public.entrega_biblioteca_verificacoes TO service_role;
ALTER TABLE public.entrega_biblioteca_verificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY ebv_select ON public.entrega_biblioteca_verificacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY ebv_admin ON public.entrega_biblioteca_verificacoes FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.entrega_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo_modelo text,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entrega_templates TO authenticated;
GRANT ALL ON public.entrega_templates TO service_role;
ALTER TABLE public.entrega_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY et_select ON public.entrega_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY et_admin ON public.entrega_templates FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.entrega_template_grupos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.entrega_templates(id) ON DELETE CASCADE,
  grupo_id uuid NOT NULL REFERENCES public.entrega_biblioteca_grupos(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, grupo_id)
);
CREATE INDEX idx_etg_template ON public.entrega_template_grupos(template_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entrega_template_grupos TO authenticated;
GRANT ALL ON public.entrega_template_grupos TO service_role;
ALTER TABLE public.entrega_template_grupos ENABLE ROW LEVEL SECURITY;
CREATE POLICY etg_select ON public.entrega_template_grupos FOR SELECT TO authenticated USING (true);
CREATE POLICY etg_admin ON public.entrega_template_grupos FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ PROCESSO ============
CREATE TABLE public.entrega_vistorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  recebimento_definitivo_id uuid REFERENCES public.recebimento_vistorias(id) ON DELETE SET NULL,
  recebimento_definitivo_data date,
  status text NOT NULL DEFAULT 'preparacao'
    CHECK (status IN ('preparacao','em_andamento','entregue','cancelada')),
  data date NOT NULL DEFAULT CURRENT_DATE,
  observacoes text,
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  iniciado_por uuid,
  resultado_congelado text CHECK (resultado_congelado IN ('apto','apto_com_ressalvas','nao_apto')),
  resultado_resumo jsonb,
  ciencia_em timestamptz,
  ciencia_por uuid,
  ciencia_observacoes text,
  cancelada_em timestamptz,
  cancelada_por uuid,
  motivo_cancelamento text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ev_obra ON public.entrega_vistorias(obra_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entrega_vistorias TO authenticated;
GRANT ALL ON public.entrega_vistorias TO service_role;
ALTER TABLE public.entrega_vistorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY ev_select ON public.entrega_vistorias FOR SELECT TO authenticated
  USING (public.user_has_obra_access(auth.uid(), obra_id) OR public.can_edit_obra(obra_id, auth.uid()));
CREATE POLICY ev_insert ON public.entrega_vistorias FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_obra(obra_id, auth.uid()));
CREATE POLICY ev_update ON public.entrega_vistorias FOR UPDATE TO authenticated
  USING (public.can_edit_obra(obra_id, auth.uid())) WITH CHECK (public.can_edit_obra(obra_id, auth.uid()));
CREATE POLICY ev_delete ON public.entrega_vistorias FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_ev_updated BEFORE UPDATE ON public.entrega_vistorias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.entrega_participantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id uuid NOT NULL REFERENCES public.entrega_vistorias(id) ON DELETE CASCADE,
  obra_id uuid NOT NULL,
  user_id uuid,
  nome_snapshot text NOT NULL,
  papel text NOT NULL DEFAULT 'outro'
    CHECK (papel IN ('fiscal','gestor','diretoria','outro')),
  funcao_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ep_entrega ON public.entrega_participantes(entrega_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entrega_participantes TO authenticated;
GRANT ALL ON public.entrega_participantes TO service_role;
ALTER TABLE public.entrega_participantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY ep_select ON public.entrega_participantes FOR SELECT TO authenticated
  USING (public.user_has_obra_access(auth.uid(), obra_id) OR public.can_edit_obra(obra_id, auth.uid()));
CREATE POLICY ep_write ON public.entrega_participantes FOR ALL TO authenticated
  USING (public.can_edit_obra(obra_id, auth.uid())) WITH CHECK (public.can_edit_obra(obra_id, auth.uid()));

CREATE TABLE public.entrega_ambientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id uuid NOT NULL REFERENCES public.entrega_vistorias(id) ON DELETE CASCADE,
  obra_id uuid NOT NULL,
  recebimento_ambiente_id uuid,
  nome text NOT NULL,
  tipo_modelo text,
  pavimento text,
  observacoes text,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ea_entrega ON public.entrega_ambientes(entrega_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entrega_ambientes TO authenticated;
GRANT ALL ON public.entrega_ambientes TO service_role;
ALTER TABLE public.entrega_ambientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY ea_select ON public.entrega_ambientes FOR SELECT TO authenticated
  USING (public.user_has_obra_access(auth.uid(), obra_id) OR public.can_edit_obra(obra_id, auth.uid()));
CREATE POLICY ea_write ON public.entrega_ambientes FOR ALL TO authenticated
  USING (public.can_edit_obra(obra_id, auth.uid())) WITH CHECK (public.can_edit_obra(obra_id, auth.uid()));
CREATE TRIGGER trg_ea_updated BEFORE UPDATE ON public.entrega_ambientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.entrega_ambiente_grupos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambiente_id uuid NOT NULL REFERENCES public.entrega_ambientes(id) ON DELETE CASCADE,
  entrega_id uuid NOT NULL REFERENCES public.entrega_vistorias(id) ON DELETE CASCADE,
  obra_id uuid NOT NULL,
  biblioteca_grupo_id uuid,
  grupo_snapshot text NOT NULL,
  responsabilidade_padrao text NOT NULL DEFAULT 'contratada'
    CHECK (responsabilidade_padrao IN ('contratada','dif_engenharia','administracao','terceiro')),
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_eag_ambiente ON public.entrega_ambiente_grupos(ambiente_id);
CREATE INDEX idx_eag_entrega ON public.entrega_ambiente_grupos(entrega_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entrega_ambiente_grupos TO authenticated;
GRANT ALL ON public.entrega_ambiente_grupos TO service_role;
ALTER TABLE public.entrega_ambiente_grupos ENABLE ROW LEVEL SECURITY;
CREATE POLICY eag_select ON public.entrega_ambiente_grupos FOR SELECT TO authenticated
  USING (public.user_has_obra_access(auth.uid(), obra_id) OR public.can_edit_obra(obra_id, auth.uid()));
CREATE POLICY eag_write ON public.entrega_ambiente_grupos FOR ALL TO authenticated
  USING (public.can_edit_obra(obra_id, auth.uid())) WITH CHECK (public.can_edit_obra(obra_id, auth.uid()));

CREATE TABLE public.entrega_verificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambiente_grupo_id uuid NOT NULL REFERENCES public.entrega_ambiente_grupos(id) ON DELETE CASCADE,
  ambiente_id uuid NOT NULL REFERENCES public.entrega_ambientes(id) ON DELETE CASCADE,
  entrega_id uuid NOT NULL REFERENCES public.entrega_vistorias(id) ON DELETE CASCADE,
  obra_id uuid NOT NULL,
  biblioteca_verificacao_id uuid,
  descricao_snapshot text NOT NULL,
  status text NOT NULL DEFAULT 'nao_vistoriado'
    CHECK (status IN ('nao_vistoriado','conforme','pendencia','nao_aplica')),
  observacao text,
  respondido_por uuid,
  respondido_em timestamptz,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_evf_grupo ON public.entrega_verificacoes(ambiente_grupo_id);
CREATE INDEX idx_evf_entrega ON public.entrega_verificacoes(entrega_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entrega_verificacoes TO authenticated;
GRANT ALL ON public.entrega_verificacoes TO service_role;
ALTER TABLE public.entrega_verificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY evf_select ON public.entrega_verificacoes FOR SELECT TO authenticated
  USING (public.user_has_obra_access(auth.uid(), obra_id) OR public.can_edit_obra(obra_id, auth.uid()));
CREATE POLICY evf_write ON public.entrega_verificacoes FOR ALL TO authenticated
  USING (public.can_edit_obra(obra_id, auth.uid())) WITH CHECK (public.can_edit_obra(obra_id, auth.uid()));

CREATE TABLE public.entrega_pendencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id uuid NOT NULL REFERENCES public.entrega_vistorias(id) ON DELETE CASCADE,
  obra_id uuid NOT NULL,
  ambiente_id uuid REFERENCES public.entrega_ambientes(id) ON DELETE SET NULL,
  ambiente_grupo_id uuid REFERENCES public.entrega_ambiente_grupos(id) ON DELETE SET NULL,
  verificacao_id uuid REFERENCES public.entrega_verificacoes(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  descricao text,
  responsabilidade text NOT NULL DEFAULT 'contratada'
    CHECK (responsabilidade IN ('contratada','dif_engenharia','administracao','terceiro')),
  responsavel_terceiro text,
  impacto text NOT NULL DEFAULT 'nao_impeditiva'
    CHECK (impacto IN ('impeditiva','nao_impeditiva')),
  situacao text NOT NULL DEFAULT 'pendente'
    CHECK (situacao IN ('pendente','correcao_registrada','reprovada','sanada','cancelada')),
  prazo_correcao date,
  criada_por uuid,
  sanada_em timestamptz,
  sanada_por uuid,
  cancelada_em timestamptz,
  cancelada_por uuid,
  motivo_cancelamento text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_epd_entrega ON public.entrega_pendencias(entrega_id);
CREATE INDEX idx_epd_ambiente ON public.entrega_pendencias(ambiente_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entrega_pendencias TO authenticated;
GRANT ALL ON public.entrega_pendencias TO service_role;
ALTER TABLE public.entrega_pendencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY epd_select ON public.entrega_pendencias FOR SELECT TO authenticated
  USING (public.user_has_obra_access(auth.uid(), obra_id) OR public.can_edit_obra(obra_id, auth.uid()));
CREATE POLICY epd_insert ON public.entrega_pendencias FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_obra(obra_id, auth.uid()));
CREATE POLICY epd_update ON public.entrega_pendencias FOR UPDATE TO authenticated
  USING (public.can_edit_obra(obra_id, auth.uid())) WITH CHECK (public.can_edit_obra(obra_id, auth.uid()));
CREATE POLICY epd_delete ON public.entrega_pendencias FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_epd_updated BEFORE UPDATE ON public.entrega_pendencias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.entrega_pendencia_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pendencia_id uuid NOT NULL REFERENCES public.entrega_pendencias(id) ON DELETE CASCADE,
  entrega_id uuid NOT NULL,
  obra_id uuid NOT NULL,
  reinspecao_id uuid,
  evento text NOT NULL,
  situacao_anterior text,
  situacao_nova text,
  observacao text,
  autor uuid,
  autor_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_eph_pendencia ON public.entrega_pendencia_historico(pendencia_id);
GRANT SELECT, INSERT ON public.entrega_pendencia_historico TO authenticated;
GRANT ALL ON public.entrega_pendencia_historico TO service_role;
ALTER TABLE public.entrega_pendencia_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY eph_select ON public.entrega_pendencia_historico FOR SELECT TO authenticated
  USING (public.user_has_obra_access(auth.uid(), obra_id) OR public.can_edit_obra(obra_id, auth.uid()));
CREATE POLICY eph_insert ON public.entrega_pendencia_historico FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_obra(obra_id, auth.uid()));

CREATE TABLE public.entrega_reinspecoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id uuid NOT NULL REFERENCES public.entrega_vistorias(id) ON DELETE CASCADE,
  obra_id uuid NOT NULL,
  sequencia integer NOT NULL DEFAULT 1,
  data date NOT NULL DEFAULT CURRENT_DATE,
  responsavel_id uuid,
  responsavel_nome text,
  status text NOT NULL DEFAULT 'em_andamento'
    CHECK (status IN ('em_andamento','concluida')),
  observacoes text,
  concluida_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_eri_entrega ON public.entrega_reinspecoes(entrega_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entrega_reinspecoes TO authenticated;
GRANT ALL ON public.entrega_reinspecoes TO service_role;
ALTER TABLE public.entrega_reinspecoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY eri_select ON public.entrega_reinspecoes FOR SELECT TO authenticated
  USING (public.user_has_obra_access(auth.uid(), obra_id) OR public.can_edit_obra(obra_id, auth.uid()));
CREATE POLICY eri_write ON public.entrega_reinspecoes FOR ALL TO authenticated
  USING (public.can_edit_obra(obra_id, auth.uid())) WITH CHECK (public.can_edit_obra(obra_id, auth.uid()));

CREATE TABLE public.entrega_reinspecao_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reinspecao_id uuid NOT NULL REFERENCES public.entrega_reinspecoes(id) ON DELETE CASCADE,
  pendencia_id uuid NOT NULL REFERENCES public.entrega_pendencias(id) ON DELETE CASCADE,
  obra_id uuid NOT NULL,
  resultado text CHECK (resultado IN ('sanada','continua_pendente')),
  observacao text,
  avaliado_por uuid,
  avaliado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reinspecao_id, pendencia_id)
);
CREATE INDEX idx_erit_reinspecao ON public.entrega_reinspecao_itens(reinspecao_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entrega_reinspecao_itens TO authenticated;
GRANT ALL ON public.entrega_reinspecao_itens TO service_role;
ALTER TABLE public.entrega_reinspecao_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY erit_select ON public.entrega_reinspecao_itens FOR SELECT TO authenticated
  USING (public.user_has_obra_access(auth.uid(), obra_id) OR public.can_edit_obra(obra_id, auth.uid()));
CREATE POLICY erit_write ON public.entrega_reinspecao_itens FOR ALL TO authenticated
  USING (public.can_edit_obra(obra_id, auth.uid())) WITH CHECK (public.can_edit_obra(obra_id, auth.uid()));

CREATE TABLE public.entrega_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id uuid NOT NULL REFERENCES public.entrega_vistorias(id) ON DELETE CASCADE,
  obra_id uuid NOT NULL,
  ambiente_id uuid REFERENCES public.entrega_ambientes(id) ON DELETE SET NULL,
  pendencia_id uuid REFERENCES public.entrega_pendencias(id) ON DELETE SET NULL,
  historico_id uuid,
  reinspecao_id uuid,
  tipo text NOT NULL DEFAULT 'geral'
    CHECK (tipo IN ('geral','ocorrencia','correcao','reinspecao')),
  storage_path text NOT NULL,
  legenda text,
  autor uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ef_entrega ON public.entrega_fotos(entrega_id);
CREATE INDEX idx_ef_pendencia ON public.entrega_fotos(pendencia_id);
CREATE INDEX idx_ef_ambiente ON public.entrega_fotos(ambiente_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entrega_fotos TO authenticated;
GRANT ALL ON public.entrega_fotos TO service_role;
ALTER TABLE public.entrega_fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY ef_select ON public.entrega_fotos FOR SELECT TO authenticated
  USING (public.user_has_obra_access(auth.uid(), obra_id) OR public.can_edit_obra(obra_id, auth.uid()));
CREATE POLICY ef_write ON public.entrega_fotos FOR ALL TO authenticated
  USING (public.can_edit_obra(obra_id, auth.uid())) WITH CHECK (public.can_edit_obra(obra_id, auth.uid()));
