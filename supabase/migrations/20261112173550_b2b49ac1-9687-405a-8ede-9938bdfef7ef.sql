-- Avaliações — banco reutilizável de imóveis e dados de mercado por organização.
-- Aditiva: o cadastro físico (imoveis) e as observações de mercado (dados_mercado) já são da organização;
-- esta migração acrescenta a foto imutável da inclusão em cada amostra, a origem da inclusão, busca no banco,
-- inclusão em lote, importação de amostras de outra avaliação, situação "desatualizado" e alerta de duplicidade ampliado.

-- 1) Situação do dado de mercado
ALTER TABLE public.dados_mercado DROP CONSTRAINT IF EXISTS dados_mercado_status_check;
ALTER TABLE public.dados_mercado ADD CONSTRAINT dados_mercado_status_check CHECK (status IN ('ATIVO','INATIVO','DESATUALIZADO','DESCARTADO'));
CREATE INDEX IF NOT EXISTS dados_mercado_org_data_idx ON public.dados_mercado(organization_id, data_observacao DESC);
CREATE INDEX IF NOT EXISTS avaliacao_amostras_dado_idx ON public.avaliacao_amostras(dado_id);

-- 2) Amostra: origem da inclusão e foto imutável dos dados usados
ALTER TABLE public.avaliacao_amostras
  ADD COLUMN IF NOT EXISTS origem_inclusao text NOT NULL DEFAULT 'CADASTRO_NOVO',
  ADD COLUMN IF NOT EXISTS importada_de_amostra_id uuid REFERENCES public.avaliacao_amostras(id),
  ADD COLUMN IF NOT EXISTS snapshot_inclusao jsonb,
  ADD COLUMN IF NOT EXISTS snapshot_chave text,
  ADD COLUMN IF NOT EXISTS snapshot_em timestamptz,
  ADD COLUMN IF NOT EXISTS snapshot_fonte text;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'avaliacao_amostras_origem_inclusao_check') THEN
    ALTER TABLE public.avaliacao_amostras ADD CONSTRAINT avaliacao_amostras_origem_inclusao_check
      CHECK (origem_inclusao IN ('CADASTRO_NOVO','BANCO','IMPORTACAO','LEGADO'));
  END IF;
END $$;

-- Foto completa do imóvel + dado de mercado (mesmo formato do congelamento do conjunto).
CREATE OR REPLACE FUNCTION public.aval_amostra_payload(p_dado uuid) RETURNS jsonb
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT jsonb_build_object(
    'dado', to_jsonb(d) - 'updated_at',
    'imovel', to_jsonb(i) - 'updated_at' - 'endereco_normalizado',
    'localizacao', (SELECT to_jsonb(l) - 'updated_at' - 'id' FROM public.imovel_localizacao l WHERE l.imovel_id = d.imovel_id),
    'atributos', COALESCE((SELECT jsonb_object_agg(at.codigo, jsonb_build_object('nome', at.nome, 'numeric', ia.valor_numeric, 'text', ia.valor_text,
                     'bool', ia.valor_bool, 'category', ia.valor_category, 'status', ia.valor_status))
                   FROM public.imovel_atributos ia JOIN public.atributos_imobiliarios at ON at.id = ia.atributo_id WHERE ia.imovel_id = d.imovel_id), '{}'::jsonb),
    'ambientes', COALESCE((SELECT jsonb_agg(jsonb_build_object('tipo', am.tipo, 'nome', am.nome, 'quantidade', am.quantidade, 'area', am.area) ORDER BY am.tipo, am.nome, am.id)
                   FROM public.imovel_ambientes am WHERE am.imovel_id = d.imovel_id), '[]'::jsonb),
    'fontes', COALESCE((SELECT jsonb_agg(jsonb_build_object('tipo', f.tipo, 'nome', f.nome, 'principal', df.principal) ORDER BY df.principal DESC, f.nome, f.id)
                   FROM public.dados_mercado_fontes df JOIN public.fontes_mercado f ON f.id = df.fonte_id WHERE df.dado_id = d.id), '[]'::jsonb))
  FROM public.dados_mercado d JOIN public.imoveis i ON i.id = d.imovel_id WHERE d.id = p_dado
$$;

