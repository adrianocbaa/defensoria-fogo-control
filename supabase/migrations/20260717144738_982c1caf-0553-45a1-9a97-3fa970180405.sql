
-- =====================================================================
-- FASE 1: Fundação de dados para Documentos de Encerramento (TRP/TRD/ACT)
-- Migration NÃO destrutiva - apenas adiciona campos e tabelas
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Novos campos em OBRAS (todos nullable)
-- ---------------------------------------------------------------------
ALTER TABLE public.obras
  ADD COLUMN IF NOT EXISTS endereco_completo TEXT,
  ADD COLUMN IF NOT EXISTS numero_art_execucao TEXT,
  ADD COLUMN IF NOT EXISTS area_interferencia_m2 NUMERIC,
  ADD COLUMN IF NOT EXISTS data_recebimento_provisorio DATE,
  ADD COLUMN IF NOT EXISTS data_recebimento_definitivo DATE,
  ADD COLUMN IF NOT EXISTS prazo_observacao_dias INTEGER DEFAULT 90,
  ADD COLUMN IF NOT EXISTS configuracao_edificacao TEXT
    CHECK (configuracao_edificacao IN ('terrea','2_pav','3_pav','4_mais_pav','custom') OR configuracao_edificacao IS NULL),
  ADD COLUMN IF NOT EXISTS descricao_edificacao_custom TEXT,
  ADD COLUMN IF NOT EXISTS condicao_imovel TEXT
    CHECK (condicao_imovel IN ('proprio','locado','cedido','outro') OR condicao_imovel IS NULL),
  ADD COLUMN IF NOT EXISTS condicao_imovel_custom TEXT,
  ADD COLUMN IF NOT EXISTS descricao_tecnica_imovel TEXT,
  ADD COLUMN IF NOT EXISTS objeto_contrato TEXT,
  ADD COLUMN IF NOT EXISTS sistemas_servicos_ids UUID[] DEFAULT ARRAY[]::UUID[];

-- ---------------------------------------------------------------------
-- 2) Novos campos em EMPRESAS (todos nullable)
-- ---------------------------------------------------------------------
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS numero TEXT,
  ADD COLUMN IF NOT EXISTS complemento TEXT,
  ADD COLUMN IF NOT EXISTS bairro TEXT,
  ADD COLUMN IF NOT EXISTS representante_legal_nome TEXT,
  ADD COLUMN IF NOT EXISTS representante_legal_cpf TEXT,
  ADD COLUMN IF NOT EXISTS representante_legal_cargo TEXT,
  ADD COLUMN IF NOT EXISTS responsavel_tecnico_nome TEXT,
  ADD COLUMN IF NOT EXISTS responsavel_tecnico_cpf TEXT,
  ADD COLUMN IF NOT EXISTS responsavel_tecnico_profissao TEXT,
  ADD COLUMN IF NOT EXISTS conselho_tipo TEXT CHECK (conselho_tipo IN ('CREA','CAU') OR conselho_tipo IS NULL),
  ADD COLUMN IF NOT EXISTS conselho_numero TEXT,
  ADD COLUMN IF NOT EXISTS conselho_uf TEXT;

-- ---------------------------------------------------------------------
-- 3) Novos campos em ADITIVO_SESSIONS (todos nullable)
-- ---------------------------------------------------------------------
ALTER TABLE public.aditivo_sessions
  ADD COLUMN IF NOT EXISTS numero_art TEXT,
  ADD COLUMN IF NOT EXISTS nova_data_termino DATE,
  ADD COLUMN IF NOT EXISTS tipo_aditivo TEXT
    CHECK (tipo_aditivo IN ('valor','prazo','valor_prazo') OR tipo_aditivo IS NULL),
  ADD COLUMN IF NOT EXISTS valor_acrescimo NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_supressao NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS observacao TEXT;

-- ---------------------------------------------------------------------
-- 4) CATÁLOGO de sistemas/serviços da edificação
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catalogo_sistemas_servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  texto_documento TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.catalogo_sistemas_servicos TO authenticated;
GRANT ALL ON public.catalogo_sistemas_servicos TO service_role;

ALTER TABLE public.catalogo_sistemas_servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalogo_read_authenticated"
  ON public.catalogo_sistemas_servicos FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "catalogo_admin_manage"
  ON public.catalogo_sistemas_servicos FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_catalogo_updated_at
  BEFORE UPDATE ON public.catalogo_sistemas_servicos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed inicial do catálogo
