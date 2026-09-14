# SiDIF — Lote 1 (`public.profiles`) — Preparação do ambiente isolado de homologação

Documento de **roteiro**. Nada aqui foi executado. Nenhum projeto foi criado, nenhuma
credencial foi solicitada, nenhuma migration foi aplicada, nenhum teste foi rodado.

Projeto de produção (**proibido** neste fluxo): `mmumfgxngzaivvyqfbed`.

---

## 1. Pré-requisitos

1. Um projeto Supabase **novo**, vazio, em organização/ambiente separado da produção.
2. Acesso restrito à equipe responsável pelos testes (nenhum usuário institucional).
3. Deno instalado localmente (a suíte roda em `deno test`).
4. As quatro variáveis de ambiente de homologação cadastradas (seção 7).
5. Nenhuma chave real de Resend, ElevenLabs, Lovable AI ou qualquer integração paga
   configurada no projeto isolado.

> A `HOMOLOG_SERVICE_ROLE_KEY` **nunca** deve ser escrita em arquivo, commit, log,
> print ou resposta de chat. Apenas como secret protegido / variável de ambiente local.

---

## 2. Dependências necessárias para a migration funcionar

Levantadas diretamente de `profiles_lote1_v3.sql`, `profiles_lote1_qa_homolog.sql`,
`profiles_lote1_v3_rollback.sql` e `tests/homolog/profiles_lote1_test.ts`.

### 2.1 Tipos

| Objeto | Uso |
|---|---|
| `public.user_role` (enum) | coluna `profiles.role`, parâmetro de `has_role()`, coluna `user_roles.role`; a guarda faz cast `'viewer'::user_role` |
| `public.sector_type` (enum) | coluna `profiles.sectors` (default `ARRAY['nucleos'::sector_type]`) |

### 2.2 Tabelas

| Tabela | Papel | Colunas exigidas pelo pacote |
|---|---|---|
| `public.profiles` | alvo do Lote 1 | `id`, `user_id`, `created_at`, `updated_at`, `display_name`, `email`, `role`, `is_active`, `is_maintenance_responsible`, `force_password_change`, `empresa_id`, `setores_atuantes`, `sectors` |
| `public.user_roles` | fonte de verdade de papel administrativo (lida por `has_role`) | `user_id`, `role` |
| `public.audit_logs` | destino da auditoria | `table_name`, `record_id`, `operation`, `old_values`, `new_values`, `changed_fields`, `user_id`, `user_email` |
| `auth.users` | identidade; a auditoria lê `email` | gerenciada pelo Supabase |

`profiles.empresa_id` referencia `public.empresas` em produção. No ambiente isolado
existem duas saídas válidas: criar `empresas` vazia (recomendado, mantém o schema fiel)
ou manter `empresa_id` sem FK. A suíte nunca grava um `empresa_id` real.

### 2.3 Funções

| Função | Necessária para |
|---|---|
| `public.is_admin(uuid)` | guarda + policies de UPDATE de admin |
| `public.has_role(uuid, user_role)` | chamada interna de `is_admin` |
| `public.handle_new_user()` | criação automática do perfil ao criar usuário (setup da suíte) |
| `public.update_updated_at_column()` | trigger preexistente `update_profiles_updated_at` |
| `auth.uid()`, `auth.jwt()` | identidade do executor na guarda, na auditoria e em `qa_teardown` |

### 2.4 Triggers

| Trigger | Onde | Origem |
|---|---|---|
| trigger de `auth.users` que executa `public.handle_new_user()` | `auth.users` | **pré-requisito do ambiente** — sem ele os perfis não são criados e a suíte falha no setup |
| `update_profiles_updated_at` | `public.profiles` | preexistente |
| `profiles_guard_privileged_columns_trg` | `public.profiles` | criado pela migration |
| `profiles_audit_privileged_changes_trg` | `public.profiles` | criado pela migration |

### 2.5 Policies e grants

- RLS **habilitada** em `public.profiles`.
- Policies preexistentes de SELECT (própria + admin) e a policy de bloqueio anônimo,
  no mesmo formato da produção — a migration recria apenas as de UPDATE e remove a de INSERT.
- Roles `anon`, `authenticated`, `service_role` existentes (padrão Supabase).
- Estado de grants **antes** da migration igual ao de produção (`arwdDxtm` para
  `anon`/`authenticated`/`service_role`), caso contrário o rollback não pode ser
  comparado com fidelidade.
- `public.user_roles` e `public.audit_logs` com seus grants próprios, pois a suíte
  grava e limpa registros nelas via `service_role`.

