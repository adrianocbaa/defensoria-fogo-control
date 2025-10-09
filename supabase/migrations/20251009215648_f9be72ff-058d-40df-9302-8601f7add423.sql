-- Enable public viewing of RDO reports for public obras
CREATE POLICY "Public can view rdo_reports of public obras"
ON public.rdo_reports
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM obras
    WHERE obras.id = rdo_reports.obra_id
    AND obras.is_public = true
  )
);

-- Enable public viewing of RDO activities for public obras
CREATE POLICY "Public can view rdo_activities of public obras"
ON public.rdo_activities
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM obras
    WHERE obras.id = rdo_activities.obra_id
    AND obras.is_public = true
  )
);

-- Enable public viewing of RDO equipment for public obras
CREATE POLICY "Public can view rdo_equipment of public obras"
ON public.rdo_equipment
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM obras
    WHERE obras.id = rdo_equipment.obra_id
    AND obras.is_public = true
  )
);

-- Enable public viewing of RDO media for public obras
CREATE POLICY "Public can view rdo_media of public obras"
ON public.rdo_media
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM obras
    WHERE obras.id = rdo_media.obra_id
    AND obras.is_public = true
  )
);

-- Enable public viewing of RDO occurrences for public obras
CREATE POLICY "Public can view rdo_occurrences of public obras"
ON public.rdo_occurrences
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM obras
    WHERE obras.id = rdo_occurrences.obra_id
    AND obras.is_public = true
  )
);

-- Enable public viewing of RDO comments for public obras
CREATE POLICY "Public can view rdo_comments of public obras"
ON public.rdo_comments
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM obras
    WHERE obras.id = rdo_comments.obra_id
    AND obras.is_public = true
  )
);

-- Enable public viewing of RDO audit log for public obras
CREATE POLICY "Public can view rdo_audit_log of public obras"
ON public.rdo_audit_log
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM obras
    WHERE obras.id = rdo_audit_log.obra_id
    AND obras.is_public = true
  )
);