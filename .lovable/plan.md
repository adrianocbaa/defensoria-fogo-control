# Recebimento de Obra — modelagem final (revisão 2)

Novo modo de checklist no módulo Obras. O checklist **Dinâmico com Projeto** permanece intocado; a rota `/obras/:id/checklist` ganha um seletor de modo (preferência por obra em localStorage).

Todas as tabelas: `id uuid default gen_random_uuid()`, `created_at`, `updated_at` (com trigger), GRANTs explícitos, RLS por obra no padrão atual (`can_edit_obra`, `user_has_obra_access`, `is_admin`), índices em todos os FKs e nos campos de filtro (`obra_id`, `vistoria_id`, `ambiente_id`, `pendencia_id`, `status`, `situacao`).

## 1. Biblioteca (normalizada)

```text
biblioteca_servicos
  macro text            -- ex.: "Esquadrias"
  servico text          -- ex.: "Porta"
  descricao text
  keywords text[]       -- apenas busca
  escopo text           -- 'global' | 'obra'
  obra_id uuid null     -- preenchido quando escopo='obra'
  ordem int
  ativo bool default true          -- soft delete

biblioteca_verificacoes
  servico_id uuid -> biblioteca_servicos(id)
  descricao text        -- ex.: "Maçaneta"
  ordem int
  default_aplicavel bool default true   -- false = sugerir "Não se aplica"
  ativo bool default true
```

Sem `text[]` de verificações: cada verificação é editável, ordenável e desativável individualmente. Seed com as 30 macros / famílias / verificações da especificação.

## 2. Templates de ambiente

```text
recebimento_templates
  nome, descricao, ordem, ativo

recebimento_template_servicos
  template_id -> recebimento_templates(id)
  biblioteca_servico_id -> biblioteca_servicos(id)
  ordem
```

Seed: Sala/Gabinete, Banheiro, Banheiro PCD, Copa, Circulação, Área externa. Aplicar um template **copia** serviços e verificações para o ambiente; edições posteriores no ambiente não afetam o template global (e vice-versa).

## 3. Vistorias e o vínculo da reinspeção

```text
recebimento_vistorias
  obra_id -> obras(id)
  tipo text              -- 'provisorio' | 'reinspecao' | 'definitivo'
  vistoria_origem_id uuid null -> recebimento_vistorias(id)
  status text            -- 'em_andamento' | 'concluida' | 'cancelada'
  data date, iniciado_em, concluido_em
  fiscal_id uuid, concluida_por uuid
  observacoes text
```

Auto-relacionamento simples: `Provisório ← Reinspeção 1 ← Reinspeção 2 …`. A cadeia inteira é recuperável seguindo `vistoria_origem_id`.

**Reinspeção não recria checklist**: ela não gera ambientes, serviços nem verificações. A tela consulta as pendências abertas da vistoria de origem (e da cadeia) e exibe o ambiente original de cada uma. Checklist integral só é criado em `provisorio` e, se o fiscal optar, em `definitivo`.

## 4. Ambientes, serviços e verificações (com snapshot)

```text
recebimento_ambientes
  vistoria_id, obra_id, nome, tipo_modelo, pavimento, observacoes, ordem, ativo

recebimento_ambiente_servicos
  ambiente_id, obra_id
  biblioteca_servico_id uuid null -> biblioteca_servicos(id)   -- null se personalizado
  macro_snapshot text, servico_snapshot text
  ordem, ativo

recebimento_verificacoes
  ambiente_servico_id, ambiente_id, vistoria_id, obra_id
  biblioteca_verificacao_id uuid null -> biblioteca_verificacoes(id)
  descricao_snapshot text
  status text default 'nao_vistoriado'
      -- nao_vistoriado | conforme | nao_conforme | nao_executado | nao_aplica
  observacao text
  respondido_por uuid, respondido_em timestamptz
  ordem, ativo
```

