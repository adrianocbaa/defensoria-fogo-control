-- Security hardening migration
-- 1) Prevent profile privilege escalation via trigger
DROP TRIGGER IF EXISTS prevent_profile_priv_escalation ON public.profiles;
CREATE TRIGGER prevent_profile_priv_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 2) Lock down aditivo_sessions (remove overly-permissive authenticated policies)
DROP POLICY IF EXISTS "Authenticated can DELETE aditivo_sessions" ON public.aditivo_sessions;
DROP POLICY IF EXISTS "Authenticated can INSERT aditivo_sessions" ON public.aditivo_sessions;
DROP POLICY IF EXISTS "Authenticated can SELECT aditivo_sessions" ON public.aditivo_sessions;
DROP POLICY IF EXISTS "Authenticated can UPDATE aditivo_sessions" ON public.aditivo_sessions;

-- Ensure SELECT is restricted to editors/admins/GM
DROP POLICY IF EXISTS "Users with edit permission can select aditivo_sessions" ON public.aditivo_sessions;
CREATE POLICY "Users with edit permission can select aditivo_sessions"
ON public.aditivo_sessions
FOR SELECT
USING (public.can_edit());

-- 3) Lock down financial reads to can_edit() only
-- aditivos
DROP POLICY IF EXISTS "Authenticated can SELECT aditivos" ON public.aditivos;
DROP POLICY IF EXISTS "Users with edit permission can select aditivos" ON public.aditivos;
CREATE POLICY "Users with edit permission can select aditivos"
ON public.aditivos
FOR SELECT
USING (public.can_edit());

-- medicoes
DROP POLICY IF EXISTS "Authenticated can SELECT medicoes" ON public.medicoes;
DROP POLICY IF EXISTS "Users with edit permission can select medicoes" ON public.medicoes;
CREATE POLICY "Users with edit permission can select medicoes"
ON public.medicoes
FOR SELECT
USING (public.can_edit());

-- orcamento_items
DROP POLICY IF EXISTS "Authenticated can SELECT orcamento_items" ON public.orcamento_items;
DROP POLICY IF EXISTS "Users with edit permission can select orcamento_items" ON public.orcamento_items;
CREATE POLICY "Users with edit permission can select orcamento_items"
ON public.orcamento_items
FOR SELECT
USING (public.can_edit());

-- medicao_sessions (restrict viewing as well)
DROP POLICY IF EXISTS "All authenticated users can view medicao_sessions" ON public.medicao_sessions;
DROP POLICY IF EXISTS "Users with edit permission can select medicao_sessions" ON public.medicao_sessions;
CREATE POLICY "Users with edit permission can select medicao_sessions"
ON public.medicao_sessions
FOR SELECT
USING (public.can_edit());

-- 4) Remove public exposure of documents metadata
DROP POLICY IF EXISTS "Public can view documents" ON public.documents;

-- 5) Restrict profiles SELECT to authenticated users
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 6) Attach auditing triggers to critical tables
-- Obras
DROP TRIGGER IF EXISTS audit_obras_changes ON public.obras;
CREATE TRIGGER audit_obras_changes
AFTER INSERT OR UPDATE OR DELETE ON public.obras
FOR EACH ROW EXECUTE FUNCTION public.log_changes();

-- Aditivos
DROP TRIGGER IF EXISTS audit_aditivos_changes ON public.aditivos;
CREATE TRIGGER audit_aditivos_changes
AFTER INSERT OR UPDATE OR DELETE ON public.aditivos
FOR EACH ROW EXECUTE FUNCTION public.log_changes();

-- Medicoes
DROP TRIGGER IF EXISTS audit_medicoes_changes ON public.medicoes;
CREATE TRIGGER audit_medicoes_changes
AFTER INSERT OR UPDATE OR DELETE ON public.medicoes
FOR EACH ROW EXECUTE FUNCTION public.log_changes();

-- Orcamento Items
DROP TRIGGER IF EXISTS audit_orcamento_items_changes ON public.orcamento_items;
CREATE TRIGGER audit_orcamento_items_changes
AFTER INSERT OR UPDATE OR DELETE ON public.orcamento_items
FOR EACH ROW EXECUTE FUNCTION public.log_changes();

-- Medicao Items
DROP TRIGGER IF EXISTS audit_medicao_items_changes ON public.medicao_items;
CREATE TRIGGER audit_medicao_items_changes
AFTER INSERT OR UPDATE OR DELETE ON public.medicao_items
FOR EACH ROW EXECUTE FUNCTION public.log_changes();

-- Aditivo Items
DROP TRIGGER IF EXISTS audit_aditivo_items_changes ON public.aditivo_items;
CREATE TRIGGER audit_aditivo_items_changes
AFTER INSERT OR UPDATE OR DELETE ON public.aditivo_items
FOR EACH ROW EXECUTE FUNCTION public.log_changes();

-- Materials
DROP TRIGGER IF EXISTS audit_materials_changes ON public.materials;
CREATE TRIGGER audit_materials_changes
AFTER INSERT OR UPDATE OR DELETE ON public.materials
FOR EACH ROW EXECUTE FUNCTION public.log_changes();

