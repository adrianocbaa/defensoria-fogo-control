# Etapa 1 — Análise da página "Gerenciar Obras"

Conforme sua exigência, esta etapa é apenas de **análise**. Nada será alterado até sua aprovação.

## 1. Mapeamento atual


| Item                    | Situação hoje                                                                                                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rota                    | `/admin/obras`                                                                                                                                                                                      |
| Componente principal    | `src/pages/AdminObras.tsx`                                                                                                                                                                          |
| Chrome                  | `SimpleHeader` + `PageHeader`                                                                                                                                                                       |
| Detalhes                | drawer `ObraDetails` (compartilhado)                                                                                                                                                                |
| Progresso               | `ObraProgressCell` interno + `MedicaoProgressBar`                                                                                                                                                   |
| Estados                 | `LoadingStates.TableSkeleton`                                                                                                                                                                       |
| Permissões              | `useUserRole`, `useObraActionPermissions`, `PermissionGuard`                                                                                                                                        |
| Hooks de dados          | `useObras` (full), `useMedicoesFinanceiro`, RPC `get_rdo_progress_batch`                                                                                                                            |
| Tabelas Supabase        | `obras`, `user_obra_access`, `orcamento_items`, `aditivo_sessions`, `aditivo_items`, `medicao_sessions`, `medicao_items`, indiretas: `empresas`, `profiles`, `rdo_*`                                |
| Fonte de dados          | Query direta em `obras` (filtrada por `user_obra_access` se contratada) + cálculo financeiro via `calcularFinanceiroMedicao`                                                                        |
| Rotas irmãs preservadas | `/dashboard` (Estatísticas), `/obras` (Mapa), `/admin/obras/lista` (Lista simples), `/admin/obras/nova`, `/admin/obras/:id/editar`, `/medicao/:id`, `/obras/:id/rdo/resumo`, `/obras/:id/checklist` |


## 2. Funcionalidades hoje disponíveis

- Busca por nome/município/tipo (texto único)
- Filtro por status (Todos / Em Andamento / Paralisado / Concluído — botões)
- Filtro por ano de início (`Select`)
- Ordenação fixa por status (em_andamento → planejamento → paralisada → concluida) + data prevista de término (sem ordenação por coluna)
- Sem paginação (renderiza tudo)
- Colunas: Nome · Município · Tipo · Status · Valor · Progresso (RDO + Medição, dois trilhos) · Ações
- Cabeçalho da página: botões **Estatísticas**, **Mapa de Obras**, **Nova Obra**
- Ações por linha:
  - Ver detalhes (drawer `ObraDetails`)
  - Medição (`/medicao/:id`)
  - RDO (`/obras/:id/rdo/resumo`, condicional a `rdo_habilitado`)
  - Checklist (`/obras/:id/checklist`)
  - Editar (permissão granular `useObraActionPermissions`)
  - Excluir (permissão granular + `window.confirm`)
- Contratada vê apenas obras liberadas em `user_obra_access`
- Bloco informativo para perfis apenas-visualização
- Sem exportação, sem importação, sem seleção em lote, sem duplicar/arquivar, sem personalização de colunas

## 3. Tabela comparativa Figma × Sistema


