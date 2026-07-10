## Objetivo

Refatorar `PreventivosEdit.tsx` para usar o novo padrão visual do SiDIF (sidebar `PreventivosLayout` + `PreventivosPageHeader`) reproduzindo fielmente o Frame-1.png, preservando 100% das funcionalidades atuais.

## Análise da tela atual (funcionalidades a preservar)

**Dados carregados/salvos** (Supabase):
- `nucleos_central` (leitura): nome, cidade, endereço, telefones, email
- `nuclei` (upsert): `fire_department_license_valid_until`, `fire_department_license_document_url`
- `fire_extinguishers` (delete + insert em cascata): type, location, capacity, expiration_date, hydrostatic_test, support_type, has_vertical_signage, status derivado
- `hydrants` (delete + insert): location, status, hose_expiration_date, has_register/hose/key/coupling/adapter/nozzle
- `documents` (delete + insert): name, type, url, size

**Ações existentes que devem continuar existindo:**
- Alvará: toggle "Possui AVCB" + data de validade + URL de documento
- Extintores: adicionar, copiar, remover, editar campos (tipo ABC/H2O/PQS/CO2, capacidade auto p/ H2O, local, vencimento, teste hidrostático, tipo suporte parede/tripé, sinalização vertical)
- Hidrantes: adicionar, remover, editar (local, status, validade mangueira, 6 acessórios)
- Documentos: componente `DocumentUpload` para adicionar + listagem + remover
- Salvar / Cancelar / redirecionar para `/preventivos/:id`

## Discrepâncias Figma × sistema atual

O Figma mostra apenas: Alvará (com toggle e data), extintores/hidrantes/documentos em estado vazio. **Não representa** os detalhes internos dos formulários de extintor e hidrante nem a ação "Copiar extintor". Estes serão mantidos usando o mesmo estilo visual (cards internos, borda leve, dashed empty state) sem remoção de campos.

O sistema atual **não possui** os campos citados na spec (número do alvará, órgão emissor, observações, número de patrimônio, data de fabricação, fabricante, fotos por item, etc.). **Não serão criados** — apenas os campos existentes serão exibidos, conforme a regra "não invente campos / não altere schema sem aprovação".

## Escopo de alterações

**Único arquivo editado:** `src/pages/PreventivosEdit.tsx`

Manter toda a lógica de fetch/save/handlers existente. Trocar apenas o shell visual:

1. Substituir `<SimpleHeader>` por `<PreventivosLayout header={...}>` + `<PreventivosPageHeader>` (mesmo padrão de `Preventivos.tsx` e `PreventivosDetails.tsx`).
2. Cabeçalho: breadcrumb `Dashboard / Preventivos / [Nome] / Editar`, link "Voltar" com seta, título grande "Editar Dados de Preventivos" + subtítulo com nome do núcleo.
3. Cards no estilo Frame-1: fundo branco, borda cinza clara, título forte, contador circular em pill à direita para seções com lista.
4. Seção "Informações Básicas (Somente Leitura)" com aviso em pill/alert azul-claro contendo o ícone de info e o texto da spec; inputs desabilitados em cinza.
5. Alvará: toggle verde (usar `Switch` do shadcn no lugar do Checkbox) + campo de data quando ativo.
6. Extintores / Hidrantes: card com contador; quando vazio → moldura tracejada com mensagem + botão "+ Adicionar" outline verde (padrão Figma); quando preenchido → lista dos formulários atuais mantendo todos os campos e o botão "Adicionar" no topo à direita.
7. Documentos: bloco cinza-claro interno com "Nome do Documento *" + "Tipo" (select) + área tracejada de upload + botão verde "Enviar Documento" (reaproveitando `DocumentUpload` internamente, apenas com estilo ajustado se necessário — sem alterar a lógica do componente).
8. Rodapé: "Cancelar" como link à esquerda + botão verde "Salvar Alterações" com ícone à direita.
9. Aplicar `PermissionGuard`/`useUserRole` para ocultar botões de adicionar/remover/salvar quando o usuário não puder editar (mantendo comportamento atual — hoje qualquer usuário autenticado vê os botões; adicionar guarda mínima usando `canEdit`).

## Fora de escopo (confirmar)

- **Novos campos de banco** (número de alvará, órgão emissor, observações, patrimônio, fabricante, fotos por extintor/hidrante, etc.) — não criar sem aprovação explícita.
- **Alerta de "alterações não salvas"** (`beforeunload` + bloqueio de navegação) — não existe hoje; posso adicionar se você confirmar.
- **Novas seções preventivas** (sinalização, iluminação de emergência, detectores, brigada, etc.) — não existem no schema atual; não serão criadas.
- **Salvamento individual por item** — hoje é tudo salvo em lote no submit (delete+insert). Mantido como está.

## Testes pós-implementação

Typecheck + verificação visual em desktop de: carregamento, toggle alvará, adicionar/editar/remover extintor, adicionar/remover hidrante, upload/remover documento, salvar, cancelar, console limpo.
