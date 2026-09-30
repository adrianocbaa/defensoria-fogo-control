# SiDIF SaaS — Análise Arquitetural e Plano (modelo comercial definido)

## A. Conclusão executiva

O modelo comercial definido (Plano + Módulos + Extras, sem taxa de plataforma separada) é **totalmente compatível** com a arquitetura multi-tenant planejada — mas exige que a camada comercial seja desenhada como um subsistema próprio, separada em quatro conceitos: **pricing** (quanto custa), **subscription** (o que foi contratado), **entitlements** (o que a organização pode usar) e **usage** (quanto está sendo consumido). A proposta anterior (plano simples na tabela `organizacoes`) precisa ser substituída por essa estrutura — era simplificada demais para suportar overrides, versionamento de preços e contratação administrativa.

O SiDIF atual já tem boa parte da base: RLS maduro (431 policies), `user_roles` separado de `profiles`, `user_obra_access` para isolamento por obra (exatamente o que usuários externos precisam), infraestrutura `is_demo` (reaproveitável para trial), e edge functions com padrão de autenticação (`_shared/service-auth.ts`).

---

## B. Arquitetura proposta — entidades

### Camada 1: Tenancy (quem é quem)

**`organizations`** — global (raiz do tenant)
- Finalidade: o órgão cliente (prefeitura, defensoria, etc.)
- Campos: `nome`, `cnpj`, `slug` (para portal público: sidif.com.br/portal/{slug}), `status`, `created_at`
- O órgão atual vira a organização 1; dados existentes recebem esse ID.

**`organization_members`** — por organização
- Finalidade: vínculo usuário ↔ organização, com classificação comercial
- Campos: `organization_id`, `user_id`, `member_type` (`internal` | `external`), `status` (`invited` | `active` | `suspended` | `removed`), `invited_at`, `activated_at`
- Substitui/estende o vínculo implícito atual; `profiles` e `user_roles` passam a ser lidos sempre no contexto de uma organização.

### Camada 2: Catálogo e pricing (global, sem dados de cliente)

**`plans`** — global
- Base, Equipe, Institucional, Enterprise. Campos: `key`, `nome`, `ordem`, `ativo`.

**`plan_versions`** — global, versionada
- Finalidade: congelar o que um plano inclui numa data. Campos: `plan_id`, `valid_from`, `valid_to`, `internal_users_limit`, `external_users_limit`, `storage_limit_bytes`, flags (`sso_enabled`, `api_enabled`, `priority_support`...).
- Reajuste = nova versão, nunca UPDATE na vigente.

**`modules`** — global
- Catálogo: Preventivos, Manutenção, Obras, Almoxarifado, etc. Campos: `key`, `nome`, `ativo`. (A tabela `modules` atual, de visibilidade de núcleos, é outra coisa — renomear conceitualmente para catálogo comercial ou usar nome distinto como `commercial_modules`.)

**`module_tiers`** — global
- Níveis de módulo: Obras→Medição, Obras→Gestão Completa. Campos: `module_id`, `key`, `nome`, `includes_tier_id` (Gestão Completa aponta para Medição — herança, não cumulatividade).

**`price_tables`** — global, versionada
- Campos: `valid_from`, `valid_to`, `status` (`draft` | `active` | `archived`). Nova tabela de preços = novo registro; a anterior é arquivada, não alterada.

**`price_items`** — global, filha de `price_tables`
- Uma linha por combinação: (`plan_id`, null, null) = mensalidade do plano; (`plan_id`, `module_tier_id`, null) = preço do módulo naquele plano; (null, null, `addon_id`) = preço do extra. Campos: `amount_cents` (seguindo a regra do projeto: dinheiro em centavos), `currency`.

**`addons`** — global
- Extras: +100 GB, +250 GB, +500 GB, +1 TB, usuários internos adicionais, externos adicionais. Campos: `key`, `tipo` (`storage` | `internal_users` | `external_users`), `quantidade`, `unidade`.

### Camada 3: Assinatura (por organização)

**`subscriptions`** — por organização
- Campos: `organization_id`, `plan_version_id`, `status` (`trial` | `active` | `past_due` | `suspended` | `cancelled` | `expired`), `billing_cycle` (`monthly` | `yearly`), `started_at`, `current_period_start`, `current_period_end`, `cancelled_at`, `origin` (`manual` | `contract` | `checkout` | `imported`), `contracted_amount_cents` (preço congelado no ato — ver seção N), `external_reference` (nº do contrato administrativo).
- **Uma assinatura ativa por organização** (constraint parcial unique).

**`subscription_items`** — filha de subscription
- O que compõe a assinatura: 1 item do plano + N itens de módulo (com `module_tier_id`) + N itens de addon. Cada item guarda `amount_cents` contratado (cópia do catálogo no momento da contratação) — é isso que preserva grandfathering.

