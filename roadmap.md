# Roadmap

## Módulo Avaliações V1 (11/11/2026)
- [x] Motor estatístico (OLS, transformações, IC, precisão) + validador 13 critérios — 11 testes passaram
- [x] Banco: tabelas, regras por órgão/papel, numeração, aceite, resultado, laudo, invalidação, pendências; reforço de segurança aplicado
- [x] Função do servidor avaliacao-engine publicada (recusa chamadas sem login)
- [x] Telas: lista, nova, área de trabalho (Resumo, 7 blocos, Documentos, Histórico) — compila; frontend aguarda Publish → Update
- [x] Laudo: seções, dados protegidos, verificação, emissão imutável, revisão, PDF rascunho/emitido
- [ ] Teste completo logado (criar → laudo emitido) — bloqueado: login de teste indisponível no Supabase externo; pede validação do usuário em órgão de homologação
- [ ] Sugestões de texto por IA no laudo — feito na Rodada 2 (ver abaixo)

## Avaliações — Rodada 2 (12/11/2026)
- [x] Normalidade 68/90/95, fundamentação por itens (resumo + itens), Cook com limite interno configurável, micronumerosidade categórica
- [x] Tabelas estatísticas derivadas da mesma saída do motor (imutáveis); Exploração ampla; limites de candidatos por organização (servidor também valida)
- [x] IA no laudo (gerar/melhorar/contexto/restaurar/aprovar), PDF e DOCX oficiais congelados com SHA-256; telas Validação/Resultado/Laudo/Modelagem
- [x] 111 testes JS + 64 verificações SQL passaram; compila; somente avaliacao-engine atualizada; frontend aguarda Publish → Update
- [ ] Confirmar com o RT a edição vigente da NBR 14653-2 usada na política de fundamentação (hoje: 2011, itens 1 e 3 exigem grau manual)
- [ ] Teste logado ponta a ponta — bloqueado: login de teste indisponível no Supabase externo e não há avaliações cadastradas
- [x] Homologação numérica Guarantã do Norte — motor 1.1.1 (R estimativa por 1−SSE/SST na escala original; resíduo relativo na escala transformada); 124 verificações de paridade SisDEA passaram; avaliacao-engine atualizada
- [x] Homologação numérica Aripuanã (65/65) e São Félix do Araguaia (88/88) — motor 1.1.1 sem alteração de fórmula; três casos reais concluídos
- [x] Edição completa de dados (valor administrativo, imóvel avaliando com localização, amostra com fonte) — um resumo de impacto por salvamento, maior nível, antes/depois no histórico, valor unitário recalculado, opção de imóvel separado para amostra; 122 testes JS + 101 verificações SQL; banco atualizado; motor e avaliacao-engine intocados; frontend aguarda Publish → Update
- [ ] Conferir na tela a edição dos três pontos com usuário logado — bloqueado: login de teste indisponível no Supabase externo
- [x] Variáveis antes da coleta — etapa Variáveis (catálogo), campos dinâmicos no avaliando e nas amostras, completude, bloqueio no congelamento, Modelagem sem redigitação
- [ ] Conferir na tela a etapa Variáveis e os campos dinâmicos com usuário logado — bloqueado: login de teste indisponível no Supabase externo
- [x] Modelo 24 — causa: conjunto v1 congelado antes da etapa Variáveis; bloqueio de modelagem sobre conjunto desatualizado, motivo do erro no modelo, ajuda das transformações e modos
- [ ] Usuário: congelar nova versão do conjunto na HOMOLOG 001/2026 e regerar os modelos (dados não alterados automaticamente)
- [ ] Conferir na tela o aviso de conjunto desatualizado e o motivo do Modelo 24 com usuário logado — bloqueado: login de teste indisponível no Supabase externo
- [x] Rodadas de geração, deduplicação, arquivamento sem exclusão, filtros/ordenação paginados, triagem explicável, seleção humana e comparador de modelos (tela autenticada não conferida)
- [x] Banco reutilizável de imóveis/dados de mercado: buscar existentes, importar amostras de outra avaliação, foto imutável na inclusão, alerta de duplicidade, legado (13 amostras) preservado, isolamento por organização — 30 verificações SQL novas (todas as suítes 00–90 passam) + 86 testes JS; telas conferidas em simulação; banco atualizado; frontend aguarda Publish → Update
- [ ] Conferir na tela, logado, buscar/importar/novo dado do mesmo imóvel — bloqueado: login de teste indisponível no Supabase externo
- [x] Ciclo de vida do modelo: retirar da validação (volta a Calculado, histórico preservado), revalidar com as configurações atuais sem recalcular, arquivamento bloqueado em validação, aceite só em validação, eventos no histórico; sinal com transformações inversas conferido — 27 verificações SQL novas (suítes 00–95) + 94 testes JS (Guarantã/Aripuanã/São Félix verdes); tela simulada; banco atualizado; motor e avaliacao-engine intocados; frontend aguarda Publish → Update
- [ ] Usuário: na 002/2026 (Guarantã), revalidar o Modelo 1 com as configurações atuais; na 001/2026, retirar da validação os modelos que não serão usados
- [x] Critério 1 — gráficos de relacionamento no ponto médio (um por variável, escala original, sem extrapolar), síntese de coerência, "Confirmar coerência"/"Marcar para revisão" no histórico, PDF dos gráficos pronto para o laudo — 11 testes JS novos (105 no total, Guarantã/Aripuanã/São Félix verdes) + 12 verificações SQL; tela simulada com dados de Guarantã; banco atualizado; motor e avaliacao-engine intocados; frontend aguarda Publish → Update
- [x] Critério 12 Outliers em 3 níveis (Atende automático / Requer análise / Forte indício), política SIDIF_V1 v3 (v2 preservada), resíduo studentizado externo, p-valor, Bonferroni, Cook e leverage; decisão por amostra "Manter"/"Excluir do modelo" (novo modelo derivado) com histórico; aceite exige validar de novo após decisões — 9 testes JS novos (114 no total) + 30 verificações SQL; Guarantã = Atende (1,89; 0 de 12); avaliacao-engine atualizada; frontend aguarda Publish → Update
- [x] Município do imóvel (não do laudo): UF/município IBGE no cadastro e na edição (sugestão = município da avaliação), origem territorial automática, aviso de município comparável com sugestão, duplicidade pelo município real, Município/UF no banco de imóveis; servidor confere IBGE/UF e corrige "mesmo município" incoerente — 20 verificações SQL novas + 7 testes JS; tela simulada; nenhum dado alterado (a 003/2026 de Peixoto não tem amostras gravadas); frontend aguarda Publish → Update
- [ ] Usuário: recadastrar as amostras de Terra Nova do Norte na 003/2026 (nenhuma foi gravada)
- [ ] Outliers: confirmar com o RT a métrica que decide (hoje |Resíduo/DP|; em Guarantã o studentizado externo da amostra 13 é 2,75 e acionaria "Requer análise")
- [ ] Incluir os gráficos de relacionamento no laudo oficial (PDF/DOCX emitido) — desenho pronto; depende de decisão sobre a seção do modelo de laudo e de atualizar a avaliacao-engine

