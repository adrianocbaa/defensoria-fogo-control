-- =========================================================
-- RECEBIMENTO DE OBRA
-- =========================================================

-- 1. BIBLIOTECA -------------------------------------------------
CREATE TABLE public.biblioteca_servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  macro text NOT NULL,
  servico text NOT NULL,
  descricao text,
  keywords text[] NOT NULL DEFAULT '{}',
  escopo text NOT NULL DEFAULT 'global',
  obra_id uuid REFERENCES public.obras(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca_servicos TO authenticated;
GRANT ALL ON public.biblioteca_servicos TO service_role;
ALTER TABLE public.biblioteca_servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bs_select" ON public.biblioteca_servicos FOR SELECT TO authenticated
  USING (escopo = 'global' OR (obra_id IS NOT NULL AND public.user_has_obra_access(auth.uid(), obra_id)));
CREATE POLICY "bs_insert" ON public.biblioteca_servicos FOR INSERT TO authenticated
  WITH CHECK ((escopo = 'global' AND public.is_admin(auth.uid())) OR (escopo = 'obra' AND obra_id IS NOT NULL AND public.can_edit_obra(obra_id, auth.uid())));
CREATE POLICY "bs_update" ON public.biblioteca_servicos FOR UPDATE TO authenticated
  USING ((escopo = 'global' AND public.is_admin(auth.uid())) OR (escopo = 'obra' AND obra_id IS NOT NULL AND public.can_edit_obra(obra_id, auth.uid())));
CREATE POLICY "bs_delete" ON public.biblioteca_servicos FOR DELETE TO authenticated
  USING ((escopo = 'global' AND public.is_admin(auth.uid())) OR (escopo = 'obra' AND obra_id IS NOT NULL AND public.can_edit_obra(obra_id, auth.uid())));
CREATE INDEX idx_bs_escopo ON public.biblioteca_servicos(escopo, ativo);
CREATE INDEX idx_bs_obra ON public.biblioteca_servicos(obra_id);
CREATE INDEX idx_bs_macro ON public.biblioteca_servicos(macro);
CREATE TRIGGER trg_bs_updated_at BEFORE UPDATE ON public.biblioteca_servicos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.biblioteca_verificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id uuid NOT NULL REFERENCES public.biblioteca_servicos(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  default_aplicavel boolean NOT NULL DEFAULT true,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca_verificacoes TO authenticated;
GRANT ALL ON public.biblioteca_verificacoes TO service_role;
ALTER TABLE public.biblioteca_verificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bv_select" ON public.biblioteca_verificacoes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.biblioteca_servicos s WHERE s.id = servico_id
    AND (s.escopo = 'global' OR (s.obra_id IS NOT NULL AND public.user_has_obra_access(auth.uid(), s.obra_id)))));
CREATE POLICY "bv_write" ON public.biblioteca_verificacoes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.biblioteca_servicos s WHERE s.id = servico_id
    AND ((s.escopo = 'global' AND public.is_admin(auth.uid())) OR (s.escopo = 'obra' AND s.obra_id IS NOT NULL AND public.can_edit_obra(s.obra_id, auth.uid())))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.biblioteca_servicos s WHERE s.id = servico_id
    AND ((s.escopo = 'global' AND public.is_admin(auth.uid())) OR (s.escopo = 'obra' AND s.obra_id IS NOT NULL AND public.can_edit_obra(s.obra_id, auth.uid())))));