-- Chave comparável dos campos técnicos (serve tanto para a foto da inclusão quanto para a do conjunto congelado).
CREATE OR REPLACE FUNCTION public.aval_amostra_chave(p jsonb) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN p IS NULL OR p->'dado' IS NULL THEN NULL ELSE public.aval_hash(jsonb_build_object(
    'd', jsonb_build_object('tn', p->'dado'->'tipo_negocio', 'nat', p->'dado'->'natureza_dado', 'vo', p->'dado'->'valor_ofertado',
          'vn', p->'dado'->'valor_negociado', 'vu', p->'dado'->'valor_utilizado', 'per', p->'dado'->'periodicidade', 'dt', p->'dado'->'data_observacao'),
    'i', jsonb_build_object('id', p->'imovel'->'id', 'tipo', p->'imovel'->'tipo_imovel', 'end', p->'imovel'->'endereco', 'num', p->'imovel'->'numero',
          'comp', p->'imovel'->'complemento', 'bairro', p->'imovel'->'bairro', 'ibge', p->'imovel'->'municipio_ibge',
          'ac', p->'imovel'->'area_construida', 'at', p->'imovel'->'area_terreno', 'pad', p->'imovel'->'padrao'),
    'l', jsonb_build_object('lat', p->'localizacao'->'latitude', 'lng', p->'localizacao'->'longitude'),
    'a', COALESCE((SELECT jsonb_object_agg(k, v - 'nome') FROM jsonb_each(CASE WHEN jsonb_typeof(p->'atributos') = 'object' THEN p->'atributos' ELSE '{}'::jsonb END) e(k, v)), '{}'::jsonb)
  )) END
$$;

CREATE OR REPLACE FUNCTION public.aval_origem_territorial_padrao(p_av_ibge text, p_imovel_ibge text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN p_av_ibge IS NULL OR p_imovel_ibge IS NULL OR p_av_ibge = p_imovel_ibge THEN 'LOCAL' ELSE 'MUNICIPIO_COMPARAVEL' END
$$;

-- 3) Backfill: amostras existentes recebem a foto mais antiga disponível (1º conjunto congelado) ou o cadastro atual.
WITH s AS (
  SELECT DISTINCT ON (x.amostra_id) x.amostra_id, x.dados, x.created_at, c.versao
    FROM public.avaliacao_amostra_snapshots x JOIN public.avaliacao_conjuntos_dados c ON c.id = x.conjunto_id
   ORDER BY x.amostra_id, c.versao, x.created_at
), z AS (
  SELECT a.id, COALESCE(s.dados, public.aval_amostra_payload(a.dado_id)) AS foto,
         CASE WHEN s.dados IS NOT NULL THEN 'CONJUNTO_V' || s.versao ELSE 'CADASTRO_NA_MIGRACAO' END AS fonte,
         COALESCE(s.created_at, now()) AS em
    FROM public.avaliacao_amostras a LEFT JOIN s ON s.amostra_id = a.id
   WHERE a.snapshot_inclusao IS NULL
)
UPDATE public.avaliacao_amostras a SET origem_inclusao = 'LEGADO', snapshot_inclusao = z.foto, snapshot_chave = public.aval_amostra_chave(z.foto),
       snapshot_fonte = z.fonte, snapshot_em = z.em
  FROM z WHERE z.id = a.id;

-- 4) Gatilhos: foto na inclusão (sempre calculada no servidor), imutabilidade e trilha.
CREATE OR REPLACE FUNCTION public.aval_trg_amostra_snapshot() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  v := public.aval_amostra_payload(NEW.dado_id);
  IF v IS NULL THEN RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '23503'; END IF;
  IF NEW.importada_de_amostra_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.avaliacao_amostras
       WHERE id = NEW.importada_de_amostra_id AND organization_id = NEW.organization_id AND avaliacao_id <> NEW.avaliacao_id) THEN
    RAISE EXCEPTION 'aval:cross_org_reference' USING ERRCODE = '42501';
  END IF;
  NEW.snapshot_inclusao := v; NEW.snapshot_chave := public.aval_amostra_chave(v);
  NEW.snapshot_em := now(); NEW.snapshot_fonte := 'INCLUSAO';
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS aval_snapshot_inclusao ON public.avaliacao_amostras;
CREATE TRIGGER aval_snapshot_inclusao BEFORE INSERT ON public.avaliacao_amostras FOR EACH ROW EXECUTE FUNCTION public.aval_trg_amostra_snapshot();

