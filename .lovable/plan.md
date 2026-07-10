
# Plano — Nova Home de Módulos do SiDIF

Nada será implementado nesta etapa. Este documento descreve o que precisa ser reproduzido a partir da referência (Frame.png = sidebar; Frame-1.png = área de conteúdo).

---

## 1. O que renderiza a home hoje

- **Rota:** `/` (em `src/App.tsx`, dentro de `<ProtectedRoute>`)
- **Componente:** `src/pages/MainDashboard.tsx`
- **Layout atual:** `SimpleHeader` (header horizontal) + `PageHeader` + grid de cards coloridos vindo de `useAvailableSectors` + `useUserSectors`.
- **Não usa sidebar** — a referência muda essa estrutura.

---

## 2. Componentes reaproveitáveis

| Já existe | Uso na nova home |
|---|---|
| `useAvailableSectors` | Lista canônica de módulos (título, ícone, id) |
| `useUserSectors` | Filtro de permissão por perfil |
| `useAuth` / `useProfile` / `useUserRole` | Nome do usuário no rodapé da sidebar, saudação "Olá, Adriano", link Admin |
| `sectorPaths` / `sectorColors` (dentro de `MainDashboard.tsx`) | Redirecionamentos dos cards e cores dos ícones |
| `components/ui/*` (card, input, button, avatar, dropdown-menu, sidebar do shadcn, badge, separator) | Base visual |
| `AuthContext.signOut` | Botão "Sair" da sidebar |

Componentes atuais que **não** serão usados na nova home: `SimpleHeader`, `PageHeader`, `Layout` (header antigo) — permanecem em outras páginas.

---

## 3. Componentes novos a criar

Todos em `src/components/home/`:

1. **`HomeSidebar.tsx`** — sidebar verde fixa (shadcn `Sidebar` com `collapsible="icon"`).
   - Logo SiDIF no topo (badge verde + wordmark).
   - Item "Dashboard" ativo (link para `/`).
   - Grupo **OPERACIONAIS**: Preventivos, Manutenção, Obra.
   - Grupo **ADMINISTRATIVOS**: Almoxarifado, Teletrabalho, Orçamento.
   - Rodapé: Configurações, Sair, avatar + nome do usuário logado.
   - Itens filtrados pela mesma lógica de `useUserSectors` (não mostra módulos sem permissão).
2. **`HomeTopbar.tsx`** — barra superior branca com breadcrumb "Dashboard / Visão Geral", input de busca (visual, sem back-end nesta etapa) e ícone de sino.
3. **`HomeHero.tsx`** — badge "RECOMENDADA" + saudação "Olá, {primeiro nome}. O que você deseja acessar hoje?" usando `profile.display_name`.
4. **`QuickAccessRow.tsx`** — 4 atalhos horizontais (Preventivos, Manutenção, Obra, Orçamento), cada um clicável indo para a rota real. Se o usuário não tiver permissão para algum, ele é omitido.
5. **`ModulesGrid.tsx`** — grid 4 col × N linhas com card por módulo (ícone em quadrado verde claro, título, subtítulo de categoria, badge "EM DESENVOLVIMENTO" quando `path === '#'`). Consome `useAvailableSectors` + `useUserSectors`.
6. **`RecentActivityCard.tsx`** — placeholder visual. **Sem dados falsos**: renderiza estado vazio ("Sem atividade recente") até ser plugado. Estrutura pronta para receber lista futura.
7. **`PendenciasCard.tsx`** — placeholder visual laranja. **Sem número inventado**: se não houver fonte, exibe título "Pendências" com texto genérico ou é ocultado. Preferência: ocultar até termos dado real (a discutir com o usuário na implementação).
8. **`HomeLayout.tsx`** — shell com `SidebarProvider` + `HomeSidebar` + `<main>` contendo `HomeTopbar` e children.

---

## 4. Arquivos a alterar

- `src/pages/MainDashboard.tsx` — reescrito para compor os novos componentes.
- `src/index.css` / `tailwind.config.ts` — adicionar tokens semânticos: `--sidebar-bg` (verde institucional), `--sidebar-accent`, `--module-icon-bg` (verde claro), `--recommended` badge, `--pendencia` (laranja). Nada hardcoded nos componentes.
- `src/App.tsx` — nenhuma mudança de rota; `/` continua apontando para `MainDashboard`.
- `src/lib/navigation.ts` — pode receber a lista de agrupamentos (Operacionais/Administrativos) para a sidebar.

