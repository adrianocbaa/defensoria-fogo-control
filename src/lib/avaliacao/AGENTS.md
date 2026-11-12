# Avaliações — regras locais

- The municipality belongs to the property (`imoveis.uf/municipio_ibge/municipio_nome`, chosen from the local IBGE catalog); the assessment's municipality is only the form default. Territorial origin and duplicate detection use the property's municipality (`municipioImovel.ts`), the DB coerces `LOCAL` to `MUNICIPIO_COMPARAVEL` on sample insert when municipalities differ, a deferred constraint trigger validates IBGE/UF/name, and corrections go through `aval_apply_changes`. Why: samples from other towns were silently recorded under the report's town.