CREATE OR REPLACE FUNCTION public.aval_trg_amostra_snapshot_imutavel() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.dado_id IS DISTINCT FROM OLD.dado_id
     OR (OLD.snapshot_inclusao IS NOT NULL AND (NEW.snapshot_inclusao IS DISTINCT FROM OLD.snapshot_inclusao
         OR NEW.snapshot_chave IS DISTINCT FROM OLD.snapshot_chave OR NEW.snapshot_em IS DISTINCT FROM OLD.snapshot_em
         OR NEW.snapshot_fonte IS DISTINCT FROM OLD.snapshot_fonte))
     OR NEW.origem_inclusao IS DISTINCT FROM OLD.origem_inclusao OR NEW.importada_de_amostra_id IS DISTINCT FROM OLD.importada_de_amostra_id THEN
    RAISE EXCEPTION 'aval:snapshot_immutable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS aval_snapshot_imutavel ON public.avaliacao_amostras;
CREATE TRIGGER aval_snapshot_imutavel BEFORE UPDATE ON public.avaliacao_amostras FOR EACH ROW EXECUTE FUNCTION public.aval_trg_amostra_snapshot_imutavel();

CREATE OR REPLACE FUNCTION public.aval_trg_amostra_audit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.aval_audit(NEW.avaliacao_id, 'avaliacao_amostra', NEW.id, 'SAMPLE_ADDED', jsonb_build_object(
    'origem_inclusao', NEW.origem_inclusao, 'dado_id', NEW.dado_id, 'imovel_id', NEW.snapshot_inclusao->'imovel'->>'id',
    'importada_de_amostra_id', NEW.importada_de_amostra_id, 'snapshot_chave', NEW.snapshot_chave));
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS aval_amostra_audit ON public.avaliacao_amostras;
CREATE TRIGGER aval_amostra_audit AFTER INSERT ON public.avaliacao_amostras FOR EACH ROW EXECUTE FUNCTION public.aval_trg_amostra_audit();

-- 5) Guarda de edição: a situação operacional do anúncio (ativo/inativo/desatualizado) pode mudar sem o fluxo de impacto.
CREATE OR REPLACE FUNCTION public.aval_guard_live_cadastro() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE v_linked boolean := false; v_ign text[] := ARRAY['updated_at','endereco_normalizado'];
BEGIN
  IF public.aval_batch_active() OR public.aval_is_privileged() THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'avaliacao_amostras' THEN
    IF NEW.origem_territorial IS DISTINCT FROM OLD.origem_territorial THEN RAISE EXCEPTION 'aval:use_change_flow' USING ERRCODE = '42501'; END IF;
    RETURN NEW;
  END IF;
  IF TG_TABLE_NAME = 'dados_mercado' THEN v_ign := v_ign || ARRAY['status']; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF (to_jsonb(NEW) - v_ign) = (to_jsonb(OLD) - v_ign) THEN RETURN NEW; END IF;
  END IF;
  IF TG_TABLE_NAME = 'imoveis' THEN
    v_linked := EXISTS (SELECT 1 FROM public.avaliacao_imoveis WHERE imovel_id = NEW.id)
             OR EXISTS (SELECT 1 FROM public.dados_mercado d JOIN public.avaliacao_amostras a ON a.dado_id = d.id WHERE d.imovel_id = NEW.id);
  ELSIF TG_TABLE_NAME = 'imovel_localizacao' THEN
    v_linked := EXISTS (SELECT 1 FROM public.avaliacao_imoveis WHERE imovel_id = NEW.imovel_id)
             OR EXISTS (SELECT 1 FROM public.dados_mercado d JOIN public.avaliacao_amostras a ON a.dado_id = d.id WHERE d.imovel_id = NEW.imovel_id);
  ELSIF TG_TABLE_NAME = 'dados_mercado' THEN
    v_linked := EXISTS (SELECT 1 FROM public.avaliacao_amostras WHERE dado_id = NEW.id);
  END IF;
  IF v_linked THEN RAISE EXCEPTION 'aval:use_change_flow' USING ERRCODE = '42501'; END IF;
  RETURN NEW;
END $$;