### 2.6 Extensões

- `pgcrypto` — **NÃO CONFIRMADO como obrigatória**: os defaults usam `gen_random_uuid()`,
  que é nativa a partir do PostgreSQL 13. Se o schema do ambiente for restaurado de um
  dump, a extensão virá junto; se as migrations forem aplicadas, habilitar `pgcrypto`
  no schema `extensions` é inofensivo e evita falha em defaults legados.
- `unaccent` (schema `extensions`) — não usada pelo Lote 1; só é necessária se o schema
  completo for restaurado.

---

## 3. Checklist do projeto isolado

- [ ] Projeto Supabase novo, criado exclusivamente para homologação do Lote 1.
- [ ] Nenhum dado institucional (obras, medições, RDO, empresas, núcleos, tickets).
- [ ] Nenhum usuário real — somente as fixtures criadas e removidas pela suíte.
- [ ] Nenhum cron job ativo (`cron.job` vazio).
- [ ] Nenhum webhook apontando para produção ou para serviços reais.
- [ ] Nenhuma chave real de Resend, ElevenLabs ou Lovable AI cadastrada.
- [ ] Nenhum bucket de Storage copiado de produção.
- [ ] Nenhuma Edge Function de produção implantada (o pacote não as utiliza).
- [ ] Acesso ao painel restrito à equipe de testes.
- [ ] Envio de e-mail de autenticação desabilitado ou sem provedor real.
- [ ] Confirmação escrita de que a URL do projeto **não** contém `mmumfgxngzaivvyqfbed`.

---

## 4. Duas formas de preparar o schema

### Opção A — Restaurar dump *schema-only* autorizado

`pg_dump --schema-only` da produção, com autorização formal, restaurado no projeto isolado.

- Vantagem: traz tipos, tabelas, funções, triggers, policies, grants e defaults exatamente
  como em produção, inclusive as 46 funções dependentes.
- Risco: um dump abrangente pode arrastar objetos indesejados (crons, webhooks, funções de
  integração). Exige revisão do arquivo antes de restaurar e desativação de crons depois.
- **Atenção — o dump schema-only NÃO garante a exportação do trigger de `auth.users`.**
  Triggers de tabelas do schema `auth` (gerenciado pelo Supabase) podem ser omitidos do
  dump ou falhar silenciosamente na restauração. Após restaurar, é **obrigatório**
  confirmar a existência do trigger que chama `handle_new_user()` (verificação 5.1 do
  preflight / P2 da seção 6). Se ele estiver ausente, recriá-lo manualmente antes de
  qualquer teste.
- **Qualquer definição de função com referência à produção deve ser revisada antes da
  execução.** O preflight verifica `pg_proc.prosrc` em busca de `mmumfgxngzaivvyqfbed`,
  URLs de integrações pagas e chamadas webhook/http (verificações 8.2–8.5). Toda
  ocorrência precisa ser removida ou neutralizada no ambiente isolado antes de aplicar
  a migration.

### Opção B — Aplicar as migrations necessárias em ordem

Aplicar as migrations do repositório, sem qualquer cópia de dados.

- Vantagem: nenhum conteúdo institucional pode vazar por acidente.
- Risco: o schema é reconstruído por um caminho histórico longo; qualquer objeto criado
  fora do versionamento (o trigger de `auth.users` em particular, que vive num schema
  gerenciado pelo Supabase) pode **não** existir no destino.

### Recomendação

**Opção A (dump schema-only, revisado), seguida do preflight completo.**
É a única forma que garante, sem reconstrução manual, que `handle_new_user()` e todas as
funções dependentes (`is_admin`, `has_role`, `update_updated_at_column`) existam com as
mesmas assinaturas e o mesmo `search_path`. Tanto na Opção A quanto na Opção B, o trigger
de `auth.users` precisa ser **confirmado após a restauração** — e, se ausente, recriado
explicitamente — antes de qualquer teste.

Em ambos os casos: **nenhuma linha de dado institucional** deve ser restaurada.

---

## 5. Ordem de configuração

1. Criar o projeto isolado e anotar a URL (conferir que não é a de produção).
2. Preparar o schema pela Opção A ou B.
3. Desativar crons, webhooks e provedores de e-mail.
4. Rodar o **preflight** `docs/lote1/profiles_lote1_preflight_homolog.sql` no SQL Editor
   do projeto isolado e registrar todas as saídas. O arquivo é somente leitura e marca
   cada verificação como OK / FALHA / ATENÇÃO.
