
# Etapa 1 — Auditoria do RDO (sem modificar código)

## 1. Estrutura atual mapeada

### Rotas
- `/obras/:obraId/rdo/*` → `src/pages/RDO.tsx` (shell da área)
  - `resumo` (default) → componente interno `RDOResumo`
  - `equipe`, `equipamentos`, `materiais`, `clima`, `fotos`, `ocorrencias`, `seguranca`, `medicoes`, `assinaturas`, `config` → placeholders (não usados na navegação real)
- `/obras/:obraId/rdo/diario?data=YYYY-MM-DD&id=UUID` → `src/pages/RDODiario.tsx` (criação/edição do RDO do dia via stepper)
- `/rdo/verify/:hash` → `src/pages/RdoVerify.tsx`
- Públicos: `/public/obras/:id/rdo` e `/public/obras/:id/rdo/diario`

### Layout / navegação atual
- `SimpleHeader` como wrapper.
- Header próprio dentro de `RDO.tsx` com breadcrumb (`Obras / [obra] / RDO`), título, município, badge de status e botão "Voltar para Obras".
- `RDOSidebar` (`src/components/RDOSidebar.tsx`) — sidebar interna do RDO com um único item ("Resumo") + `RdoBatchPrintDialog` (Imprimir RDOs) + `RdoAtividadesReportDialog` (Relatório de Atividades) montados como itens.
- Ou seja, hoje **as três áreas oficiais** são: Resumo (rota), Imprimir RDOs (diálogo) e Relatório de Atividades (diálogo).

### Componentes principais
- `RDOResumo` (dentro de `RDO.tsx`): counter cards, calendário, relatórios recentes, fotos recentes.
- `RdoCalendar` (`src/components/rdo/RdoCalendar.tsx`, 648 linhas): grade mensal, navegação de mês, botão Hoje, criação, exclusão (window.confirm), abertura, indicadores (fotos/vídeos/atividades/ocorrências/comentários/quantitativos), dias sem expediente, permissões, botão "+" por dia.
- `RdoBatchPrintDialog` — diálogo com período, invoca edge function `generate-rdo-batch-pdf`, gera ZIP.
- `RdoAtividadesReportDialog` — diálogo com filtros e exportação.
- `RDODiario` — página do formulário (stepper) para criar/editar/visualizar RDO.

### Dados (hooks/tabelas confirmadas em `useRdoData.ts` + código)
- `rdo_reports` (id, obra_id, data, numero_seq, status, fiscal_concluido_em, contratada_concluido_em, assinatura_fiscal_validado_em, assinatura_contratada_validado_em)
- `rdo_activities` (executado_dia)
- `rdo_occurrences`
- `rdo_comments`
- `rdo_media` (tipo: 'foto' | 'video', file_url, thumb_url)
- `rdo_dias_sem_expediente`
- `rdo_audit_log` (para flag `was_rejected` = ação REPROVAR)
- Status reais em uso: `rascunho`, `preenchendo`, `concluido`, `aprovado`, `reprovado`.
- Hooks: `useRdoCounts`, `useRdoCalendar`, `useRdoRecentes`, `useFotosRecentes`, `useLastFilledRdo`, `useFirstMissingRdoDate`, `useDiasSemExpediente`, `useRdoRestrictions`, `useCanEditObra`, `useUserRole`, `useRdoConfig`, `useRdoForm`, `useAditivosParaRdo`, `useRdoActivitiesAcumulado`, etc.

### Permissões
- `hasEditPermission` = admin/contratada/demo → `canEditRDO`; fiscal → `canEditObra`.
- `hasViewPermission` = admin/contratada/demo → `canEditRDO`; fiscal → `roleCanEdit`.
- Bloqueia edição quando `obraStatus === 'concluida'` ou `status === 'aprovado'` (exceto admin).

## 2. Comparação Figma × Sistema atual

