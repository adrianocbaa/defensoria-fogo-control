-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Profiles are viewable by everyone" 
  ON public.profiles 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Add trigger for timestamps
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (new.id, new.raw_user_meta_data->>'display_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policies for nuclei to be user-specific
DROP POLICY IF EXISTS "Anyone can view nuclei" ON public.nuclei;
DROP POLICY IF EXISTS "Anyone can insert nuclei" ON public.nuclei;
DROP POLICY IF EXISTS "Anyone can update nuclei" ON public.nuclei;
DROP POLICY IF EXISTS "Anyone can delete nuclei" ON public.nuclei;

-- Add user_id column to nuclei
ALTER TABLE public.nuclei ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create new user-specific policies for nuclei
CREATE POLICY "Users can view their own nuclei" 
  ON public.nuclei 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own nuclei" 
  ON public.nuclei 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nuclei" 
  ON public.nuclei 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own nuclei" 
  ON public.nuclei 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Update policies for fire extinguishers (through nuclei relationship)
DROP POLICY IF EXISTS "Anyone can view fire extinguishers" ON public.fire_extinguishers;
DROP POLICY IF EXISTS "Anyone can insert fire extinguishers" ON public.fire_extinguishers;
DROP POLICY IF EXISTS "Anyone can update fire extinguishers" ON public.fire_extinguishers;
DROP POLICY IF EXISTS "Anyone can delete fire extinguishers" ON public.fire_extinguishers;

CREATE POLICY "Users can view fire extinguishers of their nuclei" 
  ON public.fire_extinguishers 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.nuclei 
    WHERE nuclei.id = fire_extinguishers.nucleus_id 
    AND nuclei.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert fire extinguishers to their nuclei" 
  ON public.fire_extinguishers 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.nuclei 
    WHERE nuclei.id = fire_extinguishers.nucleus_id 
    AND nuclei.user_id = auth.uid()
  ));

CREATE POLICY "Users can update fire extinguishers of their nuclei" 
  ON public.fire_extinguishers 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.nuclei 
    WHERE nuclei.id = fire_extinguishers.nucleus_id 
    AND nuclei.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete fire extinguishers of their nuclei" 
  ON public.fire_extinguishers 
  FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.nuclei 
    WHERE nuclei.id = fire_extinguishers.nucleus_id 
    AND nuclei.user_id = auth.uid()
  ));

-- Update policies for documents (through nuclei relationship)
DROP POLICY IF EXISTS "Anyone can view documents" ON public.documents;
DROP POLICY IF EXISTS "Anyone can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Anyone can update documents" ON public.documents;
DROP POLICY IF EXISTS "Anyone can delete documents" ON public.documents;

CREATE POLICY "Users can view documents of their nuclei" 
  ON public.documents 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.nuclei 
    WHERE nuclei.id = documents.nucleus_id 
    AND nuclei.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert documents to their nuclei" 
  ON public.documents 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.nuclei 
    WHERE nuclei.id = documents.nucleus_id 
    AND nuclei.user_id = auth.uid()
  ));

CREATE POLICY "Users can update documents of their nuclei" 
  ON public.documents 
  FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM public.nuclei 
    WHERE nuclei.id = documents.nucleus_id 
    AND nuclei.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete documents of their nuclei" 
  ON public.documents 
  FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.nuclei 
    WHERE nuclei.id = documents.nucleus_id 
    AND nuclei.user_id = auth.uid()
  ));