**`subscription_history`** — por organização
- Toda mudança comercial: quem, quando, campo, valor anterior, valor novo, motivo, origem. Imutável (sem UPDATE/DELETE via RLS).

### Camada 4: Entitlements (direitos efetivos — por organização)

**`organization_entitlements`** — por organização, **materializada**
- Uma linha por organização com os direitos efetivos já resolvidos: `can_use_obras`, `can_use_rdo`, `can_use_manutencao`, `can_use_preventivos`, `internal_users_limit`, `external_users_limit`, `storage_limit_bytes`, `sso_enabled`, `api_enabled`...
- **Não é editada diretamente**: é recalculada por função a partir de (plano vigente + itens da assinatura + overrides). O app lê daqui — nunca interpreta plano no frontend.

**`organization_entitlement_overrides`** — por organização
- Exceções contratuais: `key` (ex.: `storage_limit_bytes`), `value`, `motivo`, `valid_from`, `valid_to`, `granted_by`. Prevalecem sobre o plano sem criar plano novo nem mexer em código.

### Camada 5: Usage (consumo — por organização)

**`organization_usage_counters`** — por organização
- Contadores mantidos por trigger: `internal_users_count`, `external_users_count`, `storage_bytes_used`. Atualizados em trigger de `organization_members` e de `storage_objects` (ver seção J). Leitura instantânea para telas e para enforcement.

### O que já existe e é reaproveitado

- `user_roles` + `has_role()` — papéis continuam; ganham escopo por organização.
- `user_obra_access` — já é o isolamento de contratada por obra (seção 9 do documento); mantido.
- `is_demo` — reaproveitado como dados de demonstração dentro de trials.
- `audit_logs` / `obra_action_logs` — padrão de auditoria já existente, espelhado em `subscription_history`.
- 11 buckets de storage — passam a ter prefixo por organização (seção J).

---

## C. Diagrama conceitual

```text
                         ┌──────────────┐
                         │ price_tables │ (versionadas)
                         │ price_items  │
                         └──────┬───────┘
                                │ copia preço no ato da contratação
                                ▼
┌────────────┐   1:1   ┌───────────────┐   1:N   ┌────────────────────┐
│organizations│ ────── │ subscriptions │ ────── │ subscription_items │
└─────┬──────┘         └───────┬───────┘         └────────────────────┘
      │                        │ plan_version_id
      │                        ▼
      │                  plans / plan_versions ── modules ── module_tiers
      │
      ├── organization_members (internal/external, status)
      ├── organization_entitlement_overrides
      ├── organization_entitlements  ◄── recalculada: plano + itens + overrides
      ├── organization_usage_counters
      └── subscription_history (imutável)
```

---

## D. Pricing

- **Preço atual de catálogo:** `price_items` da `price_tables` com `status = active`.
- **Preço histórico:** tabelas anteriores ficam `archived`, intactas.
- **Preço contratado:** copiado para `subscription_items.amount_cents` e somado em `subscriptions.contracted_amount_cents` no ato da contratação. Mudança de catálogo **nunca** toca assinaturas vigentes.
- **Preço negociado por cliente:** o Super Admin edita o `amount_cents` do item da assinatura (registrado em `subscription_history`) — não cria plano novo.
- **Descontos:** item de assinatura com valor negativo (tipo `discount`) ou campo `discount_cents` na subscription.
- **Valores em centavos** (`amount_cents` integer), coerente com a regra financeira do projeto.
- **Nada de preço no frontend:** a página comercial e a tela de contratação leem o catálogo via RPC/view pública de preços ativos.

## E. Entitlements

O backend resolve "o que esta organização pode fazer" assim:

1. Função `recalculate_entitlements(org_id)`: lê `plan_version` da assinatura ativa → aplica itens (módulos/tiers, addons) → aplica overrides válidos → grava em `organization_entitlements`.
2. Disparada por trigger em qualquer mudança de subscription/itens/overrides.
3. App e RLS consultam funções `org_can(org_id, 'rdo')` / `org_limit(org_id, 'storage_bytes')` (SECURITY DEFINER, estáveis) — nunca o nome do plano.
4. Frontend apenas reflete: esconde módulo, mostra barra de uso. A autoridade é o backend (seção 37 do documento).

## F. Usage

- **Usuários:** trigger em `organization_members` mantém contadores por `member_type`. **Recomendação (decisão P2):** contam para o limite usuários `active` + `invited` (convite reserva vaga; evita contorno por convites pendentes). `suspended` e `removed` não contam.
- **Armazenamento:** trigger em `storage.objects` soma/subtrai bytes por organização (derivada do prefixo do path). Recálculo completo sob demanda via job de reconciliação (corrige drift).
- Estratégia híbrida: contadores por trigger (tempo real, barato) + job noturno de reconciliação (fonte da verdade). Escalável e seguro.

