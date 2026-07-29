# Melhoria do fluxo de manutenção por e-mail

Implementação em 4 blocos, na ordem **b → a → c → d** (o thread é fundação para os outros três).

---

## Bloco 1 — Threading `[MNT #NNNN]` (item b)

**Schema**

- Nova tabela `maintenance_ticket_emails`: `ticket_id`, `direction` (`inbound`/`outbound`), `from_addr`, `to_addrs[]`, `subject`, `body_text`, `body_html`, `message_id`, `in_reply_to`, `attachments jsonb`, `received_at`.
- Em `maintenance_tickets`: já existe `ticket_number` (auto). Vamos usá-lo como chave do thread.
- Índice único em `message_id` para deduplicação.

**Edge function `inbound-maintenance-email` (extensão)**

- Antes de criar nova tarefa: extrair `#NNNN` do subject/in-reply-to.
- Se casar com `ticket_number` existente → grava só em `maintenance_ticket_emails` (não cria nova tarefa) e reabre se estiver em "Concluído".
- Se não casar → cria tarefa **e** grava o primeiro e-mail na tabela de thread.

**Envios (nova função `send-maintenance-email`)**

- Wrapper sobre Resend com from `chamados@sidif.com.br`.
- Sempre prefixa subject com `[MNT #NNNN]`.
- Grava a saída em `maintenance_ticket_emails` (direction=outbound).

**UI**

- Dentro do `TicketDetailsSheet`, nova aba/seção "Conversa": lista o primeiro inbound + as respostas do solicitante + os e-mails automáticos enviados pelo sistema.

---

## Bloco 2 — Rascunhos com revisão obrigatória (item a)

**Schema**

- Coluna `is_draft boolean default false` em `maintenance_tickets`.
- Tarefas criadas por e-mail entram com `is_draft = true`.

**UI**

- Card no Kanban: badge amarelo "Rascunho — revisar" quando `is_draft`.
- Clique no card de rascunho → abre modal `ReviewDraftModal` (obrigatório): confirmar/ajustar título, prioridade, núcleo, servidor responsável. Botão "Publicar" seta `is_draft = false`. Sem botão de fechar sem publicar (só cancela e mantém rascunho).
- Rascunhos ficam visíveis só para admins/responsáveis de manutenção (RLS já cobre).

---

## Bloco 3 — Confirmação do solicitante (item c)

**Schema**

- Colunas em `maintenance_tickets`: `confirmation_token uuid`, `confirmation_sent_at`, `confirmation_reminder_sent_at`, `confirmed_at`, `confirmed_source` (`solicitante`/`auto`).

**Fluxo**

- Ao mover para "Concluído": trigger dispara envio automático de e-mail via `send-maintenance-email` com link único `https://sidif.lovable.app/confirmacao/{token}`.
- Página pública nova `/confirmacao/:token` (sem login): mostra resumo do chamado + fotos de execução + botão "Confirmar serviço executado".
- Ao confirmar: tarefa vira `finalized_at = now()`, `confirmed_source = 'solicitante'`, gera PDF (Bloco 4) e anexa.

**Cron (7 dias)**

- Nova edge function `check-maintenance-confirmations` agendada via `pg_cron` (diária).
- Se `confirmation_sent_at` > 3 dias e sem `confirmation_reminder_sent_at` → envia lembrete corporativo ("Prezado(a), consta em nossos sistemas... solicitamos gentileza confirmar... caso não haja manifestação em até 4 dias, a solicitação será considerada tacitamente atendida...").
- Se `confirmation_sent_at` > 7 dias → auto-finaliza com `confirmed_source = 'auto'`, gera PDF e arquiva.

---

## Bloco 4 — PDF de arquivamento (item d)

**Edge function `generate-maintenance-ticket-pdf**`

- Renderiza: cabeçalho (nº chamado, núcleo, datas, prioridade), thread completo (inbound + outbound + respostas), fotos de referência **e** fotos de execução embutidas, histórico de status, nota de finalização.
- Salva no bucket `documents` em `maintenance-archive/{ticket_id}/chamado-{ticket_number}.pdf`.
- Grava `archive_pdf_url` na tabela.
- Chamada quando: solicitante confirma OU cron auto-finaliza OU responsável clica manualmente "Gerar PDF" em tarefas já finalizadas.

**Bloco 4b — Opcional (fica para depois se você quiser)**

- Mover e-mail original para pasta IMAP "MANUTENÇÕES REALIZADAS/2026" — depende de credenciais IMAP externas; não incluído nesta rodada.

---

## Detalhes técnicos

**Migrations em ordem**

1. `maintenance_ticket_emails` + índices + RLS + GRANTs.
2. Colunas novas em `maintenance_tickets` (`is_draft`, `confirmation_*`, `archive_pdf_url`).
3. Trigger `on_ticket_concluido_send_confirmation` que insere um job leve numa fila (tabela `maintenance_ticket_email_outbox`) processada pelo cron (evita chamar HTTP dentro de trigger).
4. Cron `pg_cron` diário chamando `check-maintenance-confirmations`.

**Edge functions novas**

- `send-maintenance-email` (wrapper Resend + grava thread)
- `inbound-maintenance-email` (estender: thread + rascunho)
- `check-maintenance-confirmations` (cron: lembrete + auto-finalização)
- `generate-maintenance-ticket-pdf`

**Secrets já existentes:** `RESEND_API_KEY` ✅.

**UI nova**

- `ReviewDraftModal.tsx`
- Aba "Conversa" dentro do `TicketDetailsSheet`
- Página pública `/confirmacao/:token` (`PublicMaintenanceConfirmation.tsx`)
- Badge "Rascunho" no card do Kanban

---

## Escopo desta rodada

Vou implementar tudo (Blocos 1–4), pois cada um depende do anterior. O Bloco 4b (mover e-mail via IMAP) fica para depois porque exige credenciais que não temos.

&nbsp;