-- 6) Busca no banco da organização (respeita as regras de acesso de quem consulta).
CREATE OR REPLACE FUNCTION public.aval_banco_base(p_org uuid, p_filtros jsonb, p_origem uuid)
RETURNS TABLE(dado_id uuid, imovel_id uuid, ord bigint, rk bigint, n_dados bigint, data_mais_recente date, amostra_origem_id uuid)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH f AS (SELECT COALESCE(p_filtros, '{}'::jsonb) AS j),
  base AS (
    SELECT d.id AS dado_id, d.imovel_id, d.tipo_negocio, d.status, d.data_observacao, d.created_at, d.descricao, d.url_anuncio, d.anuncio_id AS d_anuncio,
      i.tipo_imovel, i.endereco, i.numero, i.complemento, i.bairro, i.municipio_nome, i.municipio_ibge, i.uf, i.area_construida, i.anuncio_id,
      src.id AS amostra_origem_id, src.created_at AS origem_ordem,
      row_number() OVER (PARTITION BY d.imovel_id ORDER BY d.data_observacao DESC NULLS LAST, d.created_at DESC, d.id) AS rk,
      count(*) OVER (PARTITION BY d.imovel_id) AS n_dados,
      max(d.data_observacao) OVER (PARTITION BY d.imovel_id) AS data_mais_recente
    FROM public.dados_mercado d JOIN public.imoveis i ON i.id = d.imovel_id
    LEFT JOIN public.avaliacao_amostras src ON p_origem IS NOT NULL AND src.avaliacao_id = p_origem AND src.dado_id = d.id
    WHERE d.organization_id = p_org AND i.organization_id = p_org
  ), filt AS (
    SELECT b.* FROM base b, f
    WHERE (p_origem IS NULL OR b.amostra_origem_id IS NOT NULL)
      AND (p_origem IS NOT NULL OR NOT COALESCE((f.j->>'somente_recentes')::boolean, true) OR b.rk = 1)
      AND (COALESCE(f.j->>'municipio_ibge', '') = '' OR b.municipio_ibge = f.j->>'municipio_ibge')
      AND (COALESCE(f.j->>'uf', '') = '' OR b.uf = f.j->>'uf')
      AND (COALESCE(f.j->>'tipo_negocio', '') = '' OR b.tipo_negocio = f.j->>'tipo_negocio')
      AND (COALESCE(f.j->>'status', '') = '' OR b.status = f.j->>'status')
      AND (COALESCE(f.j->>'tipo_imovel', '') = '' OR position(public.aval_normalize_text(f.j->>'tipo_imovel') IN public.aval_normalize_text(b.tipo_imovel)) > 0)
      AND (COALESCE(f.j->>'bairro', '') = '' OR position(public.aval_normalize_text(f.j->>'bairro') IN public.aval_normalize_text(b.bairro)) > 0)
      AND (NULLIF(f.j->>'area_min', '') IS NULL OR b.area_construida >= (f.j->>'area_min')::numeric)
      AND (NULLIF(f.j->>'area_max', '') IS NULL OR b.area_construida <= (f.j->>'area_max')::numeric)
      AND (NULLIF(f.j->>'data_de', '') IS NULL OR b.data_observacao >= (f.j->>'data_de')::date)
      AND (NULLIF(f.j->>'data_ate', '') IS NULL OR b.data_observacao <= (f.j->>'data_ate')::date)
      AND (COALESCE(f.j->>'fonte', '') = '' OR EXISTS (SELECT 1 FROM public.dados_mercado_fontes df JOIN public.fontes_mercado fm ON fm.id = df.fonte_id
            WHERE df.dado_id = b.dado_id AND (fm.tipo = f.j->>'fonte' OR position(public.aval_normalize_text(f.j->>'fonte') IN public.aval_normalize_text(fm.nome)) > 0)))
      AND (COALESCE(f.j->>'q', '') = '' OR position(public.aval_normalize_text(f.j->>'q') IN public.aval_normalize_text(concat_ws(' ', b.endereco, b.numero, b.complemento,
            b.bairro, b.tipo_imovel, b.municipio_nome, b.descricao, b.url_anuncio, b.d_anuncio, b.anuncio_id))) > 0)
      AND (NOT COALESCE((f.j->>'excluir_da_avaliacao')::boolean, false) OR NOT EXISTS (SELECT 1 FROM public.avaliacao_amostras x
            WHERE x.avaliacao_id = NULLIF(f.j->>'avaliacao_destino', '')::uuid AND x.dado_id = b.dado_id))
  )
  SELECT dado_id, imovel_id,
    row_number() OVER (ORDER BY CASE WHEN p_origem IS NOT NULL THEN origem_ordem END, data_observacao DESC NULLS LAST, created_at DESC, dado_id) AS ord,
    rk, n_dados, data_mais_recente, amostra_origem_id
  FROM filt
$$;