- [x] Housekeeping inbound — limites técnicos 10 anexos/10 MiB/25 MiB, validação antes de gravar e configuração transacional Super Admin; 29 testes Node + 3 Deno, UI simulada com releitura e build OK; somente inbound-maintenance-email republicada; frontend aguarda Publish → Update. Quota de plano adiada (contagem diária); salvamento autenticado real não verificado no Supabase externo.

- [x] Escopo municipal — IBGE local por UF, mapa independente de obras, seleção pesquisável com IBGE automático; 23 testes e simulações Patos/Salvador/Angra passaram, build OK; verificação autenticada indisponível no Supabase externo; frontend aguarda Publish → Update

- [x] Generalizar máscara territorial das 27 UFs — IBGE local, geometria/cache; 14 testes passaram, BA/MT/SC verificados em simulações desktop/celular, clusters preservados, build OK; validação autenticada indisponível no Supabase externo; frontend aguarda Publish → Update

- [x] Explicar política adicional de senha na tela — 22 testes passaram; mocks em desktop/celular confirmam checklist e campos preservados; build OK; somente reset-password republicada; frontend aguarda Publish → Update

- [x] Sanitizar erros de redefinição de senha — 25 testes passaram, 3 mensagens verificadas na tela com mocks, build OK; somente reset-password republicada; frontend aguarda Publish → Update

