# Novo layout do módulo Obras (Etapa 1 — Análise e Plano)

Escopo: **somente a página `/obras`** (mapa) + drawer de resumo. Preservação integral de dados, rotas, permissões e regras. Nenhuma remoção sem aprovação.

## 1. Situação atual mapeada

**Rota / página**: `/obras` → `src/pages/Obras.tsx` (envolvida em `SimpleHeader`).
**Componentes envolvidos**:
- `SimpleHeader` (cabeçalho global atual)
- `PageHeader` (título + botões Estatísticas / Painel de Obras / Ver como Lista)
- `ObrasFilters` (Status, Tipo, Município + limpar)
- `ObrasMap` (Leaflet / OpenStreetMap, clusters, pins coloridos por status, popups)
- `ObraDetails` (drawer/sheet com informações gerais, prazos, financeiro, fotos, documentos, medições)
- `PhotoGalleryCollapsible`, `MedicaoProgressBar`, `ErrorState`

**Dados / hooks**:
- `useObras` → `obras` + `empresas(razao_social)` + `profiles` (fiscal/responsável)
- `useMedicoesFinanceiro(obraId)` → marcos, total contrato, valor acumulado
- `useRdoProgressByObra(obraId)` → avanço físico
- Permissões via `useUserRole` (`canEdit`, `isContratada`) e `PermissionGuard`

**Rotas relacionadas (preservar)**:
- `/dashboard` (Estatísticas)
- `/admin/obras` (Painel de Obras)
- `/admin/obras/lista` (Ver como Lista)
- `/obras/:id` já não é ativa aqui; abre no drawer — botão "Ver Detalhes Completos" e "Editar" atuais continuam levando aos fluxos existentes.

**Tabelas / storage**: `obras`, `empresas`, `profiles`, `medicoes`, `medicao_items`, `aditivos`, `rdo_*`, buckets `documents`, `avatars`.

## 2. Diferenças Figma × atual

| Elemento | Atual | Figma | Ação |
|---|---|---|---|
| Chrome global | `SimpleHeader` (top nav) | Sidebar lateral fixa + cabeçalho da página com breadcrumb, busca, sino, avatar | Trocar `SimpleHeader` por `AppSidebar` novo + novo `WorksPageHeader` **apenas nesta página** |
| Botões ação | `PageHeader` (ícones grandes) | Botões outline "Estatísticas / Painel de Obras / Ver como Lista" abaixo do header | Reposicionar mantendo rotas |
| KPIs | não existem no topo | 5 cards: Total, Em Andamento, Concluídas, Planejadas, Paralisadas (com barra colorida à esquerda) | Adicionar `WorksStats` derivado de `useObras` (clicáveis → aplicar filtro de status) |
| Chips filtros | não existem | Chips "Status: X ⊗ / Município: Y ⊗ / Limpar todos" + contador "X de Y obras exibidas" | Adicionar `ActiveFilters` |
| Filtros | Sidebar interna com Aplicar/Limpar/Resetar | Igual, com botão de colapsar (setinha) reproduzindo Frame-3 | Refatorar `ObrasFilters` visual; painel colapsável com tira estreita quando fechado |
| Mapa | Leaflet OSM, clusters, pins por status | Mesmo (preservar) | Nenhuma mudança funcional |
| Drawer obra | Sheet à direita com blocos Card, largura ~440–500 | Painel lateral clean: título grande, sub município, badges status/tipo, botão outline verde "Ver página completa", 3 mini-cards (Avanço Físico / Financeiro / Prazo), seções colapsáveis: Informações Gerais, Prazos, Financeiras, Álbum de Fotos (n), Documentos (n); rodapé "Ver Detalhes Completos" (verde sólido) + "Editar Obra" (outline) | Reescrever `ObraDetails` (mantendo todos os campos e ações atuais) |

## 3. Arquivos a criar/editar

