# Etapa 1 — Auditoria do Sistema de Medições

Conforme solicitado, esta etapa é **apenas de leitura**: nenhum arquivo, migração, tabela, RPC ou dependência será alterado. O objetivo é mapear o funcionamento atual antes de aplicar o novo layout do Figma.

## 1. Rotas e componentes


| Item                | Local atual                                                                                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rota autenticada    | `/medicao/:id` → `src/pages/Medicao.tsx` (5.109 linhas, componente único que concentra tudo)                                                                                                                                                                  |
| Rota pública        | `/public/obras/:id/medicao` → `src/pages/PublicMedicao.tsx`                                                                                                                                                                                                   |
| Registro em rotas   | `src/App.tsx` (linhas 38, 103)                                                                                                                                                                                                                                |
| Navegação interna   | `Tabs` do shadcn dentro da própria página, com valores `medicao-atual`, `analise-financeira`, `gestao` (linhas 4123–4715). Não são rotas — é estado interno via `<Tabs>`                                                                                      |
| Cabeçalho atual     | `SimpleHeader` + `PageHeader` + `body.classList.add('medicao-layout-wide')` (largura customizada)                                                                                                                                                             |
| Modais/relatórios   | `NovaMedicaoDialog`, `NovoAditivoModal`, `RelatorioMedicaoModal`, `AjustarMedicaoCongeladaModal`, `ExportMedicaoDialog`, `ImportarPlanilha`, `ImportarDoRDO`, `ImportarCronograma`, `CronogramaView`, `ResumoContrato`, `ObraAuditLogs`, `MedicaoProgressBar` |
| Geração de Word/PDF | `src/components/RelatorioWordExport.ts` (1.358 linhas) + `src/lib/pdfExport.ts` + `src/lib/excelUtils.ts`                                                                                                                                                     |


## 2. Banco de dados


| Categoria             | Objetos                                                                                                                                                                                                                                                                                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tabelas               | `medicao_sessions`, `medicao_items`, `aditivo_sessions`, `aditivo_items`, `aditivos`, `medicoes`, `medicao_rdo_imports`, `orcamento_items`, `orcamento_itens`, `orcamentos`, `cronograma_financeiro`, `cronograma_items`, `cronograma_periodos`, `obras`, `obra_action_logs`, `rdo_activities`, `rdo_reports`, `user_obra_access`, `user_roles`, `profiles` |
| Snapshot/congelamento | Colunas `qtd_congelado`, `pct_congelado`, `total_congelado` em `medicao_items` — resolvidas por `resolveItensEfetivos` em `src/lib/medicaoSnapshot.ts`                                                                                                                                                                                                      |
| RPCs relevantes       | Progresso físico (RDO), cálculo de progresso de obra, `has_role`                                                                                                                                                                                                                                                                                            |
| RLS                   | Políticas nas tabelas `medicao_*` (5–10 policies cada), `aditivo_*`, `orcamento_*`, `obras` (11), `user_obra_access` (visibilidade contratada)                                                                                                                                                                                                              |
| Storage               | Bucket de fotos do RDO (usado pelo relatório) e uploads manuais do relatório                                                                                                                                                                                                                                                                                |


## 3. Fórmulas (nenhuma será tocada)

Todas concentradas em `src/pages/Medicao.tsx` + `src/lib/medicaoCalculo.ts` + `src/hooks/useMedicoesFinanceiro.ts`.


| Fórmula                                     | Função/hook                                                                                                                            | Arquivo                                              |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Valor inicial do contrato                   | `obras.valor_total`                                                                                                                    | `useMedicoesFinanceiro`                              |
| Total de aditivos                           | soma `aditivo_items.total` das sessões bloqueadas + `obras.valor_aditivado`                                                            | `useMedicoesFinanceiro`, `calcularFinanceiroMedicao` |
| Valor pós-aditivo                           | `totalContratoOrcamento + totalAditivo`                                                                                                | `calcularFinanceiroMedicao`                          |
| Total contrato c/ aditivos (por item)       | `calcularTotalContratoComAditivos(item, medicaoSeq)`                                                                                   | `Medicao.tsx`                                        |
| Executado/Acumulado por marco               | `calcularFinanceiroMedicao` (marcos)                                                                                                   | `medicaoCalculo.ts`                                  |
| Percentual executado                        | `valorAcumulado / totalContrato`                                                                                                       | `medicaoCalculo.ts`                                  |
| Administração local                         | cálculo cumulativo específico (ver mem `local-administration-calculation-logic`) — `Medicao.tsx` linhas ~815                           | `Medicao.tsx`                                        |
| Acrescidos / decrescidos / extracontratuais | derivados de `orcamento_items.origem` e `aditivo_items` (ver mems `aditivo-suppression-logic`, `total-contrato-extracontratual-logic`) | `Medicao.tsx`, `medicaoCalculo.ts`                   |
| Quantidade / % / total por medição          | inputs manuais + `atualizarMedicao()` (linha 1023)                                                                                     | `Medicao.tsx`                                        |
| Acumulado por item                          | percorrer sessões até a atual                                                                                                          | `Medicao.tsx`                                        |
| Congelamento                                | `qtd_congelado/pct_congelado/total_congelado` via `resolveItensEfetivos`                                                               | `medicaoSnapshot.ts`                                 |
| Cronograma previsto/executado/desvio        | `CronogramaComparativo`, `CronogramaView`, `useCronogramaFinanceiro`                                                                   | componentes citados                                  |
| Progresso da obra                           | RPC `calculo-progresso` (ver mem `calculo-progresso-rpc-logic`)                                                                        | Supabase                                             |


