-- Add ordem field to orcamento_items table to preserve spreadsheet row order
ALTER TABLE public.orcamento_items 
ADD COLUMN ordem INTEGER DEFAULT 0;