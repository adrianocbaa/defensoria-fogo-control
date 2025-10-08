-- Create a new function to check if user can edit RDO specifically  
CREATE OR REPLACE FUNCTION public.can_edit_rdo(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.has_role(user_uuid, 'admin'::user_role) 
      OR public.has_role(user_uuid, 'editor'::user_role)
      OR public.has_role(user_uuid, 'gm'::user_role)
      OR public.has_role(user_uuid, 'prestadora'::user_role);
$$;

-- Update RDO tables RLS policies to use the new function
-- rdo_reports
DROP POLICY IF EXISTS "Users with edit permission can delete rdo_reports" ON public.rdo_reports;
DROP POLICY IF EXISTS "Users with edit permission can insert rdo_reports" ON public.rdo_reports;
DROP POLICY IF EXISTS "Users with edit permission can update rdo_reports" ON public.rdo_reports;
DROP POLICY IF EXISTS "Users with edit permission can view rdo_reports" ON public.rdo_reports;

CREATE POLICY "Users with edit permission can view rdo_reports"
ON public.rdo_reports FOR SELECT
USING (can_edit_rdo());

CREATE POLICY "Users with edit permission can insert rdo_reports"
ON public.rdo_reports FOR INSERT
WITH CHECK (can_edit_rdo());

CREATE POLICY "Users with edit permission can update rdo_reports"
ON public.rdo_reports FOR UPDATE
USING (can_edit_rdo());

CREATE POLICY "Users with edit permission can delete rdo_reports"
ON public.rdo_reports FOR DELETE
USING (can_edit_rdo());

-- rdo_activities
DROP POLICY IF EXISTS "Users with edit permission can delete rdo_activities" ON public.rdo_activities;
DROP POLICY IF EXISTS "Users with edit permission can insert rdo_activities" ON public.rdo_activities;
DROP POLICY IF EXISTS "Users with edit permission can update rdo_activities" ON public.rdo_activities;
DROP POLICY IF EXISTS "Users with edit permission can view rdo_activities" ON public.rdo_activities;

CREATE POLICY "Users with edit permission can view rdo_activities"
ON public.rdo_activities FOR SELECT
USING (can_edit_rdo());

CREATE POLICY "Users with edit permission can insert rdo_activities"
ON public.rdo_activities FOR INSERT
WITH CHECK (can_edit_rdo());

CREATE POLICY "Users with edit permission can update rdo_activities"
ON public.rdo_activities FOR UPDATE
USING (can_edit_rdo());

CREATE POLICY "Users with edit permission can delete rdo_activities"
ON public.rdo_activities FOR DELETE
USING (can_edit_rdo());

-- rdo_comments
DROP POLICY IF EXISTS "Users with edit permission can delete rdo_comments" ON public.rdo_comments;
DROP POLICY IF EXISTS "Users with edit permission can insert rdo_comments" ON public.rdo_comments;
DROP POLICY IF EXISTS "Users with edit permission can update rdo_comments" ON public.rdo_comments;
DROP POLICY IF EXISTS "Users with edit permission can view rdo_comments" ON public.rdo_comments;

CREATE POLICY "Users with edit permission can view rdo_comments"
ON public.rdo_comments FOR SELECT
USING (can_edit_rdo());

CREATE POLICY "Users with edit permission can insert rdo_comments"
ON public.rdo_comments FOR INSERT
WITH CHECK (can_edit_rdo());

CREATE POLICY "Users with edit permission can update rdo_comments"
ON public.rdo_comments FOR UPDATE
USING (can_edit_rdo());

CREATE POLICY "Users with edit permission can delete rdo_comments"
ON public.rdo_comments FOR DELETE
USING (can_edit_rdo());

-- rdo_equipment
DROP POLICY IF EXISTS "Users with edit permission can delete rdo_equipment" ON public.rdo_equipment;
DROP POLICY IF EXISTS "Users with edit permission can insert rdo_equipment" ON public.rdo_equipment;
DROP POLICY IF EXISTS "Users with edit permission can update rdo_equipment" ON public.rdo_equipment;
DROP POLICY IF EXISTS "Users with edit permission can view rdo_equipment" ON public.rdo_equipment;

CREATE POLICY "Users with edit permission can view rdo_equipment"
ON public.rdo_equipment FOR SELECT
USING (can_edit_rdo());

CREATE POLICY "Users with edit permission can insert rdo_equipment"
ON public.rdo_equipment FOR INSERT
WITH CHECK (can_edit_rdo());

CREATE POLICY "Users with edit permission can update rdo_equipment"
ON public.rdo_equipment FOR UPDATE
USING (can_edit_rdo());

CREATE POLICY "Users with edit permission can delete rdo_equipment"
ON public.rdo_equipment FOR DELETE
USING (can_edit_rdo());

-- rdo_media
DROP POLICY IF EXISTS "Users with edit permission can delete rdo_media" ON public.rdo_media;
DROP POLICY IF EXISTS "Users with edit permission can insert rdo_media" ON public.rdo_media;
DROP POLICY IF EXISTS "Users with edit permission can update rdo_media" ON public.rdo_media;
DROP POLICY IF EXISTS "Users with edit permission can view rdo_media" ON public.rdo_media;

CREATE POLICY "Users with edit permission can view rdo_media"
ON public.rdo_media FOR SELECT
USING (can_edit_rdo());

CREATE POLICY "Users with edit permission can insert rdo_media"
ON public.rdo_media FOR INSERT
WITH CHECK (can_edit_rdo());

CREATE POLICY "Users with edit permission can update rdo_media"
ON public.rdo_media FOR UPDATE
USING (can_edit_rdo());

CREATE POLICY "Users with edit permission can delete rdo_media"
ON public.rdo_media FOR DELETE
USING (can_edit_rdo());

-- rdo_occurrences
DROP POLICY IF EXISTS "Users with edit permission can delete rdo_occurrences" ON public.rdo_occurrences;
DROP POLICY IF EXISTS "Users with edit permission can insert rdo_occurrences" ON public.rdo_occurrences;
DROP POLICY IF EXISTS "Users with edit permission can update rdo_occurrences" ON public.rdo_occurrences;
DROP POLICY IF EXISTS "Users with edit permission can view rdo_occurrences" ON public.rdo_occurrences;

CREATE POLICY "Users with edit permission can view rdo_occurrences"
ON public.rdo_occurrences FOR SELECT
USING (can_edit_rdo());

CREATE POLICY "Users with edit permission can insert rdo_occurrences"
ON public.rdo_occurrences FOR INSERT
WITH CHECK (can_edit_rdo());

CREATE POLICY "Users with edit permission can update rdo_occurrences"
ON public.rdo_occurrences FOR UPDATE
USING (can_edit_rdo());

CREATE POLICY "Users with edit permission can delete rdo_occurrences"
ON public.rdo_occurrences FOR DELETE
USING (can_edit_rdo());

-- rdo_visits
DROP POLICY IF EXISTS "Users with edit permission can delete rdo_visits" ON public.rdo_visits;
DROP POLICY IF EXISTS "Users with edit permission can insert rdo_visits" ON public.rdo_visits;
DROP POLICY IF EXISTS "Users with edit permission can update rdo_visits" ON public.rdo_visits;
DROP POLICY IF EXISTS "Users with edit permission can view rdo_visits" ON public.rdo_visits;

CREATE POLICY "Users with edit permission can view rdo_visits"
ON public.rdo_visits FOR SELECT
USING (can_edit_rdo());

CREATE POLICY "Users with edit permission can insert rdo_visits"
ON public.rdo_visits FOR INSERT
WITH CHECK (can_edit_rdo());

CREATE POLICY "Users with edit permission can update rdo_visits"
ON public.rdo_visits FOR UPDATE
USING (can_edit_rdo());

CREATE POLICY "Users with edit permission can delete rdo_visits"
ON public.rdo_visits FOR DELETE
USING (can_edit_rdo());

-- rdo_audit_log
DROP POLICY IF EXISTS "Users with edit permission can insert rdo_audit_log" ON public.rdo_audit_log;
DROP POLICY IF EXISTS "Users with edit permission can view rdo_audit_log" ON public.rdo_audit_log;

CREATE POLICY "Users with edit permission can view rdo_audit_log"
ON public.rdo_audit_log FOR SELECT
USING (can_edit_rdo());

CREATE POLICY "Users with edit permission can insert rdo_audit_log"
ON public.rdo_audit_log FOR INSERT
WITH CHECK (can_edit_rdo());