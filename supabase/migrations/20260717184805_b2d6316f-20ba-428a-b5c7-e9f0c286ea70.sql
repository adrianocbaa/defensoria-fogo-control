
CREATE TABLE public.obra_arts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  aditivo_session_id UUID REFERENCES public.aditivo_sessions(id) ON DELETE CASCADE,
  numero_art TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'execucao',
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX obra_arts_obra_id_idx ON public.obra_arts(obra_id);
CREATE INDEX obra_arts_aditivo_session_id_idx ON public.obra_arts(aditivo_session_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.obra_arts TO authenticated;
GRANT ALL ON public.obra_arts TO service_role;

ALTER TABLE public.obra_arts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visualizar ARTs de obras acessíveis"
  ON public.obra_arts FOR SELECT
  TO authenticated
  USING (public.user_has_obra_access(auth.uid(), obra_id));

CREATE POLICY "Gerenciar ARTs em obras editáveis"
  ON public.obra_arts FOR ALL
  TO authenticated
  USING (public.can_edit_obra(obra_id, auth.uid()))
  WITH CHECK (public.can_edit_obra(obra_id, auth.uid()));

CREATE TRIGGER update_obra_arts_updated_at
  BEFORE UPDATE ON public.obra_arts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migrar ART principal da obra (contrato inicial)
INSERT INTO public.obra_arts (obra_id, aditivo_session_id, numero_art, tipo, ordem)
SELECT id, NULL, numero_art_execucao, 'execucao', 0
FROM public.obras
WHERE numero_art_execucao IS NOT NULL AND btrim(numero_art_execucao) <> '';

-- Migrar ART de cada aditivo
INSERT INTO public.obra_arts (obra_id, aditivo_session_id, numero_art, tipo, ordem)
SELECT obra_id, id, numero_art,
  CASE
    WHEN lower(coalesce(tipo_aditivo,'')) LIKE '%prazo%' AND (lower(tipo_aditivo) LIKE '%valor%' OR lower(tipo_aditivo) LIKE '%quantitativo%') THEN 'prazo_valor'
    WHEN lower(coalesce(tipo_aditivo,'')) LIKE '%prazo%' THEN 'prazo'
    WHEN lower(coalesce(tipo_aditivo,'')) LIKE '%supress%' THEN 'supressao'
    ELSE 'valor'
  END,
  0
FROM public.aditivo_sessions
WHERE numero_art IS NOT NULL AND btrim(numero_art) <> '';
