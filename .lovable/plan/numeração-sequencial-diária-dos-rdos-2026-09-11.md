# Numeração sequencial diária dos RDOs

## Objetivo
Garantir uma sequência própria por obra, sem saltos: cada data que possuir RDO consome exatamente um número, independentemente de sábados, domingos ou outros dias sem expediente.

## Regra definida
- Ordenar os RDOs de cada obra pela data do relatório.
- A primeira data com RDO será `#1`, a segunda será `#2` e assim por diante.
- Datas sem RDO não consomem número; portanto, fins de semana e dias sem expediente não geram saltos.
- Continua permitido apenas um RDO por obra em cada data.
- Ao incluir um RDO retroativo, ele recebe a posição cronológica correta e os RDOs posteriores são renumerados.
- Ao excluir um RDO, os posteriores recuam automaticamente para eliminar a lacuna.
- Usuários não poderão alterar manualmente o número nem mover um RDO existente para outra data/obra por uma atualização comum.

## Implementação
1. Renumerar todos os RDOs existentes, separadamente por obra e em ordem de data.
2. Adicionar proteção de unicidade para impedir dois números iguais na mesma obra.
3. Centralizar a atribuição e o ajuste da sequência no banco, usando bloqueio por obra para evitar saltos causados por salvamentos simultâneos.
4. Remover dos dois fluxos da interface o cálculo local por “maior número + 1”; o banco passa a ser a única fonte da numeração.
5. Manter a criação automática, o RDO sem atividade, o autosave e a restrição de um relatório por data funcionando como hoje.

## Validação
- Conferir que cada obra ficou com a sequência `1…N`, sem duplicidades ou lacunas.
- Testar inclusão normal, inclusão retroativa e exclusão.
- Testar uma sequência sexta-feira → segunda-feira e um dia marcado sem expediente, confirmando que os números avançam apenas pelos RDOs existentes.
- Executar a verificação de tipos e revisar os fluxos de calendário e diário.

## Observação
PDFs já gerados podem conservar o número antigo impresso no arquivo. O cadastro e as próximas gerações usarão a sequência corrigida; nenhum arquivo existente será apagado automaticamente.
