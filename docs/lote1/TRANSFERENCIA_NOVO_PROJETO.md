# SiDIF — Transferência do pacote de homologação para um novo projeto Lovable

Nada aqui autoriza executar migration, SQL ou testes. Este documento apenas
organiza a entrega.

## 1. Arquivos do pacote

| Arquivo | Função |
| --- | --- |
| `docs/lote1/homolog_base_schema.sql` | Estrutura-base (estado ANTERIOR ao Lote 1) — **incompleto**, ver bloco 7 |
| `docs/lote1/extrair_definicoes_autorizacao.sql` | Consultas de leitura para completar o bloco 7 |
| `docs/lote1/profiles_lote1_preflight_homolog.sql` | Preflight do ambiente isolado |
| `docs/lote1/profiles_lote1_v3.sql` | Migration do Lote 1 |
| `docs/lote1/profiles_lote1_qa_homolog.sql` | Apoio de homologação (funções temporárias + V1–V6) |
| `docs/lote1/profiles_lote1_v3_rollback.sql` | Reversão |
| `tests/homolog/profiles_lote1_test.ts` | Suíte Deno (etapas 00–20) |
| `docs/lote1/HOMOLOG_SETUP.md` | Roteiro completo de configuração |

## 2. Impedimento concreto (bloqueia a homologação)

O repositório **não contém** as definições reais de:

- tabela `public.user_roles`;
- função `public.has_role(uuid, public.user_role)`;
- versão atual de `public.is_admin(uuid)` — a única versão versionada lê
  `public.profiles.role`, e não `user_roles`.

Sem elas a estrutura-base fica incompleta e o Lote 1 não pode ser homologado
com fidelidade. Não foram inventadas versões simplificadas, por instrução expressa.

**Ação manual necessária:** abrir o SQL Editor do projeto SiDIF atual, executar
`docs/lote1/extrair_definicoes_autorizacao.sql` (somente leitura) e colar o
resultado no bloco 7 de `homolog_base_schema.sql`.

## 3. Maneira mais simples de levar os arquivos ao novo projeto Lovable

A forma suportada mais simples, sem depender de terminal:

1. No projeto SiDIF atual, use **GitHub → Connect/Sync** (se já sincronizado,
   o repositório já contém estes arquivos).
2. Crie o **novo projeto Lovable** e, na criação, escolha importar do mesmo
   repositório GitHub — os arquivos de `docs/lote1/` e `tests/homolog/` vão junto.
3. No novo projeto, conecte **apenas** o Supabase `sidif-homologacao`.

Alternativa sem GitHub (igualmente suportada): abrir o novo projeto Lovable e
enviar os 7 arquivos por upload no chat, pedindo que sejam gravados em
`docs/lote1/` e `tests/homolog/`.

Em nenhuma das opções copie `.env`, secrets, dados ou arquivos de Storage.

## 4. Prompt curto de continuidade (colar no novo chat)

> Este projeto é exclusivamente o ambiente de homologação do Lote 1 do SiDIF
> (`public.profiles`). Está conectado ao Supabase isolado `sidif-homologacao`.
> Nunca acesse o projeto de produção `mmumfgxngzaivvyqfbed`.
> Os arquivos do pacote estão em `docs/lote1/` e `tests/homolog/`.
> Ordem prevista: (1) completar o bloco 7 de `homolog_base_schema.sql` com as
> definições reais de `user_roles`, `has_role` e `is_admin`; (2) aplicar
> `homolog_base_schema.sql`; (3) rodar `profiles_lote1_preflight_homolog.sql`
> e só prosseguir se não houver FALHA; (4) aplicar `profiles_lote1_v3.sql`;
> (5) aplicar `profiles_lote1_qa_homolog.sql`; (6) rodar
> `tests/homolog/profiles_lote1_test.ts`; (7) rollback se algo crítico falhar.
> Não execute nenhuma etapa sem minha ordem explícita. Não crie crons,
> webhooks, integrações externas nem dados institucionais.
> Detalhes completos em `docs/lote1/HOMOLOG_SETUP.md`.

## 5. Próxima ação manual sua

1. Executar `extrair_definicoes_autorizacao.sql` no SQL Editor do SiDIF atual e
   me enviar o resultado (ou colá-lo no bloco 7).
2. Criar o novo projeto Lovable e conectá-lo ao `sidif-homologacao`.
