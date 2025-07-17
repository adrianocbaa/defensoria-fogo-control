-- Create hydrants table
CREATE TABLE public.hydrants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nucleus_id UUID NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('verified', 'not_verified')),
  hose_expiration_date DATE,
  has_register BOOLEAN DEFAULT false,
  has_hose BOOLEAN DEFAULT false,
  has_key BOOLEAN DEFAULT false,
  has_coupling BOOLEAN DEFAULT false,
  has_adapter BOOLEAN DEFAULT false,
  has_nozzle BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.hydrants ENABLE ROW LEVEL SECURITY;

-- Create policies for hydrants
CREATE POLICY "Users can view hydrants of their nuclei" 
ON public.hydrants 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM nuclei 
  WHERE nuclei.id = hydrants.nucleus_id 
  AND nuclei.user_id = auth.uid()
));

CREATE POLICY "Users can insert hydrants to their nuclei" 
ON public.hydrants 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM nuclei 
  WHERE nuclei.id = hydrants.nucleus_id 
  AND nuclei.user_id = auth.uid()
));

CREATE POLICY "Users can update hydrants of their nuclei" 
ON public.hydrants 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM nuclei 
  WHERE nuclei.id = hydrants.nucleus_id 
  AND nuclei.user_id = auth.uid()
));

CREATE POLICY "Users can delete hydrants of their nuclei" 
ON public.hydrants 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM nuclei 
  WHERE nuclei.id = hydrants.nucleus_id 
  AND nuclei.user_id = auth.uid()
));

-- Add foreign key constraint
ALTER TABLE public.hydrants 
ADD CONSTRAINT hydrants_nucleus_id_fkey 
FOREIGN KEY (nucleus_id) REFERENCES public.nuclei(id) ON DELETE CASCADE;

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_hydrants_updated_at
BEFORE UPDATE ON public.hydrants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Remove has_hydrant column from nuclei table since we'll manage hydrants separately
ALTER TABLE public.nuclei DROP COLUMN has_hydrant;