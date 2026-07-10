CREATE TABLE public.user_saved_filters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT user_saved_filters_name_not_blank CHECK (length(btrim(name)) > 0),
  CONSTRAINT user_saved_filters_name_length CHECK (length(name) <= 80),
  UNIQUE (user_id, scope, name)
);

CREATE INDEX user_saved_filters_user_scope_idx ON public.user_saved_filters (user_id, scope);
CREATE UNIQUE INDEX user_saved_filters_one_default ON public.user_saved_filters (user_id, scope) WHERE is_default = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_saved_filters TO authenticated;
GRANT ALL ON public.user_saved_filters TO service_role;

ALTER TABLE public.user_saved_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own saved filters" ON public.user_saved_filters FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own saved filters" ON public.user_saved_filters FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own saved filters" ON public.user_saved_filters FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own saved filters" ON public.user_saved_filters FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_user_saved_filters_updated_at
  BEFORE UPDATE ON public.user_saved_filters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();