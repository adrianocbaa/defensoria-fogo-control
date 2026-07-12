# Etapa 1 — Análise das telas atuais Nova/Editar Obra

Conforme sua regra, **nesta fase não altero nenhum arquivo, migração, rota ou banco**. Apresento abaixo o levantamento completo do que existe hoje e como cada item será preservado no novo fluxo por etapas do Figma. Aguardo aprovação antes de iniciar a Etapa 2.

## 1. Rotas atuais


| Ação           | Rota                               | Página                                                                                                     |
| -------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Criação        | `/admin/obras/nova`                | `src/pages/AdminObraNova.tsx` → `PermissionGuard requiresEdit` → `ObraForm obraId="nova"`                  |
| Criação (alt.) | `/admin/obras/:id` com `id="nova"` | `src/pages/AdminObraEdit.tsx` (mesmo fluxo, sem PermissionGuard granular, usa `roleCheckOnly`)             |
| Edição         | `/admin/obras/:id`                 | `src/pages/AdminObraEdit.tsx` → `ObraPermissionGuard` → `ObraForm` com `canChangeFiscal` derivado do papel |
| Voltar         | `/admin/obras`                     | `AdminObras.tsx`                                                                                           |


Ambas as páginas hoje renderizam **o mesmo componente monolítico** `src/components/ObraForm.tsx` (~1139 linhas).

## 2. Componentes utilizados

- `ObraForm` (form principal, monolítico)
- `MapSelector` (seleção lat/lng)
- `PhotoUpload` + `PhotoGalleryCollapsible` (upload/listagem de fotos com pastas por mês)
- `DocumentsUpload` (upload de documentos)
- shadcn `Form`, `Input`, `Select`, `Switch`, `Textarea`, `Dialog`
- `SimpleHeader`, `PermissionGuard`, `ObraPermissionGuard`, `LoadingStates.FormSkeleton`

## 3. Schema Zod (validações atuais) — `obraSchema`


| Campo                                 | Tipo      | Obrigatório        | Regra especial                                                                           |
| ------------------------------------- | --------- | ------------------ | ---------------------------------------------------------------------------------------- |
| `nome`                                | string    | Sim                | min 1                                                                                    |
| `municipio`                           | string    | Sim                | min 1                                                                                    |
| `n_contrato`                          | string    | Condicional        | Obrigatório se `status !== 'planejamento'`                                               |
| `sei_numero`                          | string    | Não                | regex `AAAA.D.DDDDDDDDD-D`                                                               |
| `status`                              | enum      | Sim                | `planejamento` | `em_andamento` | `concluida` | `paralisada`                             |
| `tipo`                                | enum      | Sim                | `Reforma` | `Construção` | `Adequações`                                                  |
| `valor_total`                         | number ≥0 | Sim                | Bloqueado quando existe planilha orçamentária importada                                  |
| `valor_aditivado`                     | number ≥0 | Não                | Derivado de `aditivo_sessions` bloqueadas quando há planilha                             |
| `valor_executado`                     | number ≥0 | Não                | Derivado de `medicao_items` (`total_congelado ?? total`) quando há planilha              |
| `data_inicio`                         | string    | Condicional        | Salvo como null se status = `planejamento`                                               |
| `tempo_obra`                          | number    | Não                | Entra no cálculo de `previsao_termino`                                                   |
| `aditivo_prazo`                       | number    | Não                | Entra no cálculo de `previsao_termino`                                                   |
| `previsao_termino`                    | string    | Calculado          | `addDays(data_inicio, tempo_obra + aditivo_prazo)` via `form.watch`                      |
| `data_termino_real`                   | string    | Condicional        | Só salvo se `status = concluida` (via `showConclusaoDialog`)                             |
| `empresa_id`                          | string    | Não                | Filtra `regiao` via `ata_polos.empresa_id`                                               |
| `empresa_responsavel`                 | string    | Não                | Texto livre legado                                                                       |
| `regiao`                              | string    | Não                | Vem de `ata_polos.polo`                                                                  |
| `secretaria_responsavel`              | string    | Não                | Texto legado                                                                             |
| `fiscal_id`                           | string    | Não                | FK para `profiles` (setor `dif`). Editável somente por admin/titular (`canChangeFiscal`) |
| `fiscal_substituto_id`                | string    | Não                | Persistido em `obra_fiscal_substitutos` (delete-all + insert 1)                          |
| `responsavel_projeto_id`              | string    | Não                | FK para `profiles` (setor `dif`)                                                         |
| `coordinates_lat` / `coordinates_lng` | number    | Não                | Via `MapSelector`                                                                        |
| `rdo_habilitado`                      | boolean   | Sim (default true) | Regra RDO existente                                                                      |