5. **Critério de passagem: o preflight deve passar antes da aplicação de
   `profiles_lote1_v3.sql`.** Qualquer FALHA impede a migration; qualquer ATENÇÃO exige
   revisão manual documentada antes de prosseguir.
6. Aplicar, no SQL Editor do projeto isolado, `docs/lote1/profiles_lote1_v3.sql`.
7. Aplicar `docs/lote1/profiles_lote1_qa_homolog.sql`.
8. Executar as consultas V1–V6 do mesmo arquivo e registrar as saídas.
9. Cadastrar as quatro variáveis (seção 7).
10. Executar a suíte: `deno test --allow-net --allow-env tests/homolog/profiles_lote1_test.ts`.
11. Conferir que `qa_current_role()` e `qa_teardown()` não existem mais.
12. Em caso de falha crítica: interromper, registrar o erro e, se preciso, aplicar
    `docs/lote1/profiles_lote1_v3_rollback.sql`.

Todos os comandos SQL rodam no **SQL Editor** do projeto isolado. O pacote não usa `psql`,
portanto **não** é necessária nenhuma variável de conexão direta ao banco.

---

## 6. Verificações antes da migration (somente leitura)

```sql
-- P1 — O projeto não é produção (comparar com a URL do painel: não pode conter
--      'mmumfgxngzaivvyqfbed'). Identificador interno do banco:
SELECT current_database(), inet_server_addr();

-- P2 — Trigger de auth.users que chama handle_new_user (OBRIGATÓRIO).
SELECT tgname, pg_get_triggerdef(oid)
  FROM pg_trigger
 WHERE tgrelid = 'auth.users'::regclass AND NOT tgisinternal;

-- P3 — Funções exigidas pela migration existem.
SELECT p.proname, p.prosecdef
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname IN ('is_admin','has_role','handle_new_user','update_updated_at_column');

-- P4 — Tipos e tabelas exigidos existem.
SELECT to_regtype('public.user_role'), to_regtype('public.sector_type'),
       to_regclass('public.profiles'), to_regclass('public.user_roles'),
       to_regclass('public.audit_logs');

-- P5 — Estado inicial de RLS e grants em profiles (base para comparar o rollback).
SELECT relrowsecurity, relforcerowsecurity, relacl
  FROM pg_class WHERE oid = 'public.profiles'::regclass;

-- P6 — Nenhum cron ativo.
SELECT jobid, jobname, schedule, active FROM cron.job;

-- P7 — Nenhum dado institucional.
SELECT (SELECT count(*) FROM public.profiles)   AS profiles,
       (SELECT count(*) FROM public.user_roles) AS user_roles,
       (SELECT count(*) FROM public.audit_logs) AS audit_logs,
       (SELECT count(*) FROM auth.users)        AS usuarios;
-- Esperado: todos zero (ou apenas fixtures de teste anteriores).
```

Critério de parada: se **P2** não retornar o trigger de `handle_new_user`, ou se **P6/P7**
indicarem crons ativos ou dados institucionais, **não aplicar a migration**.

---

## 7. Cadastro das quatro variáveis

Valores obtidos no painel do **projeto isolado** (Settings → API):

```
HOMOLOG_SUPABASE_URL=https://<ref-do-projeto-isolado>.supabase.co
HOMOLOG_ANON_KEY=<anon/publishable key do projeto isolado>
HOMOLOG_SERVICE_ROLE_KEY=<service role key — NUNCA registrar em arquivo ou log>
HOMOLOG_CONFIRMO_AMBIENTE_ISOLADO=SIM
```

Regras:

- Exportar as quatro na sessão de terminal que roda `deno test`, ou cadastrá-las como
  secrets protegidos no cofre da equipe. Não criar `.env` versionado.
- A `HOMOLOG_SERVICE_ROLE_KEY` é secret protegido: não aparece em commits, logs,
  capturas de tela, relatórios ou respostas de chat.
- A suíte aborta sozinha se qualquer variável faltar, se a confirmação não for exatamente
  `SIM`, ou se a URL contiver `mmumfgxngzaivvyqfbed`.
- A chave de serviço é usada pela suíte **apenas** para criar/remover fixtures e chamar
  `qa_teardown`; todas as asserções de autorização usam tokens de viewer, admin,
  contratada, demo e anon.

---

## 8. Situação atual

Projeto isolado: **não existe**. Credenciais: **não fornecidas**.
Migration, SQL de apoio e suíte: **não executados**.
Produção: **não tocada**.
