
# ETAPA 1 — Auditoria do Módulo Manutenção

Nenhum arquivo foi alterado. Este é o levantamento solicitado antes de aplicar o novo layout do Figma. Aguarde aprovação para seguir para a Etapa 2 (implementação visual controlada).

## 1. Estrutura atual

- **Rota:** `/maintenance` → `src/pages/Maintenance.tsx`
- **Shell atual:** `SimpleHeader` (header verde antigo) + `<aside>` própria de 256px + `<main>` com `MaintenanceDashboard`. Mobile usa `Sheet` com o mesmo sidebar.
- **Roteamento interno:** feito por `activeSection` (state) e `if` em `MaintenanceDashboard.tsx`. Não há sub-rotas reais.
- **Sidebar:** `MaintenanceSidebar.tsx` — lista estática de 11 itens (`overview`, `tickets`, `travel`, `service-orders`, `contracts`, `inventory`, `preventive`, `history`, `reports`, `settings`, `test`).
- **Dashboard (Visão Geral):** KPIs 100% mockados (12/24/3/85%), + `MaintenanceTimeline`, `MaintenanceMap` e "Atividades Recentes" (também mock).
- **Kanban:** `KanbanBoard.tsx` — colunas Pendente / Em andamento / Impedido / Concluído com drag-and-drop nativo HTML5, filtro por servidor, Realtime.
- **Lista de chamados:** não existe hoje (só Kanban).
- **Detalhes:** `TicketDetailsSheet.tsx` (Sheet lateral). Modais: `CreateTaskModal`, `EditTaskModal`, `ViewTaskModal`.
- **Serviços internos:** `TicketServicesEditor.tsx` + `useTicketServices` — IDs temporários e persistência sequencial (já corrigido em ciclos anteriores).
- **Fotos:** `TaskPhotoUploader.tsx` — dois fluxos (`reference_photos`, `execution_photos`), fila com progresso, marca d'água, normalização HEIC→JPEG.
- **Viagens:** `TravelCalendar.tsx` + `CreateTravelModal`/`EditTravelModal`/`ViewTravelModal`. Limite via `useTravelDaysUsage` e `TravelLimitConfirmDialog`.
- **Impedimentos:** `ImpedimentReasonDialog` + `TicketImpedimentsHistory` + `useTicketImpediments`.
- **Histórico:** `TicketStatusHistory` (dentro do drawer) alimentado por `maintenance_ticket_status_history`.
- **Ordens de Serviço / Contratos / Preventivas / Histórico (menu) / Test:** hoje exibem placeholder "em desenvolvimento" no próprio `MaintenanceDashboard`.
- **Relatórios:** `MaintenanceReports.tsx` (real, com finalizados).
- **Configurações:** `MaintenanceSettings.tsx` (real).
- **Inventário:** rotas `inventory`, `materials-list`, `stock-movement`, `stock-report`, `notifications` já renderizam componentes reais em `src/components/inventory/*`. **Não** são placeholder.

## 2. Componentes / hooks principais

| Item | Papel |
|---|---|
| `Maintenance.tsx` | Shell antigo (SimpleHeader + aside custom). |
| `MaintenanceSidebar` | Navegação estática por `activeSection`. |
| `MaintenanceDashboard` | Roteador interno + Visão Geral mockada. |
| `KanbanBoard` | 4 colunas, DnD HTML5, Realtime, filtro por servidor, regras por perfil. |
| `TicketDetailsSheet` | Sheet com todas as seções empilhadas (sem tabs). |
| `CreateTaskModal` / `EditTaskModal` | Fluxo multi-step atual de chamado. |
| `TicketServicesEditor` | Serviços internos com IDs temp + viagens vinculadas. |
| `TaskPhotoUploader` | Upload com fila, HEIC→JPEG, watermark, retry. |
| `TravelCalendar` | Calendário mensal de viagens. |
| `ImpedimentReasonDialog` / `TicketImpedimentsHistory` | Fluxo de impedimento. |
| `TicketStatusHistory` | Timeline de movimentações. |
| `useMaintenanceTickets` | Fetch + Realtime (debounce 250ms) + CRUD + `finalizeTicket`. |
| `useTicketServices` | CRUD de serviços internos. |
| `useMaintenanceManagers` / `useMaintenanceUsers` / `useMaintenanceTypes` | Suporte de listas. |
| `useTravelDaysUsage` | Controle de diárias por servidor/mês. |

## 3. Regras a preservar (obrigatório)

- RLS de `maintenance_tickets` (criador + `manager_ids`) e do bucket `documents`.
- Realtime dos canais `maintenance_tickets` e `maintenance_ticket_services` com debounce de 250ms.
- Regras de movimentação Kanban: GM pode mover em todas as colunas, admin/fiscal concluem.
- Fluxo `finalizeTicket` (arquivamento fora do Kanban).
- Upload: buckets, marca d'água, HEIC→JPEG, fila, retry — **sem alteração**.
- IDs temporários e persistência sequencial em serviços/viagens.
- `useTravelDaysUsage` e limites de diárias — sem alteração de fórmula.

## 4. Comparação Figma × Sistema atual