Regras preservadas de memória: arredondamento a 2 casas, `limit(10000)`, hierarquia macro/micro estrita, hierarquia de descontos de aditivo, congelamento imutável pós-bloqueio.

## 4. Importações


| Importação            | Componente                                        | Regras críticas                                                                                                                                                                                                                   |
| --------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planilha orçamentária | `ImportarPlanilha.tsx`                            | Formatos xlsx/csv via `excelUtils.readExcelFile/readCsvAsExcel`; mapeamento por cabeçalhos existentes; hierarquia por código; itens originais x extracontratuais; normalização de arredondamento (mem `spreadsheet-import-logic`) |
| Última medição        | Interno em `Medicao.tsx`                          | Reaproveita última sessão bloqueada como base                                                                                                                                                                                     |
| Importar do RDO       | `ImportarDoRDO.tsx` + `useRdoActivitiesAcumulado` | Filtragem por critério (mem `rdo-import-criteria`), dedup (mem `rdo-import-duplicate-prevention`)                                                                                                                                 |
| Cronograma financeiro | `ImportarCronograma.tsx`                          | Grava em `cronograma_*`, permissão DELETE necessária (mem `rls-cronograma-delete-permission`)                                                                                                                                     |
| Exportação            | `ExportMedicaoDialog.tsx` + `writeExcelFile`      | Mantém cabeçalhos `Medicao{N}_QNT/PCT/TOTAL`                                                                                                                                                                                      |


## 5. Estados da medição

Regidos por `medicao_sessions.status`:

- **aberta** → editável; `total` recalculado dinamicamente.
- **bloqueada** → grava `*_congelado`; `resolveItemEfetivo` passa a devolver os valores congelados; ajustes só via `AjustarMedicaoCongeladaModal`.
- **reaberta** → volta a `aberta`, mas valores congelados anteriores permanecem até novo save (verificar handler em `useMedicaoSessions`).
- **excluída** → `deleteSession` remove itens antes da sessão.
- **primeira medição** → aditivo com sequência 0 é considerado (mem `aditivo-starting-measurement-logic`).

## 6. Permissões

- `useUserRole` (admin) e `useCanEditObra` (fiscal/gestor/contratada via `user_obra_access`).
- Aba **Gestão** só aparece quando `canEdit` (linha 4126).
- Contratada tem visibilidade restrita (mems `contratada-project-visibility-logic`, `permission-substitutos-planning-edit`).
- Ações bloqueio/reabertura/exclusão/aditivo/publicação seguem RLS das tabelas correspondentes.

## 7. Relatórios

- Modal: `RelatorioMedicaoModal.tsx` (2.035 linhas) — coleta período, fiscal, cargo, fotos, legendas.
- Geração Word: `RelatorioWordExport.ts` (docx), com conclusão automática, resumo financeiro, anexos, ordenação — **não deve ser alterado**.
- PDF: `pdfExport.ts` (margens/paginação, mem `pdf-export-logic`).
- Gráficos: `MedicaoProgressBar`, `CronogramaComparativo` (mems `graph-display-formatting`, `technical-report-graph-units`).

## 8. Compatibilidade Figma → sistema atual