CREATE OR REPLACE FUNCTION public.aval_banco_buscar(p_avaliacao uuid, p_filtros jsonb DEFAULT '{}'::jsonb, p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE av record; f jsonb := COALESCE(p_filtros, '{}'::jsonb); v_origem uuid; v_total int; v_rows jsonb;
  v_lim int := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200); v_off int := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'aval:unauthenticated' USING ERRCODE = '42501'; END IF;
  IF jsonb_typeof(f) <> 'object' THEN RAISE EXCEPTION 'aval:invalid_value' USING ERRCODE = '22023'; END IF;
  SELECT a.id, a.organization_id INTO av FROM public.avaliacoes a WHERE a.id = p_avaliacao AND public.aval_is_reader(a.organization_id);
  IF av.id IS NULL THEN RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501'; END IF;
  BEGIN v_origem := NULLIF(f->>'avaliacao_origem', '')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN RAISE EXCEPTION 'aval:invalid_value' USING ERRCODE = '22023'; END;
  IF v_origem IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.avaliacoes WHERE id = v_origem AND organization_id = av.organization_id AND id <> av.id) THEN
    RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501';
  END IF;
  f := f || jsonb_build_object('avaliacao_destino', av.id);
  BEGIN
    SELECT count(*)::int INTO v_total FROM public.aval_banco_base(av.organization_id, f, v_origem);
    SELECT COALESCE(jsonb_agg(r.j ORDER BY r.ord), '[]'::jsonb) INTO v_rows FROM (
      SELECT b.ord, jsonb_build_object(
        'dado_id', d.id, 'imovel_id', i.id, 'tipo_negocio', d.tipo_negocio, 'natureza_dado', d.natureza_dado, 'status', d.status,
        'valor_ofertado', d.valor_ofertado, 'valor_utilizado', d.valor_utilizado, 'valor_unitario', d.valor_unitario, 'periodicidade', d.periodicidade,
        'data_observacao', d.data_observacao, 'url_anuncio', d.url_anuncio, 'descricao', d.descricao,
        'tipo_imovel', i.tipo_imovel, 'endereco', i.endereco, 'numero', i.numero, 'complemento', i.complemento, 'bairro', i.bairro,
        'municipio_nome', i.municipio_nome, 'municipio_ibge', i.municipio_ibge, 'uf', i.uf, 'area_construida', i.area_construida, 'area_terreno', i.area_terreno,
        'padrao', i.padrao,
        'fonte', (SELECT jsonb_build_object('tipo', fm.tipo, 'nome', fm.nome) FROM public.dados_mercado_fontes df JOIN public.fontes_mercado fm ON fm.id = df.fonte_id
                   WHERE df.dado_id = d.id ORDER BY df.principal DESC, df.created_at LIMIT 1),
        'atributos', COALESCE((SELECT jsonb_agg(jsonb_build_object('nome', at.nome, 'unidade', at.unidade, 'valor',
                   COALESCE(ia.valor_numeric::text, ia.valor_category, ia.valor_text, CASE WHEN ia.valor_bool THEN 'Sim' WHEN NOT ia.valor_bool THEN 'Não' END))
                   ORDER BY at.ordem, at.nome) FROM public.imovel_atributos ia JOIN public.atributos_imobiliarios at ON at.id = ia.atributo_id
                   WHERE ia.imovel_id = i.id AND COALESCE(ia.valor_numeric::text, ia.valor_category, ia.valor_text, ia.valor_bool::text) IS NOT NULL), '[]'::jsonb),
        'mais_recente', b.rk = 1, 'dados_do_imovel', b.n_dados, 'data_mais_recente', b.data_mais_recente,
        'ja_na_avaliacao', EXISTS (SELECT 1 FROM public.avaliacao_amostras x WHERE x.avaliacao_id = av.id AND x.dado_id = d.id),
        'imovel_na_avaliacao', EXISTS (SELECT 1 FROM public.avaliacao_amostras x JOIN public.dados_mercado dx ON dx.id = x.dado_id
                   WHERE x.avaliacao_id = av.id AND dx.imovel_id = i.id AND dx.id <> d.id),
        'avaliacoes_uso', (SELECT count(DISTINCT x.avaliacao_id) FROM public.avaliacao_amostras x WHERE x.dado_id = d.id),
        'amostra_origem_id', b.amostra_origem_id)
        || CASE WHEN b.amostra_origem_id IS NULL THEN '{}'::jsonb ELSE (
             SELECT jsonb_build_object('origem_selecionada', s.selecionada, 'origem_habilitada', s.habilitada_modelo,
               'origem_valor_utilizado', s.snapshot_inclusao->'dado'->'valor_utilizado', 'origem_area', s.snapshot_inclusao->'imovel'->'area_construida',
               'origem_data', s.snapshot_inclusao->'dado'->'data_observacao', 'origem_snapshot_em', s.snapshot_em,
               'divergente', s.snapshot_chave IS DISTINCT FROM public.aval_amostra_chave(public.aval_amostra_payload(d.id)))
             FROM public.avaliacao_amostras s WHERE s.id = b.amostra_origem_id) END AS j
      FROM public.aval_banco_base(av.organization_id, f, v_origem) b
      JOIN public.dados_mercado d ON d.id = b.dado_id JOIN public.imoveis i ON i.id = b.imovel_id
      WHERE b.ord > v_off AND b.ord <= v_off + v_lim) r;
  EXCEPTION WHEN invalid_text_representation OR invalid_datetime_format OR datetime_field_overflow THEN
    RAISE EXCEPTION 'aval:invalid_value' USING ERRCODE = '22023';
  END;
  RETURN jsonb_build_object('total', v_total, 'limit', v_lim, 'offset', v_off, 'rows', v_rows);
