-- Desabilitar os triggers de proteção
ALTER TABLE profiles DISABLE TRIGGER prevent_profile_priv_escalation;
ALTER TABLE profiles DISABLE TRIGGER trg_prevent_profile_privilege_escalation;

-- Adicionar setor 'nucleos_central' para usuários admin
UPDATE profiles 
SET sectors = array_append(sectors, 'nucleos_central'::sector_type)
WHERE role = 'admin' 
AND NOT ('nucleos_central'::sector_type = ANY(sectors));

-- Reabilitar os triggers
ALTER TABLE profiles ENABLE TRIGGER prevent_profile_priv_escalation;
ALTER TABLE profiles ENABLE TRIGGER trg_prevent_profile_privilege_escalation;