| Tela Figma                               | Corresponde a                                                                                     | Preservação                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Medição Atual — Desktop                  | `<TabsContent value="medicao-atual">` (linha 4130)                                                | Reusar tabela hierárquica, cards financeiros vindos de `useMedicoesFinanceiro`, ações existentes |
| Medição Atual — Bloqueada                | Mesma tab quando `session.status='bloqueada'`                                                     | Manter `AjustarMedicaoCongeladaModal`                                                            |
| Análise Financeira — Resumo/Gráficos     | `<TabsContent value="analise-financeira">` (linha 4697) + `ResumoContrato` + `MedicaoProgressBar` | Manter dados/séries                                                                              |
| Análise Financeira — Desvios/Cronograma  | `CronogramaComparativo` + `CronogramaView`                                                        | Manter fórmulas de desvio                                                                        |
| Gestão                                   | `<TabsContent value="gestao">` (linha 4715) + `ObraAuditLogs` + lista de aditivos/sessões         | Manter ações CRUD                                                                                |
| Modal Importar Planilha                  | `ImportarPlanilha.tsx`                                                                            | Manter parser/mapeamento                                                                         |
| Modal Confirmar Exclusão                 | `AlertDialog` já existente + `confirm state` (linha 159)                                          | Trocar apenas visual                                                                             |
| Relatório — Dados/Fotos/Revisão          | `RelatorioMedicaoModal.tsx` (adicionar apenas passo "Revisão")                                    | Não tocar em `RelatorioWordExport.ts`                                                            |
| Responsivo Notebook/Tablet/Mobile        | Hoje: `medicao-layout-wide` + tabela horizontal                                                   | Adicionar layout adaptativo sem esconder dados                                                   |
| Estados Carregamento/Erro/Vazio/Editável | `LoadingStates` + estados internos                                                                | Reforçar visual (skeleton, empty state)                                                          |


## 9. Layout compartilhado a reutilizar

- `ObrasLayout` + `AppSidebar` (mesmo padrão aplicado em Nova Obra / Editar Obra / Gerenciar Obras / Estatísticas).
- Remover `SimpleHeader`/`PageHeader` locais e a classe `medicao-layout-wide` (avaliar se largura extra continua necessária dentro do layout compartilhado; se sim, aplicar via container interno).
- Manter item "Obra" ativo na sidebar.
- Cabeçalho da página: breadcrumb + título "Sistema de Medição" + nome da obra, município, contrato, status, botão voltar.

## 10. Riscos identificados (para discussão antes da Etapa 2)

1. `**Medicao.tsx` com 5.109 linhas** concentra estado, cálculos e UI. Um redesenho seguro exige dividir em componentes de apresentação por seção (cards, tabela, análise, gestão) **sem mover funções de cálculo**. Peço confirmação de que essa segmentação — apenas extraindo JSX, mantendo estados e handlers no arquivo pai via props — é aceitável.
2. `**medicao-layout-wide**` força `body` a ganhar largura; ao entrar no `ObrasLayout` isso pode conflitar com o `main` já com padding. Proposta: aplicar largura no container interno da página, preservando o comportamento visual da tabela.
3. **Tab "Gestão"** hoje só aparece com `canEdit`. Manter essa regra idêntica.
4. **Nenhuma alteração em Supabase, RPCs, hooks de cálculo, importadores, gerador Word/PDF, cronograma ou schema** será feita sem autorização expressa via novo plano.

## O que virá na Etapa 2 (apenas para referência, não será executado agora)

Sequência de commits proposta, cada um exclusivamente visual/estrutural:

1. `layout-base-medicoes` — envolver `Medicao.tsx` em `ObrasLayout` + novo header, remover `SimpleHeader`.
2. `medicao-atual-ui` — extrair cards financeiros e barra da medição em subcomponentes; aplicar visual do Figma.
3. `analise-financeira-ui` — reorganizar `ResumoContrato` + gráficos conforme Figma.
4. `gestao-ui` — timeline/cards para histórico, listagem de aditivos e sessões.
5. `relatorio-ui` — adicionar passo Revisão dentro de `RelatorioMedicaoModal` sem alterar geração.
6. `responsividade-medicoes` — adaptações 1280/768/375 preservando todos os dados técnicos.
7. `testes-regressao-medicoes` — checklist de comparação antes/depois.

---

**Aguardo aprovação desta auditoria** (ou correções) antes de qualquer alteração de código.  
  
Plano aprovado apenas quanto à refatoração visual. Antes de implementar, confirme por escrito que nenhuma fórmula, importação, RPC, estrutura de banco, regra de congelamento, cálculo de acumulado, lógica de aditivos, cronograma ou geração de relatório será modificada. Caso identifique necessidade de qualquer alteração funcional durante a execução, interrompa o trabalho e solicite minha autorização antes de prosseguir.