INSERT INTO public.catalogo_sistemas_servicos (nome, texto_documento, ordem) VALUES
  ('Rede lógica cabeada','rede lógica cabeada',10),
  ('Rede estruturada','rede estruturada',20),
  ('Instalações elétricas de baixa tensão','instalações elétricas de baixa tensão',30),
  ('Quadros e circuitos elétricos','quadros e circuitos elétricos',40),
  ('Iluminação','sistema de iluminação',50),
  ('Instalações hidrossanitárias','instalações hidrossanitárias',60),
  ('Instalações de prevenção e combate a incêndio','instalações de prevenção e combate a incêndio',70),
  ('Climatização','sistema de climatização',80),
  ('Pré-instalação de ar-condicionado','pré-instalação de ar-condicionado',90),
  ('Drenagem de ar-condicionado','drenagem de ar-condicionado',100),
  ('Cobertura','cobertura',110),
  ('Telhamento','telhamento',120),
  ('Calhas e condutores','calhas e condutores',130),
  ('Impermeabilização','impermeabilização',140),
  ('Alvenaria','alvenaria',150),
  ('Drywall','drywall',160),
  ('Revestimentos de paredes','revestimentos de paredes',170),
  ('Revestimentos de pisos','revestimentos de pisos',180),
  ('Forros','forros',190),
  ('Esquadrias','esquadrias',200),
  ('Vidros','vidros',210),
  ('Pintura interna','pintura interna',220),
  ('Pintura externa','pintura externa',230),
  ('Acessibilidade','acessibilidade',240),
  ('Piso tátil','piso tátil',250),
  ('Comunicação visual','comunicação visual',260),
  ('Fachada','fachada',270),
  ('Paisagismo','paisagismo',280),
  ('Limpeza final','limpeza final',290)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 5) CONFIG INSTITUCIONAL (singleton)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.config_institucional (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social TEXT NOT NULL DEFAULT 'DEFENSORIA PÚBLICA DO ESTADO DE MATO GROSSO',
  cnpj TEXT,
  endereco TEXT,
  cidade TEXT NOT NULL DEFAULT 'Cuiabá/MT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.config_institucional TO authenticated;
GRANT ALL ON public.config_institucional TO service_role;

ALTER TABLE public.config_institucional ENABLE ROW LEVEL SECURITY;

CREATE POLICY "config_inst_read_auth"
  ON public.config_institucional FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "config_inst_admin_manage"
  ON public.config_institucional FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_config_inst_updated_at
  BEFORE UPDATE ON public.config_institucional
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insere registro em branco (singleton)
INSERT INTO public.config_institucional (razao_social) 
SELECT 'DEFENSORIA PÚBLICA DO ESTADO DE MATO GROSSO'
WHERE NOT EXISTS (SELECT 1 FROM public.config_institucional);

-- ---------------------------------------------------------------------
-- 6) DPG_GESTAO — Defensoras Públicas-Gerais com vigências
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dpg_gestao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT,
  cargo TEXT NOT NULL DEFAULT 'Defensora Pública-Geral',
  condicao TEXT NOT NULL DEFAULT 'titular'
    CHECK (condicao IN ('titular','substituta','em_exercicio')),
  texto_cargo_documento TEXT NOT NULL,
  vigencia_inicio DATE NOT NULL,
  vigencia_fim DATE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  assinatura_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

GRANT SELECT ON public.dpg_gestao TO authenticated;
GRANT ALL ON public.dpg_gestao TO service_role;

ALTER TABLE public.dpg_gestao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dpg_read_auth"
  ON public.dpg_gestao FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "dpg_admin_manage"
  ON public.dpg_gestao FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_dpg_updated_at
  BEFORE UPDATE ON public.dpg_gestao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_dpg_vigencia ON public.dpg_gestao (vigencia_inicio, vigencia_fim) WHERE ativo = true;

-- ---------------------------------------------------------------------
-- 7) DOCUMENTOS_ENCERRAMENTO — snapshot imutável de cada geração
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documentos_encerramento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('TRP','TRD','ACT')),
  versao INTEGER NOT NULL DEFAULT 1,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_recebimento DATE,
  snapshot_dados JSONB NOT NULL,
  arquivo_pdf_path TEXT,
  arquivo_docx_path TEXT,
  arquivo_hash TEXT,
  status TEXT NOT NULL DEFAULT 'gerado' CHECK (status IN ('rascunho','gerado','anulado')),
  justificativa_excecao TEXT,
  gerado_por UUID,
  gerado_por_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (obra_id, tipo, versao)
);

GRANT SELECT, INSERT ON public.documentos_encerramento TO authenticated;
GRANT ALL ON public.documentos_encerramento TO service_role;

ALTER TABLE public.documentos_encerramento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "docs_encerramento_select"
  ON public.documentos_encerramento FOR SELECT
  TO authenticated
  USING (public.user_has_obra_access(auth.uid(), obra_id));

CREATE POLICY "docs_encerramento_insert"
  ON public.documentos_encerramento FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit_obra(obra_id, auth.uid()));

-- Não permitir UPDATE/DELETE (imutável) — a ausência de policies bloqueia essas operações sob RLS.
-- Admin ainda pode via service_role se necessário.

CREATE INDEX IF NOT EXISTS idx_docs_encerramento_obra ON public.documentos_encerramento (obra_id, tipo, versao DESC);

-- ---------------------------------------------------------------------
-- 8) DOCUMENTO_ASSINANTES — assinantes de cada documento gerado
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documento_assinantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID NOT NULL REFERENCES public.documentos_encerramento(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL DEFAULT 0,
  bloco TEXT NOT NULL CHECK (bloco IN ('fiscal','empresa','dpg','comissao','outro')),
  nome TEXT NOT NULL,
  cargo TEXT,
  cpf TEXT,
  complementos JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.documento_assinantes TO authenticated;
GRANT ALL ON public.documento_assinantes TO service_role;

ALTER TABLE public.documento_assinantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doc_assin_select"
  ON public.documento_assinantes FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.documentos_encerramento d
    WHERE d.id = documento_id
      AND public.user_has_obra_access(auth.uid(), d.obra_id)
  ));

CREATE POLICY "doc_assin_insert"
  ON public.documento_assinantes FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.documentos_encerramento d
    WHERE d.id = documento_id
      AND public.can_edit_obra(d.obra_id, auth.uid())
  ));

CREATE INDEX IF NOT EXISTS idx_doc_assin_doc ON public.documento_assinantes (documento_id, ordem);