CREATE INDEX idx_bv_servico ON public.biblioteca_verificacoes(servico_id, ordem);
CREATE TRIGGER trg_bv_updated_at BEFORE UPDATE ON public.biblioteca_verificacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. TEMPLATES --------------------------------------------------
CREATE TABLE public.recebimento_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  escopo text NOT NULL DEFAULT 'global',
  obra_id uuid REFERENCES public.obras(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recebimento_templates TO authenticated;
GRANT ALL ON public.recebimento_templates TO service_role;
ALTER TABLE public.recebimento_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rt_select" ON public.recebimento_templates FOR SELECT TO authenticated
  USING (escopo = 'global' OR (obra_id IS NOT NULL AND public.user_has_obra_access(auth.uid(), obra_id)));
CREATE POLICY "rt_write" ON public.recebimento_templates FOR ALL TO authenticated
  USING ((escopo = 'global' AND public.is_admin(auth.uid())) OR (escopo = 'obra' AND obra_id IS NOT NULL AND public.can_edit_obra(obra_id, auth.uid())))
  WITH CHECK ((escopo = 'global' AND public.is_admin(auth.uid())) OR (escopo = 'obra' AND obra_id IS NOT NULL AND public.can_edit_obra(obra_id, auth.uid())));
CREATE INDEX idx_rt_escopo ON public.recebimento_templates(escopo, ativo);
CREATE INDEX idx_rt_obra ON public.recebimento_templates(obra_id);
CREATE TRIGGER trg_rt_updated_at BEFORE UPDATE ON public.recebimento_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.recebimento_template_servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.recebimento_templates(id) ON DELETE CASCADE,
  biblioteca_servico_id uuid NOT NULL REFERENCES public.biblioteca_servicos(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recebimento_template_servicos TO authenticated;
GRANT ALL ON public.recebimento_template_servicos TO service_role;
ALTER TABLE public.recebimento_template_servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rts_select" ON public.recebimento_template_servicos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.recebimento_templates t WHERE t.id = template_id
    AND (t.escopo = 'global' OR (t.obra_id IS NOT NULL AND public.user_has_obra_access(auth.uid(), t.obra_id)))));
CREATE POLICY "rts_write" ON public.recebimento_template_servicos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.recebimento_templates t WHERE t.id = template_id
    AND ((t.escopo = 'global' AND public.is_admin(auth.uid())) OR (t.escopo = 'obra' AND t.obra_id IS NOT NULL AND public.can_edit_obra(t.obra_id, auth.uid())))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.recebimento_templates t WHERE t.id = template_id
    AND ((t.escopo = 'global' AND public.is_admin(auth.uid())) OR (t.escopo = 'obra' AND t.obra_id IS NOT NULL AND public.can_edit_obra(t.obra_id, auth.uid())))));
CREATE INDEX idx_rts_template ON public.recebimento_template_servicos(template_id, ordem);

