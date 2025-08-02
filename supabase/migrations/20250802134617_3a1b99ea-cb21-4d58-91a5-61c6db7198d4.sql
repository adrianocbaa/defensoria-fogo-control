-- Create enum for unit types
CREATE TYPE unit_type AS ENUM ('KG', 'M', 'LITRO', 'PC', 'CX');

-- Create enum for movement types
CREATE TYPE movement_type AS ENUM ('ENTRADA', 'SAIDA', 'DESCARTE');

-- Create materials table
CREATE TABLE public.materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  unit unit_type NOT NULL,
  current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  minimum_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stock movements table
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  type movement_type NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Create policies for materials
CREATE POLICY "All authenticated users can view materials" 
ON public.materials 
FOR SELECT 
USING (true);

CREATE POLICY "Users with edit permission can insert materials" 
ON public.materials 
FOR INSERT 
WITH CHECK (can_edit());

CREATE POLICY "Users with edit permission can update materials" 
ON public.materials 
FOR UPDATE 
USING (can_edit());

CREATE POLICY "Users with edit permission can delete materials" 
ON public.materials 
FOR DELETE 
USING (can_edit());

-- Create policies for stock movements
CREATE POLICY "All authenticated users can view stock movements" 
ON public.stock_movements 
FOR SELECT 
USING (true);

CREATE POLICY "Users with edit permission can insert stock movements" 
ON public.stock_movements 
FOR INSERT 
WITH CHECK (can_edit());

CREATE POLICY "Users with edit permission can update stock movements" 
ON public.stock_movements 
FOR UPDATE 
USING (can_edit());

CREATE POLICY "Users with edit permission can delete stock movements" 
ON public.stock_movements 
FOR DELETE 
USING (can_edit());

-- Create trigger for updating materials updated_at
CREATE TRIGGER update_materials_updated_at
BEFORE UPDATE ON public.materials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to update stock after movement
CREATE OR REPLACE FUNCTION update_material_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update stock based on movement type
    IF NEW.type = 'ENTRADA' THEN
      UPDATE public.materials 
      SET current_stock = current_stock + NEW.quantity,
          updated_at = now()
      WHERE id = NEW.material_id;
    ELSIF NEW.type IN ('SAIDA', 'DESCARTE') THEN
      UPDATE public.materials 
      SET current_stock = current_stock - NEW.quantity,
          updated_at = now()
      WHERE id = NEW.material_id;
    END IF;
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    -- Reverse the stock movement
    IF OLD.type = 'ENTRADA' THEN
      UPDATE public.materials 
      SET current_stock = current_stock - OLD.quantity,
          updated_at = now()
      WHERE id = OLD.material_id;
    ELSIF OLD.type IN ('SAIDA', 'DESCARTE') THEN
      UPDATE public.materials 
      SET current_stock = current_stock + OLD.quantity,
          updated_at = now()
      WHERE id = OLD.material_id;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stock updates
CREATE TRIGGER trigger_update_material_stock
AFTER INSERT OR DELETE ON public.stock_movements
FOR EACH ROW
EXECUTE FUNCTION update_material_stock();