**Criar**
- `src/components/obras/AppSidebar.tsx` *(clone do padrão já usado em Preventivos — Dashboard, Preventivos, Manutenção, **Obras (ativo)**, Almoxarifado, Teletrabalho, Orçamento, Configurações, Sair, avatar/nome do usuário)*
- `src/components/obras/ObrasLayout.tsx` *(SidebarProvider + slot de header + main)*
- `src/components/obras/WorksPageHeader.tsx` *(breadcrumb "Dashboard / Obras", título "Mapa de Obras", subtítulo, busca, sino, avatar)*
- `src/components/obras/WorksStats.tsx` *(5 KPI cards clicáveis)*
- `src/components/obras/ActiveFilters.tsx` *(chips + contador)*
- `src/components/obras/WorkSummaryDrawer.tsx` *(novo drawer — envolve `ObraDetails` refeito ou substitui)*

**Editar**
- `src/pages/Obras.tsx` — trocar `SimpleHeader`/`PageHeader` pelo novo layout; conectar KPIs/chips ao estado de filtros existente; preservar `ObrasMap` intacto.
- `src/components/ObrasFilters.tsx` — restyle (mesma API/campos); adicionar botão colapsar.
- `src/components/ObraDetails.tsx` — restyle para casar com Frame-5, mantendo TODOS os campos, fotos, documentos, medições, botões (Ver Detalhes / Editar).

**Não tocar**
- `ObrasMap.tsx`, `useObras`, `useMedicoesFinanceiro`, `useRdoProgressByObra`, `AdminObras*`, `ObrasLista.tsx`, rotas, RLS, migrations, buckets, hooks financeiros.

## 4. Preservação de funcionalidades (nada será removido)

- Tipos disponíveis atuais: **Reforma, Construção, Adequações**. O Figma mostra também "Ampliação" e "Manutenção" — irei **exibir apenas os tipos reais existentes** (não vou inventar). Se quiser habilitar Ampliação/Manutenção, aviso e peço aprovação (envolveria mudança de dados).
- Todos os campos atuais do `ObraDetails` (empresa, fiscal, gestor, SEI, contrato, coordenadas, medições, RDO progresso, aditivo prazo, tempo obra, etc.) serão mantidos — os que não couberem no bloco principal do Figma vão para seções colapsáveis (accordion) já previstas no design.
- Botões "Estatísticas", "Painel de Obras", "Ver como Lista" continuam apontando para as rotas atuais.
- Permissões (`PermissionGuard requiresEdit`, `useUserRole`) preservadas para "Editar Obra" e "Ver como Lista".

## 5. Campos ausentes no banco

Nenhum campo novo é necessário. O layout do Figma é subconjunto do que já existe.

## 6. Itens que exigirão sua aprovação antes de qualquer remoção

- Substituir `SimpleHeader` **apenas nesta página** por sidebar nova (as demais páginas continuam com `SimpleHeader` como estão hoje, exceto Preventivos que já usa sidebar). Confirmar OK.
- Se quiser rolar o novo shell para todas as páginas do sistema, isso seria uma tarefa separada (não incluída aqui).

## 7. Responsividade

- Desktop ≥1280: sidebar fixa, filtros à esquerda, mapa central, drawer direita ~460px.
- Notebook 1024–1279: filtros colapsáveis (Frame-3), drawer 420px.
- Tablet <1024: sidebar em drawer; filtros em bottom sheet; drawer da obra ocupa até 90% da largura.
- Mobile <640: mapa full; filtros e resumo da obra em bottom sheet.

## 8. Validação após implementação

Carregamento, clusters, filtros (aplicar/limpar/chips/colapsar), KPIs clicáveis, seleção de pin, drawer (abrir/fechar X e Esc), campos completos (fiscal, gestor, financeiro, medições, fotos, docs), botões (Ver Detalhes, Editar, Estatísticas, Painel, Lista), permissões, sem regressão no console, sem alteração em outras páginas.

---

Se aprovar, sigo direto para a Etapa 2 (implementação visual, sem tocar dados, rotas ou permissões).