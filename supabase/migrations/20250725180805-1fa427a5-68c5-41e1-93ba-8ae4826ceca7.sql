-- Create travels table for trip planning
CREATE TABLE public.travels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servidor TEXT NOT NULL,
  destino TEXT NOT NULL,
  data_ida DATE NOT NULL,
  data_volta DATE NOT NULL,
  motivo TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.travels ENABLE ROW LEVEL SECURITY;

-- Create policies for travels
CREATE POLICY "All authenticated users can view travels" 
ON public.travels 
FOR SELECT 
USING (true);

CREATE POLICY "Users with edit permission can insert travels" 
ON public.travels 
FOR INSERT 
WITH CHECK (can_edit());

CREATE POLICY "Users with edit permission can update travels" 
ON public.travels 
FOR UPDATE 
USING (can_edit());

CREATE POLICY "Users with edit permission can delete travels" 
ON public.travels 
FOR DELETE 
USING (can_edit());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_travels_updated_at
BEFORE UPDATE ON public.travels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create audit trigger for travels
CREATE TRIGGER travels_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.travels
FOR EACH ROW
EXECUTE FUNCTION public.log_changes();