O snapshot textual garante que alterações futuras na biblioteca **não** mudem retroativamente vistorias já realizadas; o FK preserva a rastreabilidade de origem. Todas as consultas de tela usam IDs, nunca texto de macro/serviço.

## 5. Ciclo de vida da pendência

```text
recebimento_pendencias
  verificacao_id, ambiente_id, obra_id
  vistoria_origem_id      -- vistoria em que nasceu
  titulo, descricao
  classificacao text      -- acabamento | funcional | seguranca | acessibilidade | instalacao | outro
  prazo_correcao date
  situacao text default 'pendente'
      -- pendente | correcao_registrada | reprovada | sanada | cancelada
  criada_por, sanada_em, sanada_por
  cancelada_em, cancelada_por, motivo_cancelamento
```

A pendência é **única e persistente**: nasce no provisório e atravessa quantas reinspeções forem necessárias, sempre com o mesmo id. Nenhuma reinspeção duplica pendência. Cancelamento exige justificativa e gera histórico; nunca há exclusão silenciosa de pendência com histórico.

```text
recebimento_pendencia_historico
  pendencia_id, obra_id
  vistoria_id uuid null    -- vistoria em que o evento ocorreu (reinspeção, etc.)
  evento text  -- criada | descricao_alterada | correcao_registrada |
               -- reinspecionada | reprovada | sanada | cancelada
  situacao_anterior, situacao_nova
  observacao text
  autor uuid, created_at
```

Histórico é append-only: nenhum evento é apagado ou sobrescrito.

## 6. Fotos ligadas à etapa

```text
recebimento_fotos
  obra_id, vistoria_id, ambiente_id
  pendencia_id uuid null
  historico_id uuid null -> recebimento_pendencia_historico(id)   -- etapa exata
  tipo text        -- ocorrencia | correcao | geral
  storage_path text, legenda text
  autor uuid, created_at
```

`historico_id` amarra cada foto à etapa que a originou, então a linha do tempo fica completa:

```text
Ocorrência inicial      -> Foto A (evento: criada)
1ª correção             -> Foto B (correcao_registrada)
1ª reinspeção reprovada -> Foto C (reprovada)
2ª correção             -> Foto D (correcao_registrada)
2ª reinspeção sanada    -> Foto E (sanada)
```

Nenhuma foto é substituída; fotos gerais do ambiente entram com `tipo='geral'` e sem pendência.

## 7. Storage

Bucket existente `checklist-fotos`, com prefixo próprio para não misturar com o checklist dinâmico:

```text
recebimento/{obra_id}/{vistoria_id}/{ambiente_id}/{pendencia_id|geral}/{arquivo}
```

Políticas por prefixo no padrão atual; leitura via URL assinada (`signChecklistUrl`).

## 8. Exclusões

Soft delete (`ativo=false`) para ambientes, serviços e verificações; cancelamento registrado para pendências e vistorias. Antes de qualquer exclusão física, o sistema verifica respostas, fotos e histórico — havendo qualquer um deles, só permite inativar/cancelar com justificativa.

## 9. Interface (resumo)

Aba **Recebimento** com Visão Geral · Checklist · Pendências · Fotos · Histórico · Relatório; checklist mobile-first em cards/accordion, botões grandes de status, **✓ Marcar todos como Conforme** / **Marcar grupo como N/A**, barra fixa inferior (Anterior · 📷 Foto · Próximo) e seletor rápido de ambiente. "Não Conforme" abre bottom sheet que cria a pendência com fotos, classificação e prazo. Autosave por verificação com "Salvo ✓" e erro explícito. Reinspeção mostra só pendências abertas com Antes/Depois e Sanada / Continua Pendente. Relatório reutiliza o padrão institucional do módulo Obras.

## 10. Ordem de execução

1. Migração + seeds (biblioteca, verificações, templates)
2. Seletor de modo + casca da aba Recebimento + vistorias e ambientes
3. Templates, duplicação, checklist, status, ações em massa, progresso, autosave
4. Pendências + fotos
5. Reinspeção + histórico
6. Visão Geral + Relatório
