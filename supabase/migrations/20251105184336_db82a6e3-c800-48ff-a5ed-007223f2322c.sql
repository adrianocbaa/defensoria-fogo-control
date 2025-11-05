-- Tabela para armazenar cronogramas financeiros
CREATE TABLE IF NOT EXISTS public.cronograma_financeiro (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT 'Cronograma Financeiro',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id)
);

-- Tabela para armazenar os itens (macros) do cronograma
CREATE TABLE IF NOT EXISTS public.cronograma_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cronograma_id UUID NOT NULL REFERENCES public.cronograma_financeiro(id) ON DELETE CASCADE,
  item_numero INTEGER NOT NULL,
  descricao TEXT NOT NULL,
  total_etapa DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para armazenar os valores por período
CREATE TABLE IF NOT EXISTS public.cronograma_periodos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL REFERENCES public.cronograma_items(id) ON DELETE CASCADE,
  periodo INTEGER NOT NULL, -- 30, 60, 90, etc.
  valor DECIMAL(15,2) NOT NULL DEFAULT 0,
  percentual DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(item_id, periodo)
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_cronograma_obra ON public.cronograma_financeiro(obra_id);
CREATE INDEX IF NOT EXISTS idx_cronograma_items_cronograma ON public.cronograma_items(cronograma_id);
CREATE INDEX IF NOT EXISTS idx_cronograma_periodos_item ON public.cronograma_periodos(item_id);

-- Enable RLS
ALTER TABLE public.cronograma_financeiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cronograma_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cronograma_periodos ENABLE ROW LEVEL SECURITY;

-- Policies para cronograma_financeiro
CREATE POLICY "Authenticated users can view cronogramas"
  ON public.cronograma_financeiro FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and editors can insert cronogramas"
  ON public.cronograma_financeiro FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit(auth.uid()));

CREATE POLICY "Admins and editors can update cronogramas"
  ON public.cronograma_financeiro FOR UPDATE
  TO authenticated
  USING (public.can_edit(auth.uid()));

CREATE POLICY "Admins can delete cronogramas"
  ON public.cronograma_financeiro FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Policies para cronograma_items
CREATE POLICY "Authenticated users can view cronograma items"
  ON public.cronograma_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and editors can insert cronograma items"
  ON public.cronograma_items FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit(auth.uid()));

CREATE POLICY "Admins and editors can update cronograma items"
  ON public.cronograma_items FOR UPDATE
  TO authenticated
  USING (public.can_edit(auth.uid()));

CREATE POLICY "Admins can delete cronograma items"
  ON public.cronograma_items FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Policies para cronograma_periodos
CREATE POLICY "Authenticated users can view cronograma periodos"
  ON public.cronograma_periodos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and editors can insert cronograma periodos"
  ON public.cronograma_periodos FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit(auth.uid()));

CREATE POLICY "Admins and editors can update cronograma periodos"
  ON public.cronograma_periodos FOR UPDATE
  TO authenticated
  USING (public.can_edit(auth.uid()));

CREATE POLICY "Admins can delete cronograma periodos"
  ON public.cronograma_periodos FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_cronograma_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cronograma_financeiro_updated_at
  BEFORE UPDATE ON public.cronograma_financeiro
  FOR EACH ROW
  EXECUTE FUNCTION update_cronograma_updated_at();