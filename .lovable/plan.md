# Precisão decimal: unitário bruto + desconto centralizado

## Problema

Hoje o sistema guarda apenas o valor já com desconto e deriva o unitário líquido por
`total_com_desconto ÷ quantidade`. Como o total importado já vem truncado em 2 casas,
essa divisão é irreversível: cada linha produz um unitário ligeiramente diferente
(ex.: 19,754884 no contrato vs 19,756797 no aditivo) e o mesmo item deixa de "bater"
entre planilha contratual, aditivo e medição.

A correção é inverter a ordem: guardar o **unitário bruto** da planilha e aplicar o
desconto de forma centralizada, sempre na mesma função, no momento do cálculo.

## O que muda

### 1. Banco de dados
- `orcamento_items`: adicionar `valor_unitario_bruto` (numeric) — unitário original da planilha, sem desconto.
- `obras`: garantir que o percentual de desconto do contrato fique persistido em um único campo canônico (reaproveitar o existente; criar apenas se não houver).
- `aditivo_items`: adicionar `valor_unitario_bruto` para o mesmo tratamento nos aditivos.
- Backfill: preencher `valor_unitario_bruto` dos registros existentes a partir de
  `valor_total_sem_desconto ÷ quantidade` quando disponível; quando não houver, manter o
  unitário atual (item legado marcado, sem reprocessamento).

### 2. Utilitário único de arredondamento
Novo `src/lib/precisao.ts`:
- `truncar2(valor)` — truncamento em centavos usando aritmética inteira (evita erro de ponto flutuante).
- `aplicarDesconto(unitarioBruto, pctDesconto)` — unitário líquido não truncado.
- `totalItem(qtd, unitarioBruto, pctDesconto)` — `truncar2(qtd × unitário líquido)`.
Todo cálculo de contrato, aditivo e medição passa a chamar exclusivamente essas funções.

### 3. Importação de planilha (`ImportarPlanilha.tsx`)
- Ler o unitário bruto direto da coluna de valor unitário (com BDI) da planilha, em vez de
  derivar por divisão.
- Persistir `valor_unitario_bruto` + `valor_total_sem_desconto` e calcular total via `totalItem`.
- Remover a exceção hardcoded `OBRA_SEM_TRUNCAR_DESCONTO`, que existe hoje só para contornar o problema.

### 4. Aditivos (`useAditivoItems.ts` / modal de aditivo)
- Usar o `valor_unitario_bruto` do item contratual como base do aditivo (em vez de recalcular
  a partir do total líquido), aplicando o mesmo desconto pela função central.
- Itens extracontratuais recebem unitário bruto informado na criação.

### 5. Medição
- Recalcular percentuais e totais sobre o unitário bruto + desconto centralizado.
- Medições já **bloqueadas** ficam intocadas: os valores congelados (`*_congelado`) continuam
  sendo a fonte de verdade, então nenhum fechamento histórico muda.

## Ordem de execução

1. Migração de schema + backfill.
2. `src/lib/precisao.ts` e testes dos casos citados (contrato x aditivo do mesmo item).
3. Importador da planilha.
4. Aditivos.
5. Medição e relatórios/exportações.
6. Validação na obra de Alta Floresta e em Nobres, comparando contra a planilha original.

## Notas técnicas

- Sem nova dependência: o truncamento usa inteiros em centavos, o que já resolve o que o
  `decimal.js` resolveria nesse escopo.
- O valor apresentado ao usuário continua com 2 casas; a diferença é que a base do cálculo
  deixa de ser um número já truncado.
- Obras com medições fechadas mantêm o histórico congelado; a nova regra vale para os cálculos
  a partir da próxima medição.