## G. Overrides

`organization_entitlement_overrides`: linha por exceção, com vigência opcional e motivo obrigatório. Ex.: `storage_limit_bytes = 750 GB` para um Institucional, `api_enabled = true` para um Equipe. O recálculo de entitlements aplica overrides por cima do plano. Sem migration, sem código, sem plano novo — só INSERT via painel Super Admin, auditado em `subscription_history`.

## H. Obras — Medição vs Gestão Completa

- Um único módulo `obras` com dois tiers em `module_tiers`: `medicao` e `gestao_completa`, onde `gestao_completa.includes_tier_id = medicao`.
- Comercialmente mutuamente exclusivos: a assinatura tem **um** item de tier de Obras (constraint: no máximo 1 item por módulo).
- Entitlements resultantes: Medição → `can_use_obras = true, can_use_rdo = false`; Gestão Completa → ambos `true`.
- Enforcement: RLS/RPCs das tabelas `rdo_*` exigem `org_can(org, 'rdo')`; importação RDO→Medição idem. Frontend nunca exibe "Módulo RDO" — só os dois nomes comerciais.

## I. Segurança (backend como autoridade)

- Todas as tabelas novas: GRANTs + RLS no padrão do projeto. Catálogo (plans, prices, modules): leitura autenticada; escrita só `service_role`/super-admin. Subscriptions/entitlements/overrides/history: leitura para admin da própria organização; escrita só super-admin via função.
- Enforcement de módulo: policies das tabelas do módulo ganham condição `org_can(organizacao_da_linha, '<modulo>')` — aplicada em lote próprio, módulo a módulo, sem tocar nas regras atuais antes da hora.
- Enforcement de limites: `organization_members` rejeita INSERT acima do limite (trigger); upload rejeitado quando `storage_bytes_used + arquivo > limite` (ver J).
- Super-admin: novo papel em `user_roles` (ou flag separada) validado server-side, nunca no client.

## J. Storage

- **Segregação:** prefixo obrigatório `{organization_id}/...` no path de todos os buckets; policies de `storage.objects` validam que o prefixo pertence à organização do usuário.
- **Metadados:** tabela `storage_objects` (organização, uploader, módulo, entidade, bytes, MIME, path) — espelho consultável, pois `storage.objects` é schema reservado e não deve ser modificado; o espelho é alimentado por trigger no upload via edge function de emissão de URL assinada.
- **Limite pré-upload:** uploads passam a usar URL assinada emitida por edge function que verifica `usage + tamanho ≤ limite` antes de liberar. Upload direto do client é bloqueado por policy.
- **S3-compatible futuro:** o espelho `storage_objects` desacopla o app do provedor — a coluna `provider`/`bucket` permite migrar buckets para S3 depois sem mudar o app. Recomendado manter Supabase Storage agora (custo/complexidade) com essa camada de indireção desde o início.

## K. Super Admin

Painel novo (rota `/super-admin`, fora do AdminPanel atual):
- Listar organizações: plano, status, vigência, uso (42/60 internos, 137/300 externos, 386/500 GB), módulos, extras.
- Criar organização + assinatura manual (fluxo de contratação administrativa — seção L).
- Alterar plano, habilitar/remover módulo, adicionar extras, conceder override, definir vigência, suspender/reativar/cancelar.
- Ver `subscription_history` completo.
- Toda ação via funções SECURITY DEFINER que gravam histórico.

## L. Contratação administrativa

A assinatura nasce por `origin = 'manual' | 'contract'`: o Super Admin preenche plano, módulos, capacidade, vigência e referência do contrato; o sistema monta `subscription_items` copiando os preços do catálogo (ou valores negociados), calcula entitlements e ativa a organização. **Nenhum gateway envolvido** — cobrança por boleto/PIX/empenho fora do app, que é o padrão em órgão público.

## M. Futuro gateway (sem acoplamento)

- Assinatura não referencia gateway: apenas `origin` e `external_reference` genéricos.
- Futura integração (Stripe, Mercado Pago, Pagar.me) = edge function de webhook que **cria/atualiza subscriptions e itens pelas mesmas funções internas** usadas pelo Super Admin. O gateway é só mais uma origem.
- Webhook signing secret: segredo compartilhado (fluxo `add_secret`), endpoint publicado antes da configuração.
- Nota: a cobrança integrada da Lovable exige Lovable Cloud; como usamos Supabase externo, a integração será BYO conta do gateway — compatível com este projeto.

## N. Versionamento de preços

- Catálogo versionado (`price_tables` + `price_items`), planos versionados (`plan_versions`).
- Contratação **copia** preços para a assinatura: reajuste de catálogo não altera contratos vigentes (grandfathering natural).
- Reajuste de contrato vigente é ação explícita do Super Admin (nova vigência + histórico), nunca efeito colateral de editar catálogo.

