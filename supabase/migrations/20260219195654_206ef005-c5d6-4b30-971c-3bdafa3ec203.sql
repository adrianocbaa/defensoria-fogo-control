
-- ============================================
-- LIMPEZA: Remover módulo de avaliação de imóveis (já descontinuado)
-- ============================================

-- 1. Remover policies da tabela public.properties
DROP POLICY IF EXISTS "Authenticated users can view properties" ON public.properties;
DROP POLICY IF EXISTS "Authenticated users can insert properties" ON public.properties;
DROP POLICY IF EXISTS "Authenticated users can update properties" ON public.properties;
DROP POLICY IF EXISTS "Authenticated users can delete properties" ON public.properties;

-- 2. Remover tabela public.properties
DROP TABLE IF EXISTS public.properties;

-- 3. Remover funções RPC do schema public (appraisal)
DROP FUNCTION IF EXISTS public.get_projects();
DROP FUNCTION IF EXISTS public.get_project_by_id(uuid);
DROP FUNCTION IF EXISTS public.create_project(text, date, text, uuid);
DROP FUNCTION IF EXISTS public.update_project(uuid, text, date, text, text);
DROP FUNCTION IF EXISTS public.delete_project(uuid);
DROP FUNCTION IF EXISTS public.get_properties();
DROP FUNCTION IF EXISTS public.create_property(text, text, double precision, double precision, numeric, numeric, text, numeric, text, text, text);
DROP FUNCTION IF EXISTS public.update_property(uuid, text, text, numeric, numeric, numeric, numeric, text, integer, text, text, text);
DROP FUNCTION IF EXISTS public.get_comparables();
DROP FUNCTION IF EXISTS public.create_comparable(text, text, date, text, numeric, numeric, numeric, numeric, text, numeric, text, double precision, double precision, text);
DROP FUNCTION IF EXISTS public.create_attachment(text, uuid, text, text, jsonb);
DROP FUNCTION IF EXISTS public.get_project_reports(uuid);
DROP FUNCTION IF EXISTS public.create_report(uuid, text, text);

-- 4. Remover todas as tabelas do schema appraisal (em ordem de dependência)
DROP TABLE IF EXISTS appraisal.samples CASCADE;
DROP TABLE IF EXISTS appraisal.results CASCADE;
DROP TABLE IF EXISTS appraisal.model_runs CASCADE;
DROP TABLE IF EXISTS appraisal.reports CASCADE;
DROP TABLE IF EXISTS appraisal.attachments CASCADE;
DROP TABLE IF EXISTS appraisal.rural_specs CASCADE;
DROP TABLE IF EXISTS appraisal.improvements CASCADE;
DROP TABLE IF EXISTS appraisal.comparables CASCADE;
DROP TABLE IF EXISTS appraisal.projects CASCADE;
DROP TABLE IF EXISTS appraisal.properties CASCADE;

-- 5. Remover o schema appraisal se estiver vazio
DROP SCHEMA IF EXISTS appraisal CASCADE;