| Elemento no Figma | Sistema atual | Decisão recomendada |
|---|---|---|
| Sidebar verde SiDIF compartilhada (`AppSidebar`) | `SimpleHeader` + `RDOSidebar` interna | **Estilizar**: adotar `AppSidebar` compartilhada (via `ObrasLayout`), eliminar `SimpleHeader` e `RDOSidebar` desta área |
| Breadcrumb `Dashboard / Obras / [Obra] / RDO`, título, município, badge status, botão "Voltar para Obras", sem avatar duplicado | Já existe, sem avatar duplicado (AppSidebar já mostra usuário) | **Reposicionar** para dentro do novo layout compartilhado |
| Tabs horizontais: Resumo · Imprimir RDOs · Relatório de Atividades | Sidebar interna com esses três itens | **Reposicionar** (tabs = mesma navegação, apenas visual) |
| Botão `+ Novo RDO` no header | Botão `+` dentro da célula do calendário | **Aditivo baixo risco**: adicionar botão no header que reutiliza a mesma lógica de criação (abre `/rdo/diario?data=<hoje ou primeiro-dia-faltando>`) |
| 5 cards de resumo (Relatórios, Ocorrências, Comentários, Fotos, Vídeos) com ícone à esquerda | Mesmos 5 cards, com ícone no topo | **Estilizar** |
| Chips de filtro "Todos / Com ocorrência / Com fotos / Com comentários / Sem expediente / Pendentes / Aprovados" | Não existe | **Aditivo baixo risco (client-side)**: filtrar apenas visualmente sobre os dados já carregados; "Pendentes/Aprovados" mapeados para status reais existentes (`preenchendo`/`concluido` vs `aprovado`) |
| Toggle "Mês · Lista · Linha do tempo" | Só grade mensal | **Aditivo baixo risco**: incluir Mês e Lista (reutilizando `useRdoCalendar`). **Linha do tempo requer aprovação** — proponho não incluir agora |
| Célula do dia: verde claro = com RDO, amarelo = hoje, badge `RDO #n`, ícone câmera com contador, ícone alerta com contador, menu `⋯` | Já existe grade mensal com badges e status via cores mistas | **Estilizar**: adotar a paleta/hierarquia do Figma (verde/âmbar/cinza), preservar todos os indicadores atuais (fotos, vídeos, ocorrências, comentários, atividades, quantitativos) |
| Menu contextual `⋯` (Abrir/Editar/Visualizar/Imprimir/Excluir) | Ações espalhadas + `window.confirm` | **Reposicionar** em `DropdownMenu`; substituir `window.confirm` por `AlertDialog`. "Imprimir" abre o `RdoBatchPrintDialog` já com o dia selecionado como período (aditivo baixo risco). "Duplicar" **não** existe e **não** será adicionada |
| Drawer lateral de resumo do dia ao clicar na célula | Clicar hoje navega direto para `/rdo/diario` | **Aditivo baixo risco**: `Sheet` lateral com dados já carregados (numero, data, status, contadores, primeiras fotos, ocorrências, responsável); ações "Ver RDO completo" / "Editar" / "Imprimir" preservam o fluxo atual. Clima/Equipe/Atividades detalhadas exigem query nova — **exibir apenas o que já está disponível**; equipe/clima só se aparecerem sem custo adicional (decisão: **não buscar novos dados**, mostrar somente o que já vem em `useRdoCalendar`) |
| Relatórios Recentes com colunas RDO/Data/Status/Fotos/Ocorr/Responsável/Ação + "Ver todos" | Lista simples com badge e ações | **Estilizar** em tabela; "Ver todos" alterna para a visualização "Lista" (não cria rota) |
| Fotos Recentes em grid com badge "RDO #n" | Grid 3x3 sem badge | **Estilizar** + adicionar badge do RDO (dado já disponível — precisa apenas incluir `report_id`/`numero_seq` no `useFotosRecentes`, **alteração mínima e aditiva no select**) |
| Lightbox de fotos (com navegação, download, share) | Não existe | **Aditivo baixo risco**: novo componente `RdoPhotoLightbox` sobre as fotos já carregadas. Download/Share só se usarem `file_url` público direto (share nativo via `navigator.share`). Sem novo bucket/storage |
| Modal de exclusão "Excluir RDO #n?" com aviso de dados vinculados | `window.confirm` | **Reposicionar**: `AlertDialog` preservando a mesma ação de delete existente |
| Loading state (skeletons) | Skeleton genérico | **Estilizar** conforme Figma |
| Error state (com "Tentar novamente") | Toast de erro | **Aditivo baixo risco**: bloco de erro com `refetch` do React Query |
| Estado vazio ("Nenhum RDO registrado neste mês") | Alert genérico atual | **Estilizar** |
| Tela "Imprimir RDOs" (Figma mostra 2 colunas com período, RDOs específicos, conteúdo a incluir, formato, ordenação, resumo à direita) | Dialog compacto atual só com período | **Reposicionar como tab de página** (mesma edge function). "RDOs específicos", "Conteúdo a incluir", "Formato Excel", "Ordenação" **não existem** hoje — **requer aprovação**. Proposta segura: renderizar a UI atual dentro do novo layout de duas colunas, sem novos toggles funcionais |
| Tela "Relatório de Atividades" com filtros, cards de resumo, tabela, gráfico de barras por categoria | Dialog atual com filtros e export | **Reposicionar como tab de página** reutilizando a lógica atual do `RdoAtividadesReportDialog`. Gráfico de barras por categoria **é novo** — **requer aprovação** antes de implementar |
| Sidebar mobile (bottom nav Início/RDO/Fotos/Mais) na variante responsiva | AppSidebar em Sheet | **Manter AppSidebar em Sheet**. Bottom nav do Figma **não** será adicionada (mudança estrutural de navegação) |
| Visualização em Lista com colunas incluindo "Dia da Semana", paginação | Não existe | **Aditivo baixo risco**: reutilizar `useRdoCalendar` (mesmo dataset do mês). Sem paginação server-side (client-side simples) |

## 3. Itens do Figma que **NÃO** serão implementados sem aprovação

