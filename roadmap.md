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
- [x] Lote 0 — Verificação de integridade (baseline 30/09/2026): obras 24, profiles 38, user_roles 37, medicao_sessions 52, medicao_items 2189, rdo_reports 515, maintenance_tickets 132, nuclei 12, orcamento_items 4950, aditivo_items 330; backup nativo diário do Supabase já ativo
- [x] Lote 1 — Catálogo comercial criado e semeado (4 planos, 4 versões, 3 módulos, 4 níveis, 4 extras, tabela 2026 ativa, 24 preços); validado: Equipe + Gestão Completa + Manutenção + 250 GB = R$ 4.869,00
- [x] Lote 2 — Tenancy: org 1 (DPE-MT, slug dpe-mt) criada; 38 membros (34 internos, 4 externos); organization_id em obras (24), nuclei, maintenance_tickets; novos perfis entram na org 1
- [x] Lote 3 — Subscriptions criadas; org 1 = Institucional + Obras Gestão Completa + Manutenção + Preventivos, contrato, ativa, R$ 7.760,00/mês (ajustável); histórico automático validado
- [x] Lote 4 — Entitlements, overrides, recálculo automático, org_can/org_limit; DPE-MT gratuita (R$ 0) e ilimitada via overrides
- [x] Lote 5 — Contadores de uso (org 1: 34 internos, 4 externos, ~5 GB); recontagem por trigger; conferência noturna agendada (job 9, 03:00 UTC)
- [ ] Lote 6 — Propagação de organization_id + RLS por módulo (Obras/Medição → RDO → Manutenção → Preventivos → demais)
  - [x] 6a Obras/Medição — 18 regras restritivas "org_isolation" (validado em tela pelo usuário)
  - [x] 6b RDO — organization_id nas 5 tabelas (515 reports, 46k atividades, ocorrências, comentários, mídias), preenchimento automático por gatilho, 20 regras por órgão; gatilhos de validação desligados e religados durante o backfill · [x] 6c Manutenção — organization_id nas 5 tabelas filhas (221 serviços, 9 impedimentos, 315 históricos, 158 e-mails, 128 fila), herança automática do chamado por gatilho, 6 regras org_isolation restritivas; maintenance_types/managers seguem globais · [x] 6d Preventivos/Núcleos — organization_id em 9 tabelas (nucleos_central 95, teletrabalho 119, visibilidade 107, extintores 36, hidrantes 1, viagens 30, atas 4, polos 10, dpg 1), herança automática por gatilho, 10 regras org_isolation; backfill de filhas corrigido após ordem de preenchimento · [x] 6e1 Recebimento (9 tabelas, 3.4k registros) · [x] 6e2 Entrega (14 tabelas) · [x] 6e3 Checklist+Documentos+Biblioteca+Dimensionamento (10 tabelas, ~2k registros) — todos com organization_id preenchido, herança automática por gatilho e regras org_isolation restritivas · [x] 6e4 Orçamentos/Empresas/Estoque/Plano de Expansão/Config (11 tabelas; catálogo e intensidades seguem globais) — Lote 6 concluído
- [x] Lote 7 — Enforcement de módulos e limites no backend (criação exige módulo contratado em obras/RDO/manutenção/preventivos; limite de usuários internos/externos por gatilho; limite de armazenamento fica no Lote 8)
- [x] Lote 8 — Storage: [x] 8a limite de armazenamento no envio de arquivos (aplicado 01/10/2026, validado em tela) · [ ] 8b pastas por órgão nos arquivos (adiado: só necessário quando entrar o 2º órgão; mexe em caminhos de ~5 GB de arquivos)
- [x] Lote 9 — Super Admin: papel super_admin (Adriano), funções super_admin_* (criar órgão/assinatura, status, preço de item, overrides), painel /super-admin (lista de órgãos, resumo, itens, exceções, histórico) — validado em tela 01/10/2026
- [ ] Lote 10 — Interface comercial: página de planos, contratação em 4 etapas, trial self-service
- [ ] Lote 11 — Testes ponta a ponta (2 organizações, isolamento, limites) + homologação
- [ ] Decisões pendentes (seção P do plano): usuário único por org, invited conta vaga, bloqueio de estouro de storage, duração do trial, URL do portal por organização, nome commercial_modules
