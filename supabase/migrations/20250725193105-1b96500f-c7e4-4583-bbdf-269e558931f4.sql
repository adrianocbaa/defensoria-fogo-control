-- Temporarily disable audit triggers
DROP TRIGGER IF EXISTS travels_audit_trigger ON travels;

-- Delete all travels
DELETE FROM travels;

-- Re-enable audit trigger
CREATE TRIGGER travels_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON travels
    FOR EACH ROW EXECUTE FUNCTION log_changes();