- [x] Centralizar URLs de app/site — 15 testes passaram, build OK; 3 funções republicadas; teste visual de cópia limitado por lista pública em carregamento; frontend aguarda Publish → Update

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
- [x] Lote 10 — Interface comercial: página pública /planos lendo catálogo do banco, formulário "Solicitar proposta" (commercial_leads, anon insere, só super admin lê), aba Pedidos no /super-admin. Decidido: sem trial self-service (toda contratação é manual)
- [ ] Lote 11 — Testes ponta a ponta (2 organizações, isolamento, limites) + homologação. Progresso 06/10/2026: órgão de teste criado (slug `teste-homolog`, Base + Obras Medição, sem Manutenção/Preventivos de propósito), usuário `teste.lote11@sidif.com.br` e obra de teste (is_demo, fora do portal público). Validado via Playwright: usuário do órgão de teste vê só a própria obra (1 de 1), obra da DPE-MT inacessível por URL direta, `my_org_can` retorna obras=true e rdo/manutencao/preventivos=false; DPE-MT permanece ilimitada. Corrigido de quebra: `super_admin_create_subscription` inseria itens de módulo como se fossem do plano e falharia em qualquer criação nova pelo painel. Ainda pendente no Lote 11: ambiente de homologação utilizável; segregação de arquivos legados (~5 GB) por órgão (8b); teste de limite de usuários/storage com estouro real; 49 alertas antigos do linter (separados).
- [ ] Decisões pendentes (seção P do plano): usuário único por org, invited conta vaga, bloqueio de estouro de storage, duração do trial, URL do portal por organização, nome commercial_modules
- [x] Tornar /planos fácil de acessar sem login e aproximar a seleção, módulos, capacidade e resumo do layout de referência — validado sem login em desktop e celular

## Auditoria multi-tenant (11/10/2026)
- [x] S1 Storage (P0) — aprovado com ressalvas (T10 manual pendente)
- [ ] S2 Edge Functions (P0) — aguardando autorização
- [x] S3 RLS auxiliar (P1) — concluído 11/10/2026
- [x] S4 admins/RPCs/crons (P1) — concluído 11/10/2026; aguardando avaliação antes do teste final Org A × Org B
- [x] 003/2026 Peixoto: colaborador (criador que indicou outro RT) passa a buscar no banco e importar amostras (incluir = market.edit; Usar/No modelo/congelar seguem com o RT); aviso de município comparável na busca — 16 verificações SQL novas, todas as suítes e 121 testes JS passam; banco atualizado; frontend aguarda Publish → Update
- [ ] Usuário: adicionar o imóvel de Terra Nova (Av Brasil) à 003/2026 pelo banco; existem 2 dados de mercado iguais (R$ 12.000, 12/01/2026) gerados pelas tentativas recusadas — escolher um; o outro pode ser marcado Descartado
- [ ] Conferir na tela, logado como colaborador, os botões do Mercado — bloqueado: login de teste indisponível no Supabase externo
- [x] "Remover da avaliação" na tabela de amostras: desfaz só o vínculo (imóvel e dado ficam no banco, readicionar funciona); amostra congelada não é apagada e a tela orienta desmarcar + nova versão — 16 verificações SQL novas + 3 testes JS; todas as suítes passam; banco atualizado; frontend aguarda Publish → Update
- [ ] Conferir na tela, logado, remover e readicionar uma amostra — bloqueado: login de teste indisponível no Supabase externo
- [x] Banco de Imóveis: 17 imóveis/dados da lista de 13/11/2026 disponíveis (14 imóveis e 14 dados criados; itens 1, 15 e 16 reutilizados; Av. Brasil 1075 corrigido para Peixoto de Azevedo); nenhum vínculo com avaliação, conjunto ou modelo
- [ ] Usuário: decidir possíveis duplicatas no banco — Rua dos Ipês 38 (110 m² novo × 2 cadastros antigos de 127,82 m²), Av. Cambará 1095 × "sn" 242 m², Rua das Figueiras 133 × nº 66 80 m²; itens 15/16 antigos estão como contrato privado sem fonte; dado duplicado antigo de R$ 12.000 da Av. Brasil (pode ser marcado Descartado); informar data da pesquisa dos 14 dados novos
