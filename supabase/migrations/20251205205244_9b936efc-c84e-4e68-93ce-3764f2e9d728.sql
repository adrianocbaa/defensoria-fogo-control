-- Tabela de ATAs (Ata de Registro de Preços)
CREATE TABLE public.atas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_ata TEXT NOT NULL,
  pregao_eletronico TEXT,
  protocolo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Tabela de Polos de ATA (cada polo pode ter uma empresa diferente)
CREATE TABLE public.ata_polos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ata_id UUID NOT NULL REFERENCES public.atas(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES public.empresas(id),
  polo TEXT NOT NULL,
  regiao TEXT,
  valor NUMERIC NOT NULL DEFAULT 0,
  desconto NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Contratos de Licitação (CL)
CREATE TABLE public.contratos_licitacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_contrato TEXT NOT NULL,
  pregao_eletronico TEXT,
  protocolo TEXT,
  empresa_id UUID REFERENCES public.empresas(id),
  valor NUMERIC NOT NULL DEFAULT 0,
  desconto NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.atas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ata_polos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos_licitacao ENABLE ROW LEVEL SECURITY;

-- RLS Policies for atas
CREATE POLICY "Users with edit permission can view atas" ON public.atas FOR SELECT USING (can_edit());
CREATE POLICY "Users with edit permission can insert atas" ON public.atas FOR INSERT WITH CHECK (can_edit());
CREATE POLICY "Users with edit permission can update atas" ON public.atas FOR UPDATE USING (can_edit());
CREATE POLICY "Admins can delete atas" ON public.atas FOR DELETE USING (is_admin());

-- RLS Policies for ata_polos
CREATE POLICY "Users with edit permission can view ata_polos" ON public.ata_polos FOR SELECT USING (can_edit());
CREATE POLICY "Users with edit permission can insert ata_polos" ON public.ata_polos FOR INSERT WITH CHECK (can_edit());
CREATE POLICY "Users with edit permission can update ata_polos" ON public.ata_polos FOR UPDATE USING (can_edit());
CREATE POLICY "Admins can delete ata_polos" ON public.ata_polos FOR DELETE USING (is_admin());

-- RLS Policies for contratos_licitacao
CREATE POLICY "Users with edit permission can view contratos_licitacao" ON public.contratos_licitacao FOR SELECT USING (can_edit());
CREATE POLICY "Users with edit permission can insert contratos_licitacao" ON public.contratos_licitacao FOR INSERT WITH CHECK (can_edit());
CREATE POLICY "Users with edit permission can update contratos_licitacao" ON public.contratos_licitacao FOR UPDATE USING (can_edit());
CREATE POLICY "Admins can delete contratos_licitacao" ON public.contratos_licitacao FOR DELETE USING (is_admin());

-- Indexes
CREATE INDEX idx_ata_polos_ata_id ON public.ata_polos(ata_id);
CREATE INDEX idx_ata_polos_empresa_id ON public.ata_polos(empresa_id);
CREATE INDEX idx_contratos_licitacao_empresa_id ON public.contratos_licitacao(empresa_id);