## O. Riscos técnicos

1. **Propagação de `organization_id` em ~106 tabelas e 431 policies** — maior risco; mitigado por lotes por módulo com validação e rollback por lote.
2. **Drift de contadores de usage** — mitigado pelo job de reconciliação.
3. **Trigger em `storage.objects`** — schema reservado: não podemos criar trigger lá; por isso o controle é via edge function de upload assinado + espelho. Uploads antigos precisam de migração de paths.
4. **Recálculo de entitlements em cascata** — função única, idempotente, testável.
5. **Tabela `modules` atual (visibilidade de núcleos) colide em nome com o catálogo comercial** — resolver com nome distinto (`commercial_modules`) para não quebrar o módulo existente.
6. **Usuários com acesso a múltiplas organizações** (futuro) — modelo `organization_members` já suporta; o app assume 1 organização por usuário no início.

## P. Decisões que precisamos tomar

1. **Usuário em mais de uma organização:** confirmar que no lançamento cada usuário pertence a uma única organização (recomendado; multi-org depois).
2. **Contagem para limite:** confirmar que `invited` conta como vaga consumida (recomendado).
3. **Estouro de armazenamento:** bloquear upload ao atingir 100% (recomendado) ou permitir com aviso e cobrança retroativa?
4. **Trial:** duração (sugestão: 14 ou 30 dias) e se trial tem acesso a todos os módulos ou só um conjunto.
5. **Portal público por organização:** confirmar URL `sidif.com.br/portal/{slug}` e que o portal atual vira o da organização 1.
6. **Nome da tabela do catálogo comercial** (`commercial_modules` vs renomear a `modules` atual — mais arriscado).

## Q. Plano de implementação em lotes

```text
Lote 0  — Backup/snapshot e script de verificação de integridade (contagens, somas)
Lote 1  — Catálogo comercial: plans, plan_versions, commercial_modules,
          module_tiers, addons, price_tables, price_items + seed da tabela atual
Lote 2  — Tenancy: organizations, organization_members; órgão atual = org 1;
          organization_id nas tabelas-raiz (obras, nuclei, maintenance_tickets)
Lote 3  — Subscriptions: subscriptions, subscription_items, subscription_history;
          assinatura da org 1 (origem contract, valores atuais)
Lote 4  — Entitlements: organization_entitlements, overrides, função de
          recálculo, funções org_can/org_limit
Lote 5  — Usage: contadores, triggers de members, job de reconciliação
Lote 6  — Propagação de organization_id + RLS por módulo (sub-lotes:
          Obras/Medição → RDO → Manutenção → Preventivos → demais)
Lote 7  — Enforcement de módulos e limites no backend (policies org_can,
          bloqueio de INSERT acima do limite)
Lote 8  — Storage: espelho storage_objects, upload assinado com verificação
          de limite, prefixo por organização, migração de paths
Lote 9  — Super Admin: painel, criação manual de assinatura, overrides, histórico
Lote 10 — Interface comercial: página de planos (lendo catálogo), tela de
          contratação em 4 etapas, trial self-service
Lote 11 — Testes de ponta a ponta (2 organizações de teste, isolamento,
          limites, estouro de storage) + homologação
```

Cada lote: objetivo único, migration reversível, validação com a org 1 em produção antes do próximo — mesmo método dos Lotes 1–12 da auditoria. Lotes 1–5 não mudam nada visível para o usuário atual (só criam estrutura); o risco começa no Lote 6, que será fatiado por módulo.

## Respostas diretas às 12 perguntas finais

1. **Suporta o modelo?** Sim, com a camada comercial proposta (a versão anterior do plano era simples demais).
2. **O que muda na proposta anterior:** plano vira subscription+entitlements; preços saem do código; overrides e versionamento entram.
3. **Tabelas recomendadas:** seção B (16 tabelas em 5 camadas).
4. **Separação:** pricing = catálogo versionado; subscription = contrato; entitlements = direitos materializados; usage = contadores.
5. **Preços históricos:** cópia do preço no item da assinatura + catálogo imutável.
6. **Exceções:** tabela de overrides com vigência e motivo, sem plano novo.
7. **Controle no backend:** funções `org_can`/`org_limit` em RLS, triggers e edge functions.
8. **Obras:** um módulo, dois tiers, Gestão Completa inclui Medição, exclusivos por constraint.
9. **Medição de uso:** triggers + job de reconciliação (híbrido).
10. **Contratação administrativa e gateway:** assinatura agnóstica de origem; gateway futuro é só mais uma origem via webhook.
11. **Decisões pendentes:** seção P (6 itens).
12. **Primeiro lote:** Lote 0 (backup/verificação) seguido do Lote 1 (catálogo comercial, invisível ao usuário, risco zero).
