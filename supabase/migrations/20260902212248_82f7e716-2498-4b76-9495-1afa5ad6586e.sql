-- Mensagens do chat de suporte com IA (uma conversa contínua por usuário)
CREATE TABLE public.suporte_mensagens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role text NOT NULL CHECK (role IN ('user', 'assistant')),
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_suporte_mensagens_user ON public.suporte_mensagens (user_id, created_at);

GRANT SELECT, INSERT, DELETE ON public.suporte_mensagens TO authenticated;
GRANT ALL ON public.suporte_mensagens TO service_role;

ALTER TABLE public.suporte_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios veem suas proprias mensagens de suporte"
    ON public.suporte_mensagens FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Usuarios inserem suas proprias mensagens de suporte"
    ON public.suporte_mensagens FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuarios limpam suas proprias mensagens de suporte"
    ON public.suporte_mensagens FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());