- Status "Em análise" — não existe no schema; substituir por `preenchendo`/`concluido`.
- Filtros "Pendentes / Aprovados" — implementados apenas como filtro visual sobre status reais (`concluido` ou `preenchendo` = pendente; `aprovado` = aprovado); confirmar mapeamento.
- Toggle "Linha do tempo" — nova visualização, não incluir.
- Bottom navigation mobile — mudança de navegação estrutural.
- "Duplicar RDO" no menu contextual — não existe.
- Toggles novos em "Imprimir RDOs" (RDOs específicos, conteúdo a incluir, Excel, ordenação) — mudariam a edge function.
- Gráfico de "Distribuição de Atividades por Categoria" no Relatório de Atividades — nova agregação.
- "Ver mês completo", "Ver galeria", "Ver todos" como novas rotas — só como navegações internas (troca de tab/toggle).

## 4. Plano de implementação (após aprovação desta auditoria)

Camada visual sobre a lógica atual. Nenhuma mudança em tabelas, RPCs, edge functions, buckets, políticas RLS, hooks de escrita ou fluxos de criação/edição.

### 4.1 Layout compartilhado
- Substituir `SimpleHeader` + `RDOSidebar` por `ObrasLayout` (mesmo padrão das novas páginas) com `AppSidebar` verde compartilhada.
- Novo componente `RdoHeader` (breadcrumb, título, subtítulo com obra/município, badge status, botões "Voltar para Obras" e "+ Novo RDO").
- Remover `RDOSidebar.tsx` do uso (arquivo permanece até confirmação; **não deletar** sem aprovação).

### 4.2 Navegação interna
- `RdoTabs` (Resumo / Imprimir RDOs / Relatório de Atividades) — 3 rotas filhas dentro de `/obras/:obraId/rdo/*` (mantém rotas atuais compatíveis; adiciona `/imprimir` e `/atividades` como novas rotas visuais que renderizam os conteúdos que hoje estão em dialogs — decisão: **manter os dialogs existentes disponíveis** e apenas embutir seu conteúdo como página nas tabs).

### 4.3 Resumo
- `RdoSummaryCards` — 5 cards (mesmos dados).
- `RdoFilterChips` — filtros client-side sobre `calendarData` (Todos, Com ocorrência, Com fotos, Com comentários, Sem expediente, Pendentes, Aprovados).
- `RdoViewToggle` — Mês / Lista.
- `RdoCalendar` (refatorar visual internamente, mantendo props e lógica).
  - `RdoCalendarDay`, `RdoDayIndicators`, `RdoDayActions` (menu ⋯ com DropdownMenu).
- `RdoDayDrawer` — `Sheet` com dados já disponíveis.
- `RdoListView` — tabela sobre `calendarData`.
- `RecentRdos` — tabela redesenhada; "Ver todos" alterna para Lista.
- `RecentPhotos` — grid + badges de RDO (ajuste mínimo aditivo no select do `useFotosRecentes` para incluir `report_id` e join com numero_seq).
- `RdoPhotoLightbox` — visualização ampliada.
- `DeleteRdoDialog` — AlertDialog reutilizando a delete atual.
- `RdoLoadingState`, `RdoErrorState`, `RdoEmptyState`.

### 4.4 Imprimir RDOs
- Renderizar `RdoBatchPrintDialog` como página (mesmo formulário/lógica) num layout de 2 colunas conforme Figma. Sem novos toggles funcionais.

### 4.5 Relatório de Atividades
- Renderizar `RdoAtividadesReportDialog` como página (mesma lógica). Cabeçalho, filtros, tabela e export preservados. Cards de resumo e gráfico do Figma **omitidos** até aprovação.

### 4.6 Responsividade
- Desktop: layout 2 colunas (Relatórios Recentes + Fotos Recentes).
- Tablet: sidebar via Sheet (já suportado).
- Mobile: `RdoViewToggle` padrão em "Lista"; drawer do dia como bottom sheet.

## 5. Testes de regressão previstos (antes/depois)

Sobre a mesma obra + mesmo mês:
- Contadores dos 5 cards idênticos.
- Todas as datas com/sem RDO idênticas, com mesmos indicadores.
- Dias sem expediente marcados idênticos.
- Ações Abrir/Editar/Imprimir/Excluir com o mesmo comportamento e mesmas permissões.
- Impressão em lote e Relatório de Atividades geram os mesmos arquivos.
- Fluxo `/rdo/diario` (criação/edição) inalterado.
- Rotas antigas continuam funcionando (`/obras/:id/rdo/resumo`).
- Sem erros no console.

## 6. Aprovações necessárias antes de codar

1. Confirmar mapeamento de "Pendentes / Aprovados / Em análise" para os status reais (`preenchendo`/`concluido`/`aprovado`/`reprovado`).
2. Confirmar transformar Imprimir RDOs e Relatório de Atividades de dialogs em **páginas com tabs** (sem remover os dialogs? ou removendo do menu antigo?).
3. Confirmar adicionar mini query em `useFotosRecentes` para trazer `numero_seq`/`report_id` (aditivo, mesma tabela).
4. Confirmar remoção do `RDOSidebar` interno em favor de tabs horizontais (visual apenas — rotas mantidas).
5. Manter fora do escopo (até novo aval): "Duplicar RDO", "Linha do tempo", novos toggles em Imprimir, gráfico de categorias em Atividades, bottom nav mobile.

Aguardo aprovação para partir para a implementação.
