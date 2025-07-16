-- Create enums for type safety
CREATE TYPE public.extinguisher_type AS ENUM ('H2O', 'PQS', 'CO2', 'ABC');
CREATE TYPE public.extinguisher_status AS ENUM ('valid', 'expired', 'expiring-soon');
CREATE TYPE public.document_type AS ENUM ('project', 'fire-license', 'photos', 'report');

-- Create nuclei table
CREATE TABLE public.nuclei (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  has_hydrant BOOLEAN NOT NULL DEFAULT false,
  coordinates_lat DECIMAL,
  coordinates_lng DECIMAL,
  contact_phone TEXT,
  contact_email TEXT,
  fire_department_license_valid_until DATE,
  fire_department_license_document_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create fire extinguishers table
CREATE TABLE public.fire_extinguishers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nucleus_id UUID NOT NULL REFERENCES public.nuclei(id) ON DELETE CASCADE,
  type extinguisher_type NOT NULL,
  expiration_date DATE NOT NULL,
  location TEXT NOT NULL,
  serial_number TEXT,
  capacity TEXT,
  last_inspection DATE,
  status extinguisher_status NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nucleus_id UUID NOT NULL REFERENCES public.nuclei(id) ON DELETE CASCADE,
  type document_type NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  size BIGINT,
  mime_type TEXT
);

-- Enable Row Level Security
ALTER TABLE public.nuclei ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fire_extinguishers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust later if authentication is needed)
CREATE POLICY "Anyone can view nuclei" ON public.nuclei FOR SELECT USING (true);
CREATE POLICY "Anyone can insert nuclei" ON public.nuclei FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update nuclei" ON public.nuclei FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete nuclei" ON public.nuclei FOR DELETE USING (true);

CREATE POLICY "Anyone can view fire extinguishers" ON public.fire_extinguishers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert fire extinguishers" ON public.fire_extinguishers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update fire extinguishers" ON public.fire_extinguishers FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete fire extinguishers" ON public.fire_extinguishers FOR DELETE USING (true);

CREATE POLICY "Anyone can view documents" ON public.documents FOR SELECT USING (true);
CREATE POLICY "Anyone can insert documents" ON public.documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update documents" ON public.documents FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete documents" ON public.documents FOR DELETE USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_nuclei_updated_at
  BEFORE UPDATE ON public.nuclei
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fire_extinguishers_updated_at
  BEFORE UPDATE ON public.fire_extinguishers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_fire_extinguishers_nucleus_id ON public.fire_extinguishers(nucleus_id);
CREATE INDEX idx_documents_nucleus_id ON public.documents(nucleus_id);
CREATE INDEX idx_fire_extinguishers_status ON public.fire_extinguishers(status);
CREATE INDEX idx_fire_extinguishers_expiration ON public.fire_extinguishers(expiration_date);