-- 3. VISTORIAS --------------------------------------------------
CREATE TABLE public.recebimento_vistorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  sequencia integer NOT NULL DEFAULT 1,
  vistoria_origem_id uuid REFERENCES public.recebimento_vistorias(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'em_andamento',
  data date NOT NULL DEFAULT CURRENT_DATE,
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  concluido_em timestamptz,
  fiscal_id uuid,
  concluida_por uuid,
  cancelada_em timestamptz,
  cancelada_por uuid,
  motivo_cancelamento text,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recebimento_vistorias TO authenticated;
GRANT ALL ON public.recebimento_vistorias TO service_role;
ALTER TABLE public.recebimento_vistorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rv_select" ON public.recebimento_vistorias FOR SELECT TO authenticated
  USING (public.user_has_obra_access(auth.uid(), obra_id));
CREATE POLICY "rv_write" ON public.recebimento_vistorias FOR ALL TO authenticated
  USING (public.can_edit_obra(obra_id, auth.uid())) WITH CHECK (public.can_edit_obra(obra_id, auth.uid()));
CREATE INDEX idx_rv_obra ON public.recebimento_vistorias(obra_id, status);
CREATE INDEX idx_rv_origem ON public.recebimento_vistorias(vistoria_origem_id);
CREATE TRIGGER trg_rv_updated_at BEFORE UPDATE ON public.recebimento_vistorias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. AMBIENTES / SERVICOS / VERIFICACOES -----------------------
CREATE TABLE public.recebimento_ambientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vistoria_id uuid NOT NULL REFERENCES public.recebimento_vistorias(id) ON DELETE CASCADE,
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recebimento_ambientes TO authenticated;
GRANT ALL ON public.recebimento_ambientes TO service_role;
ALTER TABLE public.recebimento_ambientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ra_select" ON public.recebimento_ambientes FOR SELECT TO authenticated
  USING (public.user_has_obra_access(auth.uid(), obra_id));
CREATE POLICY "ra_write" ON public.recebimento_ambientes FOR ALL TO authenticated
  USING (public.can_edit_obra(obra_id, auth.uid())) WITH CHECK (public.can_edit_obra(obra_id, auth.uid()));
CREATE INDEX idx_ra_vistoria ON public.recebimento_ambientes(vistoria_id, ordem);
CREATE INDEX idx_ra_obra ON public.recebimento_ambientes(obra_id);
CREATE TRIGGER trg_ra_updated_at BEFORE UPDATE ON public.recebimento_ambientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.recebimento_ambiente_servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambiente_id uuid NOT NULL REFERENCES public.recebimento_ambientes(id) ON DELETE CASCADE,
  vistoria_id uuid NOT NULL REFERENCES public.recebimento_vistorias(id) ON DELETE CASCADE,
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  biblioteca_servico_id uuid REFERENCES public.biblioteca_servicos(id) ON DELETE SET NULL,
  macro_snapshot text NOT NULL,
  servico_snapshot text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recebimento_ambiente_servicos TO authenticated;
GRANT ALL ON public.recebimento_ambiente_servicos TO service_role;
ALTER TABLE public.recebimento_ambiente_servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ras_select" ON public.recebimento_ambiente_servicos FOR SELECT TO authenticated
  USING (public.user_has_obra_access(auth.uid(), obra_id));
CREATE POLICY "ras_write" ON public.recebimento_ambiente_servicos FOR ALL TO authenticated
  USING (public.can_edit_obra(obra_id, auth.uid())) WITH CHECK (public.can_edit_obra(obra_id, auth.uid()));
CREATE INDEX idx_ras_ambiente ON public.recebimento_ambiente_servicos(ambiente_id, ordem);
CREATE INDEX idx_ras_vistoria ON public.recebimento_ambiente_servicos(vistoria_id);
CREATE TRIGGER trg_ras_updated_at BEFORE UPDATE ON public.recebimento_ambiente_servicos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.recebimento_verificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambiente_servico_id uuid NOT NULL REFERENCES public.recebimento_ambiente_servicos(id) ON DELETE CASCADE,
  ambiente_id uuid NOT NULL REFERENCES public.recebimento_ambientes(id) ON DELETE CASCADE,
  vistoria_id uuid NOT NULL REFERENCES public.recebimento_vistorias(id) ON DELETE CASCADE,
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  biblioteca_verificacao_id uuid REFERENCES public.biblioteca_verificacoes(id) ON DELETE SET NULL,
  descricao_snapshot text NOT NULL,
  status text NOT NULL DEFAULT 'nao_vistoriado',
  observacao text,
  respondido_por uuid,
  respondido_em timestamptz,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recebimento_verificacoes TO authenticated;
GRANT ALL ON public.recebimento_verificacoes TO service_role;
ALTER TABLE public.recebimento_verificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rvf_select" ON public.recebimento_verificacoes FOR SELECT TO authenticated
  USING (public.user_has_obra_access(auth.uid(), obra_id));
CREATE POLICY "rvf_write" ON public.recebimento_verificacoes FOR ALL TO authenticated
  USING (public.can_edit_obra(obra_id, auth.uid())) WITH CHECK (public.can_edit_obra(obra_id, auth.uid()));
CREATE INDEX idx_rvf_servico ON public.recebimento_verificacoes(ambiente_servico_id, ordem);
CREATE INDEX idx_rvf_ambiente ON public.recebimento_verificacoes(ambiente_id);
CREATE INDEX idx_rvf_vistoria_status ON public.recebimento_verificacoes(vistoria_id, status);
CREATE TRIGGER trg_rvf_updated_at BEFORE UPDATE ON public.recebimento_verificacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. PENDENCIAS -------------------------------------------------
CREATE TABLE public.recebimento_pendencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verificacao_id uuid REFERENCES public.recebimento_verificacoes(id) ON DELETE SET NULL,
  ambiente_id uuid REFERENCES public.recebimento_ambientes(id) ON DELETE SET NULL,
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  vistoria_origem_id uuid REFERENCES public.recebimento_vistorias(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  descricao text,
  classificacao text NOT NULL DEFAULT 'acabamento',
  prazo_correcao date,
  situacao text NOT NULL DEFAULT 'pendente',
  criada_por uuid,
  sanada_em timestamptz,
  sanada_por uuid,
  cancelada_em timestamptz,
  cancelada_por uuid,
  motivo_cancelamento text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recebimento_pendencias TO authenticated;
GRANT ALL ON public.recebimento_pendencias TO service_role;
ALTER TABLE public.recebimento_pendencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rp_select" ON public.recebimento_pendencias FOR SELECT TO authenticated
  USING (public.user_has_obra_access(auth.uid(), obra_id));
CREATE POLICY "rp_write" ON public.recebimento_pendencias FOR ALL TO authenticated
  USING (public.can_edit_obra(obra_id, auth.uid())) WITH CHECK (public.can_edit_obra(obra_id, auth.uid()));
CREATE INDEX idx_rp_obra_situacao ON public.recebimento_pendencias(obra_id, situacao);
CREATE INDEX idx_rp_ambiente ON public.recebimento_pendencias(ambiente_id);
CREATE INDEX idx_rp_verificacao ON public.recebimento_pendencias(verificacao_id);
CREATE INDEX idx_rp_vistoria ON public.recebimento_pendencias(vistoria_origem_id);
CREATE TRIGGER trg_rp_updated_at BEFORE UPDATE ON public.recebimento_pendencias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.recebimento_pendencia_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pendencia_id uuid NOT NULL REFERENCES public.recebimento_pendencias(id) ON DELETE CASCADE,
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  vistoria_id uuid REFERENCES public.recebimento_vistorias(id) ON DELETE SET NULL,
  evento text NOT NULL,
  situacao_anterior text,
  situacao_nova text,
  observacao text,
  autor uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.recebimento_pendencia_historico TO authenticated;
GRANT ALL ON public.recebimento_pendencia_historico TO service_role;
ALTER TABLE public.recebimento_pendencia_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rph_select" ON public.recebimento_pendencia_historico FOR SELECT TO authenticated
  USING (public.user_has_obra_access(auth.uid(), obra_id));
CREATE POLICY "rph_insert" ON public.recebimento_pendencia_historico FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_obra(obra_id, auth.uid()));
CREATE INDEX idx_rph_pendencia ON public.recebimento_pendencia_historico(pendencia_id, created_at);

-- 6. FOTOS ------------------------------------------------------
CREATE TABLE public.recebimento_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  vistoria_id uuid REFERENCES public.recebimento_vistorias(id) ON DELETE CASCADE,
  ambiente_id uuid REFERENCES public.recebimento_ambientes(id) ON DELETE CASCADE,
  pendencia_id uuid REFERENCES public.recebimento_pendencias(id) ON DELETE CASCADE,
  historico_id uuid REFERENCES public.recebimento_pendencia_historico(id) ON DELETE SET NULL,
  tipo text NOT NULL DEFAULT 'geral',
  storage_path text NOT NULL,
  legenda text,
  autor uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recebimento_fotos TO authenticated;
GRANT ALL ON public.recebimento_fotos TO service_role;
ALTER TABLE public.recebimento_fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rf_select" ON public.recebimento_fotos FOR SELECT TO authenticated
  USING (public.user_has_obra_access(auth.uid(), obra_id));
CREATE POLICY "rf_write" ON public.recebimento_fotos FOR ALL TO authenticated
  USING (public.can_edit_obra(obra_id, auth.uid())) WITH CHECK (public.can_edit_obra(obra_id, auth.uid()));
CREATE INDEX idx_rf_pendencia ON public.recebimento_fotos(pendencia_id, created_at);
CREATE INDEX idx_rf_ambiente ON public.recebimento_fotos(ambiente_id);
CREATE INDEX idx_rf_vistoria ON public.recebimento_fotos(vistoria_id, tipo);

-- 7. SEED DA BIBLIOTECA ----------------------------------------
DO $seed$
DECLARE
  v jsonb := '[
    ["Serviços preliminares", ["Limpeza","Proteções","Remoções","Demolições"]],
    ["Alvenaria e divisórias", ["Alvenaria","Drywall","Divisórias","Fechamentos"]],
    ["Revestimento de paredes", ["Chapisco","Reboco","Massa","Cerâmica","Porcelanato","Outros revestimentos"]],
    ["Pisos", ["Contrapiso","Cerâmica","Porcelanato","Vinílico","Granito","Cimentado","Outros"]],
    ["Rodapés", ["Cerâmico","Porcelanato","Granito","MDF","Poliestireno","Outros"]],
    ["Pintura", ["Parede","Teto","Estrutura metálica","Esquadrias"]],
    ["Forros", ["Gesso","Drywall","Mineral","PVC","Metálico"]],
    ["Esquadrias", ["Porta","Janela","Portão","Veneziana"]],
    ["Vidros", ["Vidros","Espelhos","Box","Fachadas"]],
    ["Instalações elétricas", ["Tomadas","Interruptores","Quadros","Circuitos","Eletrodutos","Caixas"]],
    ["Iluminação", ["Luminárias","Spots","Refletores","Iluminação de emergência"]],
    ["Dados e telecomunicações", ["Pontos RJ45","Rede","Rack","Telefonia","Infraestrutura"]],
    ["Instalações hidráulicas", ["Água fria","Registros","Torneiras","Tubulações","Conexões"]],
    ["Instalações sanitárias", ["Esgoto","Ralos","Caixas sifonadas","Ventilação sanitária"]],
    ["Louças e metais", ["Vaso sanitário","Cuba","Torneira","Ducha","Acessórios"]],
    ["Bancadas", ["Granito","Mármore","Inox","Outros"]],
    ["Climatização", ["Evaporadora","Condensadora","Dreno","Tubulação frigorígena","Isolamento","Alimentação elétrica"]],
    ["Impermeabilização", ["Lajes","Banheiros","Áreas molhadas","Calhas","Reservatórios"]],
    ["Cobertura", ["Telhas","Rufos","Calhas","Estrutura","Fixações","Vedação"]],
    ["Fachada", ["Pintura","Revestimentos","Esquadrias","Juntas","Comunicação visual"]],
    ["Prevenção contra incêndio", ["Extintores","Placas","Iluminação de emergência","Hidrantes","Sinalização"]],
    ["Acessibilidade", ["Barras","Rampas","Piso tátil","Portas","Corrimãos","Sinalização"]],
    ["Marcenaria", ["Armários","Balcões","Painéis","Prateleiras"]],
    ["Serralheria", ["Corrimãos","Guarda-corpos","Grades","Portões"]],
    ["Comunicação visual", ["Placas","Identificação","Letreiros","Sinalização"]],
    ["Área externa", ["Calçadas","Pavimentação","Meio-fio","Drenagem"]],
    ["Paisagismo", ["Grama","Plantas","Irrigação"]],
    ["Estacionamento", ["Pavimentação","Pintura","Sinalização","Iluminação","Vagas PCD"]],
    ["Limpeza final", ["Pisos","Vidros","Louças","Metais","Resíduos","Limpeza geral"]],
    ["Outros", ["Item personalizado"]]
  ]'::jsonb;
  grupo jsonb;
  macro_nome text;
  servico_nome text;
  i int; j int;
  sid uuid;
  verifs text[];
  k int;
  ordem_macro int := 0;
  ordem_serv int;