END $$;

-- 7) Inclusão em lote a partir do banco (sem copiar o cadastro).
CREATE OR REPLACE FUNCTION public.aval_amostras_adicionar(p_avaliacao uuid, p_dados uuid[]) RETURNS jsonb
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE av record; d record; v_ids uuid[] := '{}'; v_id uuid; v_dup int := 0; v_n int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'aval:unauthenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO av FROM public.avaliacoes WHERE id = p_avaliacao AND public.aval_is_reader(organization_id);
  IF av.id IS NULL THEN RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501'; END IF;
  IF av.status <> 'ATIVA' THEN RAISE EXCEPTION 'aval:evaluation_not_active' USING ERRCODE = '42501'; END IF;
  IF NOT public.aval_can_edit(p_avaliacao, 'market.select_samples') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  v_n := COALESCE(cardinality(ARRAY(SELECT DISTINCT unnest(p_dados))), 0);
  IF v_n = 0 OR v_n > 200 THEN RAISE EXCEPTION 'aval:invalid_value' USING ERRCODE = '22023'; END IF;
  IF (SELECT count(*) FROM public.dados_mercado WHERE id = ANY(p_dados) AND organization_id = av.organization_id) <> v_n THEN
    RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501';
  END IF;
  FOR d IN SELECT dm.id, i.municipio_ibge FROM (SELECT DISTINCT ON (u.id) u.id, u.o FROM unnest(p_dados) WITH ORDINALITY u(id, o) ORDER BY u.id, u.o) u
             JOIN public.dados_mercado dm ON dm.id = u.id JOIN public.imoveis i ON i.id = dm.imovel_id ORDER BY u.o LOOP
    IF EXISTS (SELECT 1 FROM public.avaliacao_amostras WHERE avaliacao_id = p_avaliacao AND dado_id = d.id) THEN v_dup := v_dup + 1; CONTINUE; END IF;
    INSERT INTO public.avaliacao_amostras(avaliacao_id, dado_id, origem_territorial, origem_inclusao, motivo_inclusao)
    VALUES (p_avaliacao, d.id, public.aval_origem_territorial_padrao(av.municipio_ibge, d.municipio_ibge), 'BANCO', 'Incluída a partir do banco de imóveis')
    RETURNING id INTO v_id;
    v_ids := v_ids || v_id;
  END LOOP;
  RETURN jsonb_build_object('adicionadas', cardinality(v_ids), 'ja_existentes', v_dup, 'amostras', to_jsonb(v_ids));
END $$;

