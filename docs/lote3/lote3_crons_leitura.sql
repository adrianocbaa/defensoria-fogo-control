-- Lote 3 — LEITURA SOMENTE. Rode no SQL Editor do projeto de PRODUÇÃO.
-- Objetivo: listar os agendamentos automáticos (cron jobs) existentes,
-- para confirmarmos os nomes exatos antes de atualizá-los.
-- Não altera nada.

SELECT jobid, jobname, schedule, command, active
FROM cron.job
ORDER BY jobname;