BEGIN
  FOR i IN 0 .. jsonb_array_length(v) - 1 LOOP
    grupo := v -> i;
    macro_nome := grupo ->> 0;
    ordem_macro := ordem_macro + 1;
    ordem_serv := 0;
    FOR j IN 0 .. jsonb_array_length(grupo -> 1) - 1 LOOP
      servico_nome := (grupo -> 1) ->> j;
      ordem_serv := ordem_serv + 1;

      INSERT INTO public.biblioteca_servicos (macro, servico, escopo, ordem, keywords)
      VALUES (macro_nome, servico_nome, 'global', ordem_macro * 100 + ordem_serv,
              ARRAY[lower(macro_nome), lower(servico_nome)])
      RETURNING id INTO sid;

      -- verificações específicas
      IF macro_nome = 'Esquadrias' AND servico_nome IN ('Porta','Portão') THEN
        verifs := ARRAY['Folha','Batente','Alizar','Dobradiças','Fechadura','Maçaneta','Cilindro/miolo','Mola (quando houver)','Barra antipânico (quando houver)','Alinhamento','Prumo','Nivelamento','Folgas','Abertura','Fechamento','Travamento','Fixação','Acabamento','Pintura','Ausência de danos/riscos','Vedação'];
      ELSIF macro_nome = 'Esquadrias' THEN
        verifs := ARRAY['Folha','Batente','Ferragens','Alinhamento','Prumo','Nivelamento','Folgas','Abertura','Fechamento','Travamento','Fixação','Vedação','Acabamento','Ausência de danos/riscos'];
      ELSIF macro_nome = 'Pintura' THEN
        verifs := ARRAY['Uniformidade da cor','Cobertura','Manchas','Escorrimentos','Ondulações','Bolhas','Fissuras','Descascamento','Recortes','Encontro com rodapé','Encontro com esquadrias','Limpeza','Acabamento geral'];
      ELSIF macro_nome IN ('Pisos','Rodapés') THEN
        verifs := ARRAY['Nivelamento','Alinhamento','Caimento','Rejunte','Juntas','Fissuras/trincas','Peças soltas ou estufadas','Recortes','Encontro com paredes','Acabamento','Limpeza'];
      ELSIF macro_nome = 'Revestimento de paredes' THEN
        verifs := ARRAY['Prumo','Alinhamento','Planicidade','Rejunte','Juntas','Fissuras','Peças soltas','Recortes','Acabamento','Limpeza'];
      ELSIF macro_nome = 'Forros' THEN
        verifs := ARRAY['Nivelamento','Alinhamento','Juntas','Fixação','Fissuras','Recortes junto a luminárias','Acabamento','Limpeza'];
      ELSIF macro_nome IN ('Instalações elétricas','Iluminação','Dados e telecomunicações') THEN
        verifs := ARRAY['Instalação conforme projeto','Fixação','Nivelamento/alinhamento','Identificação','Funcionamento','Acabamento','Ausência de danos','Limpeza'];
      ELSIF macro_nome IN ('Instalações hidráulicas','Instalações sanitárias','Louças e metais') THEN
        verifs := ARRAY['Instalação conforme projeto','Fixação','Vedação','Ausência de vazamentos','Funcionamento','Caimento/escoamento','Acabamento','Limpeza'];
      ELSIF macro_nome = 'Climatização' THEN
        verifs := ARRAY['Instalação conforme projeto','Fixação','Nivelamento','Dreno com caimento','Isolamento','Alimentação elétrica','Funcionamento','Ruído/vibração','Acabamento'];
      ELSIF macro_nome = 'Acessibilidade' THEN
        verifs := ARRAY['Dimensões conforme norma','Alturas','Fixação','Sinalização','Espaço de transferência','Continuidade do percurso','Acabamento'];
      ELSE
        verifs := ARRAY['Execução conforme projeto','Alinhamento e nivelamento','Fixação','Vedação','Funcionamento','Acabamento','Ausência de danos','Limpeza'];
      END IF;

      FOR k IN 1 .. array_length(verifs, 1) LOOP
        INSERT INTO public.biblioteca_verificacoes (servico_id, descricao, ordem, default_aplicavel)
        VALUES (sid, verifs[k], k, verifs[k] NOT ILIKE '%quando houver%');
      END LOOP;
    END LOOP;
  END LOOP;
