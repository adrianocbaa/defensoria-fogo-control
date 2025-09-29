-- Create password_resets table for custom password recovery
CREATE TABLE IF NOT EXISTS public.password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX idx_password_resets_code ON public.password_resets(code) WHERE used = false;
CREATE INDEX idx_password_resets_expires ON public.password_resets(expires_at) WHERE used = false;

-- RLS Policies
CREATE POLICY "Users can insert their own reset requests"
  ON public.password_resets
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update reset records"
  ON public.password_resets
  FOR UPDATE
  USING (true);

CREATE POLICY "System can select reset records"
  ON public.password_resets
  FOR SELECT
  USING (true);

-- Function to cleanup expired codes
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_codes()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.password_resets 
  WHERE expires_at < now() OR used = true;
$$;