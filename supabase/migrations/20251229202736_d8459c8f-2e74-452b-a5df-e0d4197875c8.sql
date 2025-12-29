-- Tabela principal de orçamentos
CREATE TABLE public.orcamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  cliente TEXT,
  categoria TEXT,
  data_criacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  prazo_entrega DATE,
  
  -- Configurações de cálculo
  bdi_percentual NUMERIC(10,4) DEFAULT 27.54,
  tipo_encargo TEXT DEFAULT 'desonerado' CHECK (tipo_encargo IN ('onerado', 'desonerado')),
  encargos_sociais_percentual NUMERIC(10,4) DEFAULT 40.00,
  arredondamento TEXT DEFAULT 'truncar_2' CHECK (arredondamento IN ('truncar_2', 'arredondar_2', 'nao_arredondar')),
  bdi_incidencia TEXT DEFAULT 'preco_unitario' CHECK (bdi_incidencia IN ('preco_unitario', 'preco_final')),
  bdi_manual NUMERIC(10,4),
  
  -- Bases de referência (JSON com as bases selecionadas)
  bases_referencia JSONB DEFAULT '[]'::jsonb,
  
  -- Totais calculados
  valor_total_sem_bdi NUMERIC(18,2) DEFAULT 0,
  valor_total_bdi NUMERIC(18,2) DEFAULT 0,
  valor_total NUMERIC(18,2) DEFAULT 0,
  
  -- Status e metadados
  status TEXT DEFAULT 'nao_iniciado' CHECK (status IN ('nao_iniciado', 'em_andamento', 'concluido', 'arquivado')),
  is_licitacao BOOLEAN DEFAULT false,
  tipo_licitacao TEXT,
  data_abertura_licitacao TIMESTAMP WITH TIME ZONE,
  numero_processo_licitacao TEXT,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Itens do orçamento (estrutura hierárquica)
CREATE TABLE public.orcamento_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  orcamento_id UUID NOT NULL REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.orcamento_itens(id) ON DELETE CASCADE,
  
  -- Hierarquia
  nivel INTEGER NOT NULL DEFAULT 1,
  ordem INTEGER NOT NULL DEFAULT 0,
  item_numero TEXT NOT NULL, -- Ex: "1", "1.1", "1.1.1"
  
  -- Tipo do item
  tipo TEXT NOT NULL CHECK (tipo IN ('etapa', 'servico', 'composicao', 'insumo')),
  
  -- Dados do item
  codigo TEXT,
  codigo_base TEXT, -- Código da base de referência (SINAPI, etc)
  fonte TEXT, -- SINAPI, SICRO, Própria, etc
  descricao TEXT NOT NULL,
  unidade TEXT,
  
  -- Quantidades e valores
  quantidade NUMERIC(18,6) DEFAULT 0,
  preco_unitario_base NUMERIC(18,6) DEFAULT 0, -- Preço sem BDI/encargos
  preco_unitario_com_bdi NUMERIC(18,6) DEFAULT 0,
  valor_total NUMERIC(18,2) DEFAULT 0,
  
  -- BDI específico do item (sobrescreve global se definido)
  bdi_personalizado NUMERIC(10,4),
  encargo_personalizado NUMERIC(10,4),
  
  -- Flags
  eh_mao_de_obra BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Base de composições e insumos (biblioteca)
CREATE TABLE public.base_composicoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  unidade TEXT NOT NULL,
  preco_unitario NUMERIC(18,6) NOT NULL DEFAULT 0,
  fonte TEXT NOT NULL DEFAULT 'propria', -- SINAPI, SICRO, Própria
  tipo TEXT NOT NULL CHECK (tipo IN ('composicao', 'insumo', 'mao_de_obra', 'equipamento')),
  estado TEXT DEFAULT 'MT',
  versao TEXT, -- Ex: "11/2025"
  
  -- Composição (se for uma composição, contém os insumos)
  composicao_itens JSONB DEFAULT '[]'::jsonb,
  
  eh_mao_de_obra BOOLEAN DEFAULT false,
  grupo TEXT,
  observacao TEXT,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_orcamentos_status ON public.orcamentos(status);
CREATE INDEX idx_orcamentos_created_by ON public.orcamentos(created_by);
CREATE INDEX idx_orcamento_itens_orcamento_id ON public.orcamento_itens(orcamento_id);
CREATE INDEX idx_orcamento_itens_parent_id ON public.orcamento_itens(parent_id);
CREATE INDEX idx_orcamento_itens_tipo ON public.orcamento_itens(tipo);
CREATE INDEX idx_base_composicoes_codigo ON public.base_composicoes(codigo);
CREATE INDEX idx_base_composicoes_fonte ON public.base_composicoes(fonte);
CREATE INDEX idx_base_composicoes_tipo ON public.base_composicoes(tipo);

-- Enable RLS
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamento_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.base_composicoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para orcamentos
CREATE POLICY "Users can view all orcamentos" 
ON public.orcamentos FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create orcamentos" 
ON public.orcamentos FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update orcamentos" 
ON public.orcamentos FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete orcamentos" 
ON public.orcamentos FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Políticas RLS para orcamento_itens
CREATE POLICY "Users can view all orcamento_itens" 
ON public.orcamento_itens FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create orcamento_itens" 
ON public.orcamento_itens FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update orcamento_itens" 
ON public.orcamento_itens FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete orcamento_itens" 
ON public.orcamento_itens FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Políticas RLS para base_composicoes
CREATE POLICY "Users can view all base_composicoes" 
ON public.base_composicoes FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create base_composicoes" 
ON public.base_composicoes FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update base_composicoes" 
ON public.base_composicoes FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete base_composicoes" 
ON public.base_composicoes FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Trigger para updated_at
CREATE TRIGGER update_orcamentos_updated_at
BEFORE UPDATE ON public.orcamentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orcamento_itens_updated_at
BEFORE UPDATE ON public.orcamento_itens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_base_composicoes_updated_at
BEFORE UPDATE ON public.base_composicoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Sequência para gerar códigos automáticos
CREATE SEQUENCE IF NOT EXISTS orcamento_codigo_seq START 1;

-- Função para gerar código do orçamento
CREATE OR REPLACE FUNCTION public.generate_orcamento_codigo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := LPAD(nextval('orcamento_codigo_seq')::TEXT, 8, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_orcamento_codigo
BEFORE INSERT ON public.orcamentos
FOR EACH ROW
EXECUTE FUNCTION public.generate_orcamento_codigo();