-- Stock Movements
DROP TRIGGER IF EXISTS audit_stock_movements_changes ON public.stock_movements;
CREATE TRIGGER audit_stock_movements_changes
AFTER INSERT OR UPDATE OR DELETE ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.log_changes();

-- Maintenance Tickets
DROP TRIGGER IF EXISTS audit_maintenance_tickets_changes ON public.maintenance_tickets;
CREATE TRIGGER audit_maintenance_tickets_changes
AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_tickets
FOR EACH ROW EXECUTE FUNCTION public.log_changes();

-- Nuclei
DROP TRIGGER IF EXISTS audit_nuclei_changes ON public.nuclei;
CREATE TRIGGER audit_nuclei_changes
AFTER INSERT OR UPDATE OR DELETE ON public.nuclei
FOR EACH ROW EXECUTE FUNCTION public.log_changes();

-- Hydrants
DROP TRIGGER IF EXISTS audit_hydrants_changes ON public.hydrants;
CREATE TRIGGER audit_hydrants_changes
AFTER INSERT OR UPDATE OR DELETE ON public.hydrants
FOR EACH ROW EXECUTE FUNCTION public.log_changes();

-- Fire Extinguishers
DROP TRIGGER IF EXISTS audit_fire_extinguishers_changes ON public.fire_extinguishers;
CREATE TRIGGER audit_fire_extinguishers_changes
AFTER INSERT OR UPDATE OR DELETE ON public.fire_extinguishers
FOR EACH ROW EXECUTE FUNCTION public.log_changes();

-- Travels
DROP TRIGGER IF EXISTS audit_travels_changes ON public.travels;
CREATE TRIGGER audit_travels_changes
AFTER INSERT OR UPDATE OR DELETE ON public.travels
FOR EACH ROW EXECUTE FUNCTION public.log_changes();

-- Documents metadata
DROP TRIGGER IF EXISTS audit_documents_changes ON public.documents;
CREATE TRIGGER audit_documents_changes
AFTER INSERT OR UPDATE OR DELETE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.log_changes();

-- 7) Keep updated_at in sync on updates (only for tables that have updated_at column)
-- Obras
DROP TRIGGER IF EXISTS update_obras_updated_at ON public.obras;
CREATE TRIGGER update_obras_updated_at
BEFORE UPDATE ON public.obras
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Aditivos
DROP TRIGGER IF EXISTS update_aditivos_updated_at ON public.aditivos;
CREATE TRIGGER update_aditivos_updated_at
BEFORE UPDATE ON public.aditivos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Medicoes
DROP TRIGGER IF EXISTS update_medicoes_updated_at ON public.medicoes;
CREATE TRIGGER update_medicoes_updated_at
BEFORE UPDATE ON public.medicoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Orcamento Items
DROP TRIGGER IF EXISTS update_orcamento_items_updated_at ON public.orcamento_items;
CREATE TRIGGER update_orcamento_items_updated_at
BEFORE UPDATE ON public.orcamento_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Medicao Items
DROP TRIGGER IF EXISTS update_medicao_items_updated_at ON public.medicao_items;
CREATE TRIGGER update_medicao_items_updated_at
BEFORE UPDATE ON public.medicao_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Aditivo Items
DROP TRIGGER IF EXISTS update_aditivo_items_updated_at ON public.aditivo_items;
CREATE TRIGGER update_aditivo_items_updated_at
BEFORE UPDATE ON public.aditivo_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Materials
DROP TRIGGER IF EXISTS update_materials_updated_at ON public.materials;
CREATE TRIGGER update_materials_updated_at
BEFORE UPDATE ON public.materials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Stock Movements
DROP TRIGGER IF EXISTS update_stock_movements_updated_at ON public.stock_movements;
CREATE TRIGGER update_stock_movements_updated_at
BEFORE UPDATE ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Maintenance Tickets
DROP TRIGGER IF EXISTS update_maintenance_tickets_updated_at ON public.maintenance_tickets;
CREATE TRIGGER update_maintenance_tickets_updated_at
BEFORE UPDATE ON public.maintenance_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Nuclei
DROP TRIGGER IF EXISTS update_nuclei_updated_at ON public.nuclei;
CREATE TRIGGER update_nuclei_updated_at
BEFORE UPDATE ON public.nuclei
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Hydrants
DROP TRIGGER IF EXISTS update_hydrants_updated_at ON public.hydrants;
CREATE TRIGGER update_hydrants_updated_at
BEFORE UPDATE ON public.hydrants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fire Extinguishers
DROP TRIGGER IF EXISTS update_fire_extinguishers_updated_at ON public.fire_extinguishers;
CREATE TRIGGER update_fire_extinguishers_updated_at
BEFORE UPDATE ON public.fire_extinguishers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Travels
DROP TRIGGER IF EXISTS update_travels_updated_at ON public.travels;
CREATE TRIGGER update_travels_updated_at
BEFORE UPDATE ON public.travels
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8) Enforce business rule: block changes to aditivo_items when session is not 'aberta'
DROP TRIGGER IF EXISTS prevent_changes_aditivo_items ON public.aditivo_items;
CREATE TRIGGER prevent_changes_aditivo_items
BEFORE INSERT OR UPDATE OR DELETE ON public.aditivo_items
FOR EACH ROW EXECUTE FUNCTION public.prevent_changes_on_blocked_aditivo_items();
