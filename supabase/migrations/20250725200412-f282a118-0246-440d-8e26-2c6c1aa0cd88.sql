-- Create maintenance tickets table
CREATE TABLE public.maintenance_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('Alta', 'Média', 'Baixa')),
  type TEXT NOT NULL,
  location TEXT NOT NULL,
  assignee TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Pendente', 'Em andamento', 'Concluído')),
  observations TEXT[],
  services JSONB,
  request_type TEXT CHECK (request_type IN ('email', 'processo')),
  process_number TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.maintenance_tickets ENABLE ROW LEVEL SECURITY;

-- Create policies for maintenance tickets
CREATE POLICY "All authenticated users can view maintenance tickets" 
ON public.maintenance_tickets 
FOR SELECT 
USING (true);

CREATE POLICY "Users with edit permission can insert maintenance tickets" 
ON public.maintenance_tickets 
FOR INSERT 
WITH CHECK (can_edit());

CREATE POLICY "Users with edit permission can update maintenance tickets" 
ON public.maintenance_tickets 
FOR UPDATE 
USING (can_edit());

CREATE POLICY "Users with edit permission can delete maintenance tickets" 
ON public.maintenance_tickets 
FOR DELETE 
USING (can_edit());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_maintenance_tickets_updated_at
BEFORE UPDATE ON public.maintenance_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create audit log triggers for maintenance tickets
CREATE TRIGGER maintenance_tickets_audit_log
AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_tickets
FOR EACH ROW
EXECUTE FUNCTION public.log_changes();