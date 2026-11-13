# Avaliações — telas

- Mercado: incluir amostra (cadastro novo, banco de imóveis, importação) segue `market.edit` na UI, na RLS de INSERT de `avaliacao_amostras` e em `aval_amostras_adicionar/importar`; marcar Usar/No modelo, remover vínculo, congelar e decidir municípios comparáveis seguem `market.select_samples`. Why: o criador que indica outro RT entra como COLABORADOR e precisa coletar amostras sem tomar as decisões do RT.
