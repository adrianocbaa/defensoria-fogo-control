

## Correção: Remover quantitativo duplicado no RDO #27

### Problema
O item **2.2 (RUFO)** no RDO do dia 08/01/2026 possui um lançamento duplicado de **61,70**, fazendo o acumulado ultrapassar 100% da quantidade contratada.

### Solução
Excluir o registro de atividade duplicado diretamente no banco de dados:

- **Tabela:** `rdo_activities`
- **ID do registro:** `85bf22ed-8ff7-4c8e-965e-16ba4a86fb3a`
- **Valor a ser removido:** 61,70 (executado_dia)

### Resultado esperado
Apos a exclusao, o acumulado do item 2.2 (RUFO) deve voltar para dentro do limite contratual, eliminando o aviso "Execucao excede a quantidade disponivel".

### Detalhes tecnicos
Sera executado um `DELETE` na tabela `rdo_activities` filtrando pelo ID exato do registro duplicado. Nenhuma outra alteracao de codigo e necessaria.

