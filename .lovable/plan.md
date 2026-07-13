## Objetivo

Cada tarefa de manutenção só aparece no kanban para os usuários que foram citados como responsáveis nela (nas 4 colunas). Admin continua vendo tudo. Fiscais podem ser marcados no cadastro de usuário para virar candidatos a responsáveis. E um filtro no topo do kanban permite escolher qual servidor visualizar.

## 1. Ligar `maintenance_managers` a usuários reais

Hoje `maintenance_managers` (nome, email, ordem) é uma tabela solta — não referencia `auth.users`. Sem esse elo é impossível filtrar por `auth.uid()`.

- Adicionar coluna `user_id uuid` (nullable, FK para `auth.users`) em `maintenance_managers`.
- Tela de configurações de manutenção passa a permitir vincular cada gerente a um usuário do sistema.
- Gerentes sem `user_id` continuam existindo (compatibilidade), mas não geram restrição de visibilidade — só quem tem `user_id` conta pra filtragem.

## 2. Flag "Responsável pela Manutenção" no perfil

- Adicionar `is_maintenance_responsible boolean default false` em `public.profiles`.
- No painel admin de usuários (`AdminPanel.tsx`), um checkbox "Responsável pela Manutenção / Fiscal" ao editar usuário.
- Usuários com essa flag ficam disponíveis para vincular a `maintenance_managers.user_id` (servidores da manutenção OU fiscais setoriais). Assim tanto servidor quanto fiscal são atribuíveis a uma tarefa pelo mesmo caminho.

## 3. RLS de `maintenance_tickets`

Substituir a policy SELECT `can_edit()` por:

```
is_admin(auth.uid())
OR EXISTS (
  SELECT 1 FROM maintenance_managers m
  WHERE m.id = ANY(maintenance_tickets.manager_ids)
    AND m.user_id = auth.uid()
)
OR user_id = auth.uid()  -- criador vê a própria (fallback)
```

Envolver em função `security definer` (`can_view_maintenance_ticket(ticket_id, user_id)`) para performance/reuso. Policies de UPDATE/DELETE mantidas em `can_edit()` para não travar edição por admin/coordenação — só o SELECT muda.

## 4. Filtro por servidor no Kanban

Acima das 4 colunas, um `Select` "Servidor: [Todos ▾]" listando apenas gerentes que aparecem em pelo menos uma tarefa não-finalizada visível. Ao escolher um servidor, filtra client-side os cards pelos que contêm esse `manager_id` em `manager_ids`. Default = "Todos" (respeitando o que a RLS já retornou).

## 5. Card no kanban

Continua aparecendo uma vez por tarefa, mesmo com múltiplos responsáveis (como já é hoje). Sem duplicação.

## Arquivos afetados

- **Migration** (schema + RLS + grants)
- `src/components/MaintenanceSettings.tsx` — vincular usuário ao maintenance_manager
- `src/pages/AdminPanel.tsx` — checkbox "Responsável pela Manutenção"
- `src/components/KanbanBoard.tsx` — filtro de servidor no topo
- `src/hooks/useMaintenanceManagers.ts` — expor `user_id`
- `src/integrations/supabase/types.ts` — regenerado automaticamente após migration

## Fora do escopo

- Não altero layout do kanban nem dos cards.
- Não mexo em `maintenance_ticket_services.manager_id/manager_ids` (serviços internos) — só a visibilidade da tarefa.
- Não altero permissão de edição — apenas quem vê.

Confirma que posso executar assim?