Nenhuma alteração em: `AuthContext`, hooks de dados de negócio, Supabase, páginas internas dos módulos, `ProtectedRoute`, RLS.

---

## 5. Estrutura da sidebar

```text
┌──────────────────────┐
│ [logo] SiDIF         │
├──────────────────────┤
│ ▸ Dashboard (ativo)  │
│ OPERACIONAIS         │
│   ◯ Preventivos      │
│   ◯ Manutenção       │
│   ◯ Obra             │
│ ADMINISTRATIVOS      │
│   ◯ Almoxarifado     │
│   ◯ Teletrabalho     │
│   ◯ Orçamento        │
│  … (espaço flexível) │
├──────────────────────┤
│ ⚙ Configurações      │
│ ⤴ Sair               │
│ [avatar] Nome user   │
└──────────────────────┘
```

- Largura ~260px expandida, ~64px colapsada (`collapsible="icon"`).
- Trigger de colapso no `HomeTopbar` (sempre visível).
- Item ativo destacado com pílula verde clara conforme referência.

---

## 6. Organização da área de conteúdo

```text
Topbar:  [Dashboard / Visão Geral]                     [🔎 busca]   [🔔]
────────────────────────────────────────────────────────────────────
[badge RECOMENDADA]
Olá, Adriano. O que você deseja acessar hoje?

ACESSO RÁPIDO
[Preventivos] [Manutenção] [Obra] [Orçamento]

MÓDULOS DO SISTEMA
┌────────┬────────┬────────┬────────┐
│ card   │ card   │ card   │ card   │  (4 col desktop)
│ card   │ card   │ card   │ card   │
│ card   │ card   │        │        │
└────────┴────────┴────────┴────────┘

┌───────────────── Atividade Recente ─────────────────┐  ┌── Pendências ──┐
│ (vazio / dados reais quando disponíveis)             │  │  (placeholder)  │
└──────────────────────────────────────────────────────┘  └────────────────┘
```

---

## 7. Preservação de permissões e links

- **Permissões:** todos os cards e atalhos passam pelo filtro `sectors.includes(sector.id)` já usado hoje. Um módulo bloqueado simplesmente não aparece. Nenhuma checagem nova é adicionada.
- **Links:** `sectorPaths` (mapeamento id → rota) continua sendo a única fonte de rotas; nenhum destino muda. Módulos com `path === '#'` renderizam desabilitados com badge "EM DESENVOLVIMENTO" (mesmo comportamento atual).
- Admin continua acessível via avatar/menu (mantido do `Layout` antigo, movido para dropdown do avatar da sidebar).

---

## 8. Responsividade

- **Desktop / notebook (≥ 1024px):** layout completo, sidebar fixa aberta, grid 4 colunas.
- **Tablet (768–1023px):** sidebar colapsada em ícones; grid 2 colunas; acesso rápido 2×2; blocos inferiores empilhados.
- **Celular (<768px):** sidebar vira drawer (offcanvas do shadcn) com trigger no topbar; grid 1 coluna; acesso rápido em scroll horizontal; blocos inferiores empilhados; topbar reduz breadcrumb para apenas "Visão Geral".

---

## 9. Conteúdo ilustrativo da referência (não inventar)

Esses itens da imagem são **mockup** e não devem ser reproduzidos como se fossem reais:

- "OS #4521 finalizada — Há 12 min", "Nova obra cadastrada — Há 45 min", "Relatório mensal gerado — Há 2 horas" → **não criar**. `RecentActivityCard` fica com estado vazio até termos fonte real.
- "Existem 4 ordens de serviço pendentes de aprovação no módulo de Preventivos" → **número falso**. `PendenciasCard` fica oculto ou com texto genérico sem número até integrarmos.
- Avatar "Adriano Augusto" com foto específica → usar avatar/nome reais de `useProfile` (fallback: iniciais).
- Badge "EM DESENVOLVIMENTO" em Ar-Condicionado/Projetos → manter, pois já corresponde ao estado atual (`path === '#'`).
- Busca "Pesquisar no sistema…" → apenas UI nesta etapa; comportamento a definir depois.
- Sino de notificações → apenas ícone; sem popover real por ora.

---

## 10. Regras respeitadas

- Sem alterações em autenticação, Supabase, RLS, páginas internas dos módulos.
- Nenhum módulo removido; apenas reorganização visual.
- Nenhum dado fictício persistido — placeholders são visuais e claramente vazios.

Aguardando aprovação para implementar.