-- 8) Importação de amostras de outra avaliação da mesma organização (vínculo novo + foto própria; cadastro reaproveitado).
CREATE OR REPLACE FUNCTION public.aval_amostras_importar(p_avaliacao uuid, p_origem uuid, p_amostras uuid[] DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE av record; src record; s record; v_id uuid; v_ids uuid[] := '{}'; v_dup int := 0; v_vars int := 0; v_n int; v_pode_var boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'aval:unauthenticated' USING ERRCODE = '42501'; END IF;
  SELECT * INTO av FROM public.avaliacoes WHERE id = p_avaliacao AND public.aval_is_reader(organization_id);
  IF av.id IS NULL THEN RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501'; END IF;
  IF av.status <> 'ATIVA' THEN RAISE EXCEPTION 'aval:evaluation_not_active' USING ERRCODE = '42501'; END IF;
  IF NOT public.aval_can_edit(p_avaliacao, 'market.select_samples') THEN RAISE EXCEPTION 'aval:permission_denied' USING ERRCODE = '42501'; END IF;
  SELECT * INTO src FROM public.avaliacoes WHERE id = p_origem AND organization_id = av.organization_id AND id <> av.id;
  IF src.id IS NULL THEN RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501'; END IF;
  IF p_amostras IS NOT NULL THEN
    v_n := cardinality(ARRAY(SELECT DISTINCT unnest(p_amostras)));
    IF v_n = 0 OR v_n > 500 THEN RAISE EXCEPTION 'aval:invalid_value' USING ERRCODE = '22023'; END IF;
    IF (SELECT count(*) FROM public.avaliacao_amostras WHERE id = ANY(p_amostras) AND avaliacao_id = src.id) <> v_n THEN
      RAISE EXCEPTION 'aval:not_found' USING ERRCODE = '42501';
    END IF;
  END IF;
  v_pode_var := public.aval_can_edit(p_avaliacao, 'model.create');
  FOR s IN SELECT a.id, a.dado_id, a.selecionada, a.habilitada_modelo, i.municipio_ibge
             FROM public.avaliacao_amostras a JOIN public.dados_mercado dm ON dm.id = a.dado_id JOIN public.imoveis i ON i.id = dm.imovel_id
            WHERE a.avaliacao_id = src.id AND (p_amostras IS NULL OR a.id = ANY(p_amostras)) ORDER BY a.created_at, a.id LOOP
    IF EXISTS (SELECT 1 FROM public.avaliacao_amostras WHERE avaliacao_id = p_avaliacao AND dado_id = s.dado_id) THEN v_dup := v_dup + 1; CONTINUE; END IF;
    INSERT INTO public.avaliacao_amostras(avaliacao_id, dado_id, origem_territorial, selecionada, habilitada_modelo, origem_inclusao,
      importada_de_amostra_id, motivo_inclusao)
    VALUES (p_avaliacao, s.dado_id, public.aval_origem_territorial_padrao(av.municipio_ibge, s.municipio_ibge), s.selecionada, s.habilitada_modelo,
      'IMPORTACAO', s.id, left('Importada da avaliação ' || src.codigo, 500))
    RETURNING id INTO v_id;
    v_ids := v_ids || v_id;
    -- Valores digitados (variáveis manuais) seguem pelo código da variável, quando esta avaliação tem a mesma variável manual.
    IF v_pode_var THEN
      WITH ins AS (
        INSERT INTO public.avaliacao_variavel_valores(avaliacao_id, variavel_id, scope_type, amostra_id, valor, valor_texto, origem)
        SELECT p_avaliacao, tv.id, 'AMOSTRA', v_id, sv.valor, sv.valor_texto, 'IMPORTADO'
          FROM public.avaliacao_variavel_valores sv
          JOIN public.avaliacao_variaveis sva ON sva.id = sv.variavel_id
          JOIN public.avaliacao_variaveis tv ON tv.avaliacao_id = p_avaliacao AND tv.codigo = sva.codigo
         WHERE sv.amostra_id = s.id AND sv.scope_type = 'AMOSTRA'
           AND public.aval_var_fonte(sva.campo_origem, sva.atributo_id) = 'MANUAL' AND public.aval_var_fonte(tv.campo_origem, tv.atributo_id) = 'MANUAL'
        ON CONFLICT DO NOTHING RETURNING 1)
      SELECT v_vars + count(*) INTO v_vars FROM ins;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('importadas', cardinality(v_ids), 'ja_existentes', v_dup, 'valores_variaveis', v_vars,
    'variaveis_sem_permissao', NOT v_pode_var, 'amostras', to_jsonb(v_ids));
END $$;

-- 9) Duplicidade: também por bairro + tipo + área semelhante (sinal de alerta, nunca bloqueio).
DROP FUNCTION IF EXISTS public.aval_find_duplicates(text, text, text, text, numeric, numeric, text, text, numeric, text[], uuid);
CREATE OR REPLACE FUNCTION public.aval_find_duplicates(p_endereco text, p_numero text, p_complemento text, p_municipio_ibge text,
  p_latitude numeric, p_longitude numeric, p_anuncio_url text, p_anuncio_id text, p_area numeric, p_foto_hashes text[] DEFAULT '{}',
  p_exclude uuid DEFAULT NULL, p_bairro text DEFAULT NULL, p_tipo_imovel text DEFAULT NULL)