## 4. Tabelas envolvidas

- `obras` (principal, update/insert)
- `obra_fiscal_substitutos` (sync 1:1 via delete + insert)
- `profiles` (leitura de fiscais/arquitetos DIF)
- `empresas` (`useEmpresas`)
- `ata_polos` (regiões filtradas por empresa)
- `orcamento_items` (detecta planilha importada)
- `aditivo_sessions` + `aditivo_items` (valor aditivado derivado)
- `medicao_sessions` + `medicao_items` (valor pago derivado)
- Storage: bucket usado por `PhotoUpload` e `DocumentsUpload` (pasta `obras/AAAA-MM/…`)

## 5. Hooks e queries atuais

- `useAuth`, `useEmpresas`
- `useQuery`: `regioes-ata`, `fiscais-obras-dif`, `arquitetos-obras-dif`, `obra-fiscal-substituto`, `planilha-importada`, `valores-calculados-obra`
- `form.watch` para recálculo de previsão de término
- `PermissionGuard requiresEdit` (criação), `ObraPermissionGuard` (edição, retorna `role`)

## 6. Regras condicionais / por status

- `n_contrato` obrigatório se status ≠ `planejamento`
- `data_inicio` salva `null` se status = `planejamento`
- `data_termino_real` só salva se status = `concluida` (fluxo `showConclusaoDialog` + `pendingStatusChange`)
- `valor_total` bloqueado quando `hasPlanilhaImportada`
- `valor_aditivado`/`valor_executado` sobrescritos pelo derivado quando `hasPlanilhaImportada`
- `regiao` depende de `empresa_id`
- `fiscal_id` só editável para admin/titular (`canChangeFiscal`)

## 7. Fotos e documentos

- Fotos: seleção mês/ano, pastas `obras/AAAA-MM/…`, capa (`isCover`), edição de data do álbum, limite atual conforme `PhotoUpload`
- Documentos: `DocumentsUpload` grava em `documents` (name/type/url), tipos e limites atuais preservados

## 8. Fluxo de submit atual

1. Monta `obraData` respeitando regras por status
2. `insert` (criação) ou `update` (edição) em `obras`
3. Sincroniza `obra_fiscal_substitutos` (delete-all + insert do selecionado)
4. `toast.success` + `onSuccess()` → redirect `/admin/obras`

## 9. Mapeamento Figma × Sistema (preservação)


| Funcionalidade atual                                                                                          | Etapa do novo layout                 | Como será preservada                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `nome`, `municipio`, `sei_numero`, `status`, `tipo`                                                           | 1. Identificação                     | Mesmos campos e validações Zod; mesma condicional `status`→`n_contrato` disparada mesmo se o campo estiver em outra etapa                                                                                    |
| `MapSelector`, `coordinates_lat/lng`                                                                          | 1. Identificação (bloco Localização) | Componente atual reutilizado dentro do card do Figma; estados "sem localização / com coordenadas / alterar" apenas visuais                                                                                   |
| `n_contrato`, `valor_total`, `valor_aditivado`, `valor_executado`, `empresa_id/empresa_responsavel`, `regiao` | 2. Contrato e Valores                | Mesmos hooks (`useEmpresas`, `regioes-ata`, `valores-calculados-obra`, `planilha-importada`); "Valor Final" será **apenas exibição derivada** (`valor_total + valor_aditivado`), sem nova fórmula persistida |
| `data_inicio`, `tempo_obra`, `aditivo_prazo`, `previsao_termino`, `data_termino_real` + `showConclusaoDialog` | 3. Prazos                            | Mesmo `useEffect` de recálculo; mesmo Dialog de conclusão; resumo visual apenas leitura                                                                                                                      |
| `empresa_id`, `regiao`, `fiscal_id`, `fiscal_substituto_id`, `responsavel_projeto_id` + `canChangeFiscal`     | 4. Responsáveis                      | Mesmas queries `fiscais-obras-dif`/`arquitetos-obras-dif`; `fiscal_id` continua desabilitado sem permissão                                                                                                   |
| `rdo_habilitado` (Switch)                                                                                     | 5. Configurações                     | Mesmo campo; texto explicativo melhorado sem alterar regra                                                                                                                                                   |
| `PhotoUpload`, `PhotoGalleryCollapsible`, `DocumentsUpload`                                                   | 6. Fotos e Documentos                | Componentes reaproveitados dentro do novo card, sem tocar em storage/pastas/limites                                                                                                                          |
| `onSubmit` (insert/update + sync substituto)                                                                  | 7. Revisão → botão final             | Um único submit no final; Revisão apenas lê do form state; ações "Editar" navegam para a etapa correspondente                                                                                                |
| `PermissionGuard`/`ObraPermissionGuard`                                                                       | Envolve toda a página                | Mantidos como hoje; sem "esconder e pronto"                                                                                                                                                                  |
| Redirect `/admin/obras`                                                                                       | Pós-submit                           | Mesmo `onSuccess`/`onCancel`                                                                                                                                                                                 |
| Header antigo                                                                                                 | Novo cabeçalho + breadcrumb          | Barra horizontal verde removida visualmente **apenas** por este pedido explícito do usuário                                                                                                                  |


