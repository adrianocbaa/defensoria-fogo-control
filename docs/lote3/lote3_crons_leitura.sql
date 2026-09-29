-- Lote 3 — LEITURA SOMENTE. Rode no SQL Editor do projeto de PRODUÇÃO.
-- Objetivo: listar os agendamentos automáticos (cron jobs) existentes,
-- seus proprietários e o usuário da sessão, para confirmarmos quem pode
-- atualizá-los antes de qualquer alteração.
-- Não altera nada.

SELECT
  jobid,
  jobname,
  schedule,
  active,
  username AS proprietario,
  current_user AS usuario_atual,
  session_user AS usuario_sessao,
  command
FROM cron.job
ORDER BY jobname;