RETURNS TABLE(imovel_id uuid, pontos int, motivos text[], endereco text, numero text, complemento text, bairro text, area_construida numeric)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH base AS (
    SELECT i.*, l.latitude, l.longitude,
      (public.aval_normalize_text(i.endereco) = public.aval_normalize_text(p_endereco) AND public.aval_normalize_text(p_endereco) <> ''
        AND public.aval_normalize_text(i.numero) = public.aval_normalize_text(p_numero)) AS mesmo_end,
      public.aval_normalize_text(i.complemento) = public.aval_normalize_text(p_complemento) AS mesma_unid,
      (public.aval_normalize_text(p_bairro) <> '' AND public.aval_normalize_text(i.bairro) = public.aval_normalize_text(p_bairro)
        AND public.aval_normalize_text(p_tipo_imovel) <> '' AND public.aval_normalize_text(i.tipo_imovel) = public.aval_normalize_text(p_tipo_imovel)) AS mesmo_bairro_tipo,
      CASE WHEN l.latitude IS NOT NULL AND p_latitude IS NOT NULL THEN
        6371000 * 2 * asin(sqrt(power(sin(radians((l.latitude - p_latitude) / 2)), 2)
          + cos(radians(p_latitude)) * cos(radians(l.latitude)) * power(sin(radians((l.longitude - p_longitude) / 2)), 2))) END AS dist_m
    FROM public.imoveis i LEFT JOIN public.imovel_localizacao l ON l.imovel_id = i.id
    WHERE (p_exclude IS NULL OR i.id <> p_exclude)
      AND (p_municipio_ibge IS NULL OR i.municipio_ibge IS NULL OR i.municipio_ibge = p_municipio_ibge)
  ), scored AS (
    SELECT b.*,
      (COALESCE(p_anuncio_url, '') <> '' AND b.anuncio_url = p_anuncio_url) OR (COALESCE(p_anuncio_id, '') <> '' AND b.anuncio_id = p_anuncio_id) AS mesmo_anuncio,
      COALESCE(array_length(p_foto_hashes, 1), 0) > 0 AND b.foto_hashes && p_foto_hashes AS mesma_foto,
      p_area IS NOT NULL AND b.area_construida IS NOT NULL AND abs(b.area_construida - p_area) <= 0.03 * p_area AS area_sim
    FROM base b
  ), pts AS (
    SELECT s.*, ((CASE WHEN s.mesmo_end AND s.mesma_unid THEN 60 WHEN s.mesmo_end THEN 25 ELSE 0 END)
       + (CASE WHEN s.dist_m IS NOT NULL AND s.dist_m <= 25 THEN 40 ELSE 0 END)
       + (CASE WHEN s.mesmo_anuncio THEN 70 ELSE 0 END) + (CASE WHEN s.mesma_foto THEN 50 ELSE 0 END)
       + (CASE WHEN s.area_sim THEN 10 ELSE 0 END)
       + (CASE WHEN s.mesmo_bairro_tipo AND s.area_sim AND NOT s.mesmo_end THEN 25 ELSE 0 END))::int AS p
    FROM scored s
  )
  SELECT s.id, s.p,
    array_remove(ARRAY[
      CASE WHEN s.mesmo_end AND s.mesma_unid THEN 'Mesmo endereço e mesma unidade/complemento' END,
      CASE WHEN s.mesmo_end AND NOT s.mesma_unid THEN 'Mesmo endereço (unidade diferente ou não informada)' END,
      CASE WHEN s.dist_m IS NOT NULL AND s.dist_m <= 25 THEN 'Coordenadas a ' || round(s.dist_m) || ' m' END,
      CASE WHEN s.mesmo_anuncio THEN 'Mesmo anúncio (URL/ID)' END,
      CASE WHEN s.mesma_foto THEN 'Mesma foto' END,
      CASE WHEN s.mesmo_bairro_tipo AND s.area_sim AND NOT s.mesmo_end THEN 'Mesmo bairro e tipo, com área semelhante' END,
      CASE WHEN s.area_sim THEN 'Área semelhante (sinal auxiliar)' END], NULL) AS motivos,
    s.endereco, s.numero, s.complemento, s.bairro, s.area_construida
  FROM pts s WHERE s.p >= 35
  ORDER BY 2 DESC LIMIT 10
$$;

-- 10) Permissões de execução
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY['public.aval_trg_amostra_snapshot()','public.aval_trg_amostra_audit()','public.aval_trg_amostra_snapshot_imutavel()'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
  FOREACH fn IN ARRAY ARRAY['public.aval_amostra_payload(uuid)','public.aval_amostra_chave(jsonb)','public.aval_origem_territorial_padrao(text, text)',
    'public.aval_banco_base(uuid, jsonb, uuid)','public.aval_banco_buscar(uuid, jsonb, integer, integer)','public.aval_amostras_adicionar(uuid, uuid[])',
    'public.aval_amostras_importar(uuid, uuid, uuid[])',
    'public.aval_find_duplicates(text, text, text, text, numeric, numeric, text, text, numeric, text[], uuid, text, text)',
    'public.aval_guard_live_cadastro()'] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn);
  END LOOP;
END $$;