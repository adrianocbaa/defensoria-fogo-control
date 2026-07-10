## Objetivo

Recriar a página `/preventivos` seguindo com fidelidade as duas imagens de referência (sidebar verde institucional + área de conteúdo com cards, filtros, mapa e lista lateral integrada), sem alterar autenticação, Supabase, rotas ou regras de negócio.

## Arquivos a criar / alterar

Somente frontend, no escopo do módulo Preventivos:

- **Novo** `src/components/preventivos/PreventivosLayout.tsx` — shell com `AppSidebar` fixa à esquerda (~240px) + área principal. Usa `Sheet` para virar drawer em tablet/mobile. Reaproveita `AppSidebar` do módulo home (já tem cores institucionais verdes, item ativo, avatar do usuário autenticado). Sem barra superior verde antiga.
- **Novo** `src/components/preventivos/PreventivosPageHeader.tsx` — breadcrumb "Dashboard / Preventivos", título "Preventivos", subtítulo "Controle de prevenção contra incêndio dos núcleos", botão hamburger (mobile), campo "Pesquisar no sistema..." (visual, encaminha ao search global existente ou apenas filtro local), ícone sino (reaproveita lógica de `useObraNotifications` como em `SimpleHeader`) e avatar (usa `useProfile`).
- **Novo** `src/components/preventivos/PreventiveStats.tsx` — 4 cards (Total, Regularizados, Vencendo, Irregulares) com barra vertical colorida à esquerda, ícone no canto sup. direito, número em destaque. Cores só como detalhe.
- **Novo** `src/components/preventivos/PreventiveFilters.tsx` — linha com input de busca, pills "Todos / Regularizados / Vencendo / Irregulares", link "Limpar filtros" e contador "Exibindo X de Y núcleos".
- **Novo** `src/components/preventivos/StatusBadge.tsx` — badges Regularizado / Vencendo / Irregular / Sem informação.
- **Novo** `src/components/preventivos/NucleiList.tsx` — painel lateral com título "Núcleos" + badge de contagem, rolagem própria, item selecionado com fundo verde-claro e barra lateral verde escura, chama `onSelect(nucleusId)`.
- **Alterar** `src/components/MapViewPreventivos.tsx`:
  - Remover a linha superior de "Filtrar por situação" (agora vem de `PreventiveFilters`).
  - Aceitar props controladas: `statusFilter`, `selectedNucleusId`, `onSelectNucleus`, `onStatusMapChange` (mapa id→status para permitir contagens e filtragem na página).
  - Ao receber `selectedNucleusId`, centralizar o mapa no marker correspondente (`flyTo`).
  - Encolher para `flex-1` num container que também comporta a lista à direita (mapa 56–60% / lista 40–44% no desktop, empilhado no mobile).
- **Alterar** `src/pages/Preventivos.tsx` — reescrever para usar `PreventivosLayout` + `PreventivosPageHeader` + `PreventiveStats` + `PreventiveFilters` + container mapa+lista. Mantém `useNucleosByModule('preventivos')` e navegação `/preventivos/:id` existentes. Adiciona estado `selectedNucleusId` compartilhado entre mapa e lista.
- **Não** alterar `PublicPreventivos.tsx`, detalhes internos, outros módulos, sidebar de fora do escopo, Supabase, rotas ou hooks de dados.

## Regras visuais

- Verde institucional já disponível via tokens `--home-sidebar-*`. Fundo da app: `bg-background`.
- Tipografia: usar a fonte padrão do projeto (Inter/Manrope já configurada). Sem cores hardcoded — usar tokens (`primary`, `success`, `warning`, `destructive`, `muted-foreground`).
- Cards: `bg-card`, borda `border`, `rounded-xl`, `shadow-sm`, barra lateral esquerda com `bg-*` conforme status.
- Container mapa+lista: um único `Card`/`div` `rounded-xl border overflow-hidden`, com `grid lg:grid-cols-[minmax(0,1fr)_380px]`. Lista dentro do container, com `max-h-[600px] overflow-y-auto`.
- Responsividade:
  - Desktop ≥1280px: sidebar fixa 240px, 4 cards em linha, mapa+lista lado a lado.
  - Notebook 1024–1279px: sidebar fixa 220px, cards 4 col, mapa+lista lado a lado com lista 320px.
  - Tablet 640–1023px: sidebar em Sheet drawer, cards 2 col, lista abaixo do mapa.
  - Celular <640px: header compacto com hamburger, cards 1–2 col, filtros com rolagem horizontal, mapa full width, lista abaixo.

## Dados

- Continuar usando `useNucleosByModule('preventivos')` (21 núcleos reais).
- Contagens dos cards vêm do `onStatusMapChange` do `MapViewPreventivos` (mesma lógica já implementada — hidrantes + extintores + alvará → verde/laranja/vermelho). Total = `nucleos.length`. Regularizados = green. Vencendo = orange. Irregulares = red.
- Filtro por status e busca aplicados na página, alimentam mapa e lista simultaneamente.
- Clique em item do mapa ou da lista atualiza `selectedNucleusId` e centraliza o mapa. Duplo clique / botão "Ver detalhes" navega para `/preventivos/:id`.

## Validação

Após implementar: comparar visualmente com `Frame.png` e `Frame-1.png`, checar console limpo, verificar que os 21 núcleos aparecem, e testar busca, filtros, seleção via mapa/lista, navegação para detalhes e as 4 larguras (desktop / notebook / tablet / celular).
