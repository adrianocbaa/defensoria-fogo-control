
-- Deletar registro de notificação de hoje para permitir novo teste
DELETE FROM rdo_notificacoes_enviadas 
WHERE obra_id = '9e5b55bc-df14-4708-838f-cef1777fc8ee'
AND data_referencia = '2026-01-05';
