-- Adicionar todos os núcleos aos módulos teletrabalho e preventivos
-- Primeiro, adicionar todos ao módulo teletrabalho (apenas os que não estão)
INSERT INTO nucleo_module_visibility (nucleo_id, module_key)
SELECT nc.id, 'teletrabalho'
FROM nucleos_central nc
WHERE nc.id NOT IN (
    SELECT nmv.nucleo_id 
    FROM nucleo_module_visibility nmv 
    WHERE nmv.module_key = 'teletrabalho'
);

-- Depois, adicionar todos ao módulo preventivos (apenas os que não estão)
INSERT INTO nucleo_module_visibility (nucleo_id, module_key)
SELECT nc.id, 'preventivos'
FROM nucleos_central nc
WHERE nc.id NOT IN (
    SELECT nmv.nucleo_id 
    FROM nucleo_module_visibility nmv 
    WHERE nmv.module_key = 'preventivos'
);