| Referência Figma | Estado atual | Como preservar |
|---|---|---|
| `visao-geral-manutencao-desktop.png` (central operacional com "Requer atenção", "Minha fila", carga da equipe, próximas viagens, mapa, atividade) | KPIs mockados + Timeline + Map + activity mockada | Reconstruir Visão Geral consumindo `useMaintenanceTickets`. Blocos sem fonte real ficam com estado "Dados ainda não disponíveis". |
| `kanban-desktop.png` / `kanban-filtros-ativos.png` | `KanbanBoard` HTML5 DnD, filtro por servidor | Recapear visual dos cards/colunas, adicionar chips de filtros ativos. DnD mantido (dnd-kit **não** autorizado). |
| `kanban-mobile.png` | Sheet + Kanban horizontal | Adicionar seletor de coluna + menu "Mover para" reutilizando handler `handleStatusChange`. |
| `lista-chamados.png` | Não existe | Novo componente `TicketListView` alimentado pela mesma store de tickets (client-side). Toggle Kanban/Lista como estado interno. |
| `drawer-*.png` (Visão Geral, Serviços, Fotos) | `TicketDetailsSheet` empilhado | Recompor em tabs (Visão Geral / Serviços / Fotos / Impedimentos / Histórico) sem trocar hooks. |
| `novo-chamado-etapa1/2.png` | Fluxo multi-step atual em `CreateTaskModal`/`EditTaskModal` | Preservar todas as etapas atuais (mesmo se Figma sugere só 2). Restilizar. |
| `viagens-calendario.png` / `viagens-lista-drawer.png` / `nova-viagem-modal.png` | `TravelCalendar` + modais | Adicionar toggle Mês/Lista; drawer lateral por dia; restilizar modais. Semana **não** implementar sem aprovação. |
| `preventivas.png` | Placeholder "em desenvolvimento" | **Bloqueio de auditoria:** hoje não há tabela nem hook de preventivas. Requer decisão (ver §6). |
| `historico.png` | `useAuditLogs`? / não há tela dedicada de manutenção | Nova tela consumindo `maintenance_ticket_status_history` + impedimentos. |
| `relatorios.png` | `MaintenanceReports.tsx` real | Restilizar preservando queries e signed URLs. |
| `configuracoes.png` | `MaintenanceSettings.tsx` real | Restilizar em seções, sem novos campos. |
| `responsive-showcase.png` | Parcial (Sheet mobile ok, Kanban mobile ruim) | Aplicar breakpoints padrão + drawers full-screen no mobile. |
| Ordens / Contratos / Fornecedores / Estoque | Placeholders + **Inventário funcional real** | Ver §6 (conflito com Inventário). |

## 5. Melhorias apenas visuais (autorizadas)

- Sidebar verde compartilhada (`ObrasLayout` ou equivalente já usado em Obras/RDO) substituindo `SimpleHeader`+aside custom.
- Novo card de ticket, chips de filtro, tabs no drawer, lightbox de fotos, estados skeleton/vazio/erro, indicador de Realtime, menu "Mover para" no mobile, toggle Kanban/Lista, toggle Mês/Lista em viagens.

## 6. Itens que exigem sua decisão antes de eu começar

1. **Layout compartilhado — qual usar?** O SiDIF hoje tem `ObrasLayout` (usado em Obras e RDO) com sidebar verde. Devo reutilizá-lo como shell da Manutenção, adicionando um `MaintenanceSidebar` novo dentro dele? (recomendo sim)
2. **Inventário (`inventory`, `materials-list`, `stock-movement`, `stock-report`, `notifications`):** hoje são **funcionais**, não placeholder. O prompt manda desabilitar "Estoque/Inventário" no menu. Confirma que devo **apenas ocultar do novo menu** (com badge "Em desenvolvimento" nos itens equivalentes) e **preservar rotas/componentes existentes** intocados?
3. **Preventivas:** hoje é só placeholder. O Figma mostra tela completa. Devo (a) manter placeholder com badge "Em desenvolvimento" (mais seguro, sem inventar tabela), ou (b) implementar uma tela vazia com estrutura visual esperando futura tabela?
4. **Histórico de Atendimentos:** posso criar a página consumindo `maintenance_ticket_status_history` + `maintenance_ticket_impediments` (já existentes), sem novas tabelas?
5. **Visão Geral — blocos sem fonte real** ("Carga da equipe", "Comprovações pendentes", "Requer atenção"). Devo derivar por regras client-side sobre `useMaintenanceTickets` (ex.: atrasado = `!finalized && created_at > X dias sem update`), ou marcar como "Dados ainda não disponíveis" até você definir as regras?
6. **Rota vs. estado interno:** manter tudo em `/maintenance` com `activeSection`, ou promover para sub-rotas (`/maintenance/kanban`, `/maintenance/viagens`, etc.)? Sub-rotas dão breadcrumbs reais e deep-link, mas exigem tocar em `App.tsx`.

## 7. Fora de escopo (confirmado)

- Não mexer em: RLS, buckets, edge functions, upload, HEIC, marca d'água, fórmulas de diárias, DnD (não trocar por dnd-kit), Realtime, fluxo de finalização.
- Ordens de Serviço, Contratos, Fornecedores, Estoque/Materiais/Movimentações: **não implementar** — apenas item desabilitado no menu.

---

**Aguardo suas respostas para os 6 pontos do §6 antes de iniciar a implementação.**