END
$seed$;

-- 8. SEED DOS TEMPLATES ----------------------------------------
DO $tpl$
DECLARE
  t jsonb := '[
    ["Sala/Gabinete","Ambiente administrativo padrão",[["Pisos","Porcelanato"],["Rodapés","Porcelanato"],["Pintura","Parede"],["Forros","Gesso"],["Esquadrias","Porta"],["Esquadrias","Janela"],["Instalações elétricas","Tomadas"],["Iluminação","Luminárias"],["Dados e telecomunicações","Pontos RJ45"],["Climatização","Evaporadora"]]],
    ["Banheiro","Sanitário comum",[["Pisos","Porcelanato"],["Revestimento de paredes","Cerâmica"],["Forros","PVC"],["Pintura","Teto"],["Esquadrias","Porta"],["Louças e metais","Vaso sanitário"],["Louças e metais","Cuba"],["Louças e metais","Torneira"],["Instalações hidráulicas","Água fria"],["Instalações sanitárias","Esgoto"],["Instalações sanitárias","Ralos"],["Instalações elétricas","Tomadas"],["Iluminação","Luminárias"]]],
    ["Banheiro PCD","Sanitário acessível",[["Pisos","Porcelanato"],["Revestimento de paredes","Cerâmica"],["Forros","PVC"],["Pintura","Teto"],["Esquadrias","Porta"],["Louças e metais","Vaso sanitário"],["Louças e metais","Cuba"],["Louças e metais","Torneira"],["Instalações hidráulicas","Água fria"],["Instalações sanitárias","Esgoto"],["Instalações sanitárias","Ralos"],["Instalações elétricas","Tomadas"],["Iluminação","Luminárias"],["Acessibilidade","Barras"],["Acessibilidade","Portas"],["Acessibilidade","Sinalização"],["Acessibilidade","Piso tátil"]]],
    ["Copa","Copa/cozinha",[["Pisos","Porcelanato"],["Rodapés","Porcelanato"],["Pintura","Parede"],["Revestimento de paredes","Cerâmica"],["Forros","Gesso"],["Bancadas","Granito"],["Louças e metais","Cuba"],["Louças e metais","Torneira"],["Instalações hidráulicas","Água fria"],["Instalações sanitárias","Esgoto"],["Marcenaria","Armários"],["Instalações elétricas","Tomadas"],["Iluminação","Luminárias"]]],
    ["Circulação","Corredores e halls",[["Pisos","Porcelanato"],["Rodapés","Porcelanato"],["Pintura","Parede"],["Forros","Gesso"],["Esquadrias","Porta"],["Iluminação","Luminárias"],["Comunicação visual","Sinalização"],["Acessibilidade","Piso tátil"]]],
    ["Área Externa","Áreas externas e calçadas",[["Área externa","Pavimentação"],["Área externa","Calçadas"],["Área externa","Drenagem"],["Área externa","Meio-fio"],["Acessibilidade","Rampas"],["Pintura","Parede"],["Iluminação","Refletores"],["Paisagismo","Grama"],["Comunicação visual","Sinalização"]]]
  ]'::jsonb;
  item jsonb; par jsonb;
  tid uuid; sid uuid;
  i int; j int; ord int;
BEGIN
  FOR i IN 0 .. jsonb_array_length(t) - 1 LOOP
    item := t -> i;
    INSERT INTO public.recebimento_templates (nome, descricao, escopo, ordem)
    VALUES (item ->> 0, item ->> 1, 'global', i + 1)
    RETURNING id INTO tid;

    ord := 0;
    FOR j IN 0 .. jsonb_array_length(item -> 2) - 1 LOOP
      par := (item -> 2) -> j;
      SELECT id INTO sid FROM public.biblioteca_servicos
      WHERE escopo = 'global' AND macro = (par ->> 0) AND servico = (par ->> 1) LIMIT 1;
      IF sid IS NOT NULL THEN
        ord := ord + 1;
        INSERT INTO public.recebimento_template_servicos (template_id, biblioteca_servico_id, ordem)
        VALUES (tid, sid, ord);
      END IF;
    END LOOP;
  END LOOP;
END
$tpl$;