## 10. Funcionalidades atuais NÃO visíveis explicitamente no Figma

Serão preservadas, aguardo apenas confirmação de onde exibi-las:

1. **Dialog de conclusão** (`showConclusaoDialog` + `data_termino_real`) — sugestão: mantido como Dialog acionado ao mudar status na etapa 1 ou 3.
2. `**sei_numero**` com máscara — cabe em Identificação.
3. `**empresa_responsavel` (texto legado)** vs `empresa_id` — hoje coexistem; manter ambos ou consolidar? (recomendo manter ambos).
4. `**secretaria_responsavel` (texto legado)** — coexiste com `fiscal_id`; manter.
5. **Bloqueio de `valor_total**` quando há planilha importada — exibir badge "Calculado pela planilha".
6. **Derivação de `valor_aditivado`/`valor_executado**` — exibir como "Calculado" quando `hasPlanilhaImportada`.
7. `**isCover` em fotos** e **edição de data de álbum** — manter na etapa 6.
8. `**canChangeFiscal**` — mantido como disabled state na etapa 4.

## 11. Decisões que precisam da sua aprovação antes de eu prosseguir

1. **Rota**: manter as duas rotas atuais (`/admin/obras/nova` e `/admin/obras/:id`) apontando para o novo `WorkFormPage`? (recomendo sim, sem migração de rota)
2. **Rascunho**: conforme item 11 do seu pedido — apresento agora as opções A/B/C e aguardo escolha; até lá o botão "Salvar rascunho" fica **oculto** (não simulado).
3. **Alterações não salvas**: implementar `UnsavedChangesDialog` com `beforeunload` + bloqueio de `react-router`? (recomendo sim, é aditivo)
4. **Validação por etapa**: usar `form.trigger([campos da etapa])` do RHF para validar somente aquela etapa antes de avançar, preservando o `superRefine` global no submit final. Ok?
5. **Revisão**: as ações "Editar" apenas navegam para a etapa; o submit real só acontece no botão final da Revisão. Confirma?
6. `**empresa_responsavel` legado** e `**secretaria_responsavel` legado**: manter ambos os campos coexistindo com `empresa_id`/`fiscal_id` (como hoje), ou você quer discutir consolidação em um pedido separado?
7. **Dialog de conclusão de obra**: manter exatamente como está (abre ao trocar status para `concluida`), inclusive dentro do novo stepper?

## 12. O que NÃO farei sem autorização

- Nenhuma alteração de banco/migração
- Nenhuma remoção de campo, rota, hook, query ou componente
- Nenhuma mudança em `MapSelector`, `PhotoUpload`, `DocumentsUpload`, buckets, pastas ou limites
- Nenhuma nova fórmula de valor/prazo — apenas exibição derivada
- Nenhuma persistência de rascunho
- Nenhuma alteração em `PermissionGuard`/`ObraPermissionGuard` ou RLS

---

**Próximo passo**: aguardo sua aprovação desta análise + respostas às 7 decisões do item 11 para então elaborar o plano detalhado da Etapa 2 (estrutura de componentes `WorkFormPage`/steps + adaptação do `ObraForm` atual como fonte única de verdade do RHF).  
  
Plano aprovado, desde que todas as funcionalidades atuais das telas Nova Obra e Editar Obra sejam preservadas. Não remova, desvincule, substitua ou altere campos, regras, rotas, uploads, cálculos, permissões ou integrações. Caso surja qualquer conflito entre o Figma e o funcionamento atual, interrompa a implementação e solicite minha decisão antes de prosseguir.