| Funcionalidade atual                                                             | Aparece no Figma?                            | Como será preservada                                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sidebar `SimpleHeader`                                                           | Não (Figma usa nova sidebar SiDIF)           | Trocar apenas nesta página para `ObrasLayout` já existente (mesmo padrão do `/obras`)                                                                                                                                                                                   |
| Breadcrumb / título                                                              | Sim ("Dashboard / Obras" + "Mapa de Obras")  | Usar `WorksPageHeader`; título permanece **"Gerenciar Obras"** (não "Mapa de Obras")                                                                                                                                                                                    |
| Botões Estatísticas / Painel / Ver como Mapa / Ver como Lista                    | Parcial (4 abas no Figma)                    | Nova barra de navegação do módulo com 4 acessos: **Mapa de Obras** (`/obras`), **Estatísticas** (`/dashboard`), **Painel de Obras** (`/admin/obras/painel` — confirmar rota), **Gerenciar Obras** (ativa). Botão **Nova Obra** preservado como ação principal do header |
| KPIs (Total/Em Andamento/Concluídas/Planejadas/Paralisadas)                      | Sim                                          | Novo componente `WorksStats` calculado a partir de `obras`; clique aplica filtro de status                                                                                                                                                                              |
| Busca por nome/município/tipo                                                    | Sim (busca global no header + campo interno) | Preserva campo de busca; busca global do header fica visual (padrão do novo SiDIF)                                                                                                                                                                                      |
| Filtro por status (botões)                                                       | Sim, como chips ativos + filtros             | Migrar para painel de filtros + chips removíveis (`ActiveFilters`)                                                                                                                                                                                                      |
| Filtro por ano de início                                                         | Não visível                                  | **Preservar** dentro do painel de filtros (drawer/popover "Filtros")                                                                                                                                                                                                    |
| Ordenação por status+prazo                                                       | Não visível                                  | Preservar ordenação padrão + habilitar cabeçalhos clicáveis (indicadores ▲▼) nas colunas Nome, Município, Status, Execução, Prazo, Valor, Fiscal                                                                                                                        |
| Coluna Tipo                                                                      | Sim                                          | Mantida                                                                                                                                                                                                                                                                 |
| Coluna Prazo                                                                     | Sim                                          | **Nova** — usar `previsao_termino` formatado dd/mm/aaaa; "—" quando ausente                                                                                                                                                                                             |
| Coluna Fiscal                                                                    | Sim                                          | **Nova** — usar `fiscal_id → profiles.display_name` (já disponível em `useObras`); "Não informado" quando ausente                                                                                                                                                       |
| Coluna Valor                                                                     | Sim                                          | Manter cálculo atual `obraValores` (total contrato via `calcularFinanceiroMedicao`), formato R$                                                                                                                                                                         |
| Coluna Execução (barra + %)                                                      | Sim (barra única azul)                       | Manter `ObraProgressCell` (RDO + Medição). Se decidirmos simplificar para uma barra só, **peço aprovação** — proposta é manter as duas trilhas                                                                                                                          |
| Ação Ver                                                                         | Sim                                          | Botão "Ver" na coluna Ação abre drawer `ObraDetails`                                                                                                                                                                                                                    |
| Ações Medição / RDO / Checklist / Editar / Excluir                               | Não visíveis                                 | Recolher num **menu ⋯** ao lado do botão "Ver", preservando 100% e respeitando `useObraActionPermissions`                                                                                                                                                               |
| Confirmação de exclusão                                                          | Existe (`window.confirm`)                    | Substituir por `AlertDialog` do shadcn (melhora UX, mesma regra)                                                                                                                                                                                                        |
| Nova Obra                                                                        | Existe                                       | Botão `+ Nova Obra` mantido no header (ação principal), preservando `PermissionGuard requiresEdit`                                                                                                                                                                      |
| Filtro por município / fiscal / empresa / período                                | Não existe hoje                              | **Não criar** sem pedido explícito (você mencionou "demais filtros atualmente existentes" — como não há, nada a adicionar)                                                                                                                                              |
| Paginação                                                                        | Não existe hoje                              | **Adicionar** paginação client-side (10/25/50 por página) com contador "Exibindo X–Y de N" — informe se prefere manter sem paginação                                                                                                                                    |
| Chips de filtros ativos + "Limpar todos"                                         | Sim                                          | Novo `ActiveFilterChips` sobre os filtros existentes                                                                                                                                                                                                                    |
| Bloco "permissão de visualização"                                                | Existe                                       | Mantido no rodapé                                                                                                                                                                                                                                                       |
| Contratada com `user_obra_access`                                                | Existe                                       | Preservado (mesma query)                                                                                                                                                                                                                                                |
| Exportação / importação / lote / duplicar / arquivar / personalização de colunas | Não existem                                  | Não criar                                                                                                                                                                                                                                                               |


## 4. Pontos que precisam da sua decisão antes de eu implementar

1. **Rota "Painel de Obras"**: a rota existe? Se sim, qual? (Não localizei um `/admin/obras/painel`; hoje só há `AdminObras` = lista.) Se não existir, removo esse botão da navegação do módulo.
2. **Barra de Execução**: manter as duas trilhas atuais (RDO + Medição) ou consolidar em uma única barra como no Figma? Recomendo **manter as duas** — nada é perdido.
3. **Paginação**: adicionar paginação client-side (o Figma mostra "Página 1 de 3") ou manter renderização completa como hoje?
4. **Sidebar**: confirma trocar `SimpleHeader` por `ObrasLayout` (nova sidebar SiDIF) **apenas** em `/admin/obras`, sem tocar em outras páginas admin?
5. **Confirmação de exclusão**: posso migrar `window.confirm` para `AlertDialog`? (mesma regra, apenas visual)

## 5. O que NÃO será feito nesta etapa

- Nenhuma edição de arquivo
- Nenhuma alteração de banco, RLS, rotas ou permissões
- Nenhuma remoção de coluna, botão ou ação
- Nenhum dado simulado

Aguardo sua aprovação (e respostas dos 5 itens acima) para seguir para a Etapa 2 (implementação).  
  
**Rota “Painel de Obras”**  
Como não foi localizada uma rota específica para “Painel de Obras”, não remova o botão definitivamente. Oculte-o temporariamente nesta implementação ou mantenha-o desabilitado com indicação “Em desenvolvimento”, sem criar rota fictícia. Caso exista alguma funcionalidade equivalente já implementada, reaproveite-a.

**Barra de Execução**  
Mantenha as duas trilhas atuais, uma para **RDO** e outra para **Medição**. Não consolidar em uma única barra, pois representam informações diferentes e a consolidação poderia ocultar dados importantes. Adapte o layout do Figma para exibir as duas de forma clara.

**Paginação**  
Adicione paginação client-side, mantendo inicialmente 10 obras por página, com seletor de quantidade por página se for simples de implementar. Não altere a consulta nem a estrutura dos dados. Caso o volume cresça no futuro, deixaremos preparado para paginação server-side.

**Sidebar**  
Confirmo substituir o `SimpleHeader` por `ObrasLayout` apenas na rota `/admin/obras` nesta etapa. Não alterar outras páginas administrativas nem outras rotas do módulo sem nova aprovação.

**Confirmação de exclusão**  
Pode migrar de `window.confirm` para `AlertDialog`, mantendo exatamente a mesma regra de permissão, validação e exclusão. A mudança deve ser apenas visual, sem alterar o comportamento funcional.  
  


&nbsp;