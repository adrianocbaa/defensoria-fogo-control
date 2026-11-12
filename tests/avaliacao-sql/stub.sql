-- Base mínima do Supabase/SiDIF para testar as migrations do módulo Avaliações localmente (sem dados reais).
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth; CREATE SCHEMA extensions; CREATE SCHEMA storage;
GRANT USAGE ON SCHEMA public, auth, storage, extensions TO anon, authenticated, service_role;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE EXTENSION unaccent SCHEMA extensions;
CREATE TYPE public.user_role AS ENUM ('admin','editor','viewer','manutencao','gm','prestadora','contratada','demo','super_admin');
CREATE TYPE public.sector_type AS ENUM ('obras');
CREATE TABLE public.organizations (id uuid PRIMARY KEY, name text, slug text);
CREATE TABLE public.profiles (user_id uuid PRIMARY KEY, display_name text, email text, position text, is_active boolean DEFAULT true, sectors public.sector_type[]);
CREATE TABLE public.organization_members (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid REFERENCES public.organizations(id), user_id uuid, status text DEFAULT 'active');
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, role public.user_role);
CREATE FUNCTION public.has_role(_user_id uuid, _role public.user_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
CREATE FUNCTION public.user_organization_id(_user_id uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT organization_id FROM public.organization_members WHERE user_id = _user_id AND status = 'active' LIMIT 1 $$;
CREATE FUNCTION public.unaccent(text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT extensions.unaccent($1) $$;
CREATE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean DEFAULT false);
CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text REFERENCES storage.buckets(id), name text, owner uuid, metadata jsonb, created_at timestamptz DEFAULT now(), UNIQUE (bucket_id, name));
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated, service_role;
GRANT SELECT ON public.organizations, public.profiles, public.organization_members, public.user_roles TO authenticated;
