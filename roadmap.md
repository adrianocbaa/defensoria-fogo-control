# Roadmap

- [x] Centralizar no banco a numeração sequencial diária de RDO por obra
- [x] Bloquear saltos, duplicidades e sobrescritas de número
- [x] Preservar sequência em fins de semana e dias sem expediente
- [x] Adequar todos os fluxos de criação do RDO
- [x] Validar banco, tipos e fluxo na interface
- [x] Alinhar os totais da Planilha PDF e do Relatório de Medição aos cartões da tela
- [x] Homologar o Lote 1 (public.profiles) no ambiente isolado — suíte 22/22
- [x] Aplicar e validar o Lote 1 em produção
- [x] Aplicar e validar o Lote 2 em produção
- [x] Concluir o Lote 3 — jobs v2 criados (7 e 8) e funções publicadas; falta confirmar e-mails de RDO após 08:00 UTC e trocar a senha exposta
- [x] Lote 4 — revogar acesso anônimo às 94 tabelas (aplicado); views só leitura (aplicado)
- [x] Lote 4c — reparo do portal público: políticas de leitura anônima por is_demo IS NOT TRUE nas 6 tabelas de dados; indicadores reais validados pelo usuário
- [x] Republicar o SiDIF após o reparo do portal público (usuário publica; confirmado funcionando)
- [x] Decidir se as páginas públicas de Medição e RDO devem mostrar dados a visitantes — DECIDIDO: permanecem fechadas ao público por ora
- [x] Regenerar a service_role (sb_secret) do sidif-homologacao (higiene pós-testes) — concluído 30/09/2026: migrado para chaves novas (sb_publishable/sb_secret) e chaves legacy eyJ... desabilitadas ("Disable JWT-based API keys"); homologação não tem site, segredo SUPABASE_SERVICE_ROLE_KEY é gerenciado pelo Supabase e atualiza sozinho
- [x] Restaurar no topo do resumo público os indicadores de andamento físico, valor pago e tempo restante
- [x] Alinhar os indicadores do resumo público aos registros atuais de RDO e medição das obras exibidas no mapa
- [x] Revisar os 39 alertas restantes: 36 intencionais (portal público, links de manutenção, login, regras de acesso), 1 não movível (pg_net)
- [x] Lote 11 — busca paginada nas consultas financeiras globais (mapa, estatísticas, resumo de medições) para eliminar valores truncados
- [x] Ativar proteção contra senhas vazadas (painel Supabase) — confirmado pelo usuário em 30/09/2026
- [x] Atualizar versão do Postgres — sem atualização disponível (PostgreSQL 17.4, já na versão mais recente; alerta desatualizado)

## SiDIF SaaS (plano aprovado 30/09/2026)
- [ ] Lote 0 — Backup/snapshot e verificação de integridade (contagens, somas)
- [ ] Lote 1 — Catálogo comercial: plans, plan_versions, commercial_modules, module_tiers, addons, price_tables, price_items + seed da tabela de preços atual
- [ ] Lote 2 — Tenancy: organizations, organization_members; órgão atual = org 1; organization_id nas tabelas-raiz
- [ ] Lote 3 — Subscriptions: subscriptions, subscription_items, subscription_history; assinatura da org 1
- [ ] Lote 4 — Entitlements: organization_entitlements, overrides, recálculo, org_can/org_limit
- [ ] Lote 5 — Usage: contadores, triggers de members, job de reconciliação
- [ ] Lote 6 — Propagação de organization_id + RLS por módulo (Obras/Medição → RDO → Manutenção → Preventivos → demais)
- [ ] Lote 7 — Enforcement de módulos e limites no backend
- [ ] Lote 8 — Storage: espelho storage_objects, upload assinado com limite, prefixo por organização
- [ ] Lote 9 — Super Admin: painel, assinatura manual, overrides, histórico
- [ ] Lote 10 — Interface comercial: página de planos, contratação em 4 etapas, trial self-service
- [ ] Lote 11 — Testes ponta a ponta (2 organizações, isolamento, limites) + homologação
- [ ] Decisões pendentes (seção P do plano): usuário único por org, invited conta vaga, bloqueio de estouro de storage, duração do trial, URL do portal por organização, nome commercial_modules
