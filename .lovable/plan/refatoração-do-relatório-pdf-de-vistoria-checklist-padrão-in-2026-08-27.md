# Refatoração do Relatório PDF de Vistoria/Checklist — Padrão Institucional

## 1. Auditoria do relatório atual (feita)

- **Gerador:** `src/components/checklist/ChecklistPdfExport.ts` (função `exportChecklistPdf`), chamado em `src/pages/ChecklistDinamico.tsx`. É o único PDF do checklist dinâmico. Os relatórios de Recebimento e Entrega são outros arquivos e **não** serão tocados.
- **Biblioteca:** jsPDF puro (A4, mm), desenho manual. Sem autotable. O helper institucional `src/lib/pdf/sidifPdf.ts` (usado nos relatórios de recebimento/entrega) existe e traz cabeçalho/rodapé/tabelas/assinaturas padronizados.
- **Fonte dos dados:** `useChecklistDinamico` (pdf, ambientes, serviços) + `useChecklistOcorrencias` (ocorrências por serviço) + dados da obra.
- **Agrupamento:** por ambiente (`checklist_ambientes`, campo `pagina` da planta) → serviços → ocorrências.
- **Fotos:** `foto_reprovacao_url` e `foto_correcao_url` no serviço e na ocorrência, baixadas por fetch e inseridas com tamanho fixo 85×52 mm (**a imagem é esticada — hoje distorce**).
- **Planta e pins:** página do PDF de projeto renderizada via `pdfjsLib` e pins numerados sequencialmente por `location_pin` (0–100 em %). Legenda em 2 colunas.
- **Paginação:** `checkY(n)` simples; rodapé "Relatório Técnico de Checklist · obra" + "Página N" (sem total). Cabeçalho de páginas seguintes é apenas uma faixa verde de 1 mm.
- **Status:** `pendente | aprovado | reprovado`. **Gravidade:** `critico | medio | estetico`.
- **Assinaturas:** 3 caixas fixas (Fiscal, Empresa, Coordenador), sem persistência.
- **Exportação:** `doc.save(checklist_<obraId>_<timestamp>.pdf)`.

### O que o novo layout pede × o que existe hoje

| Item do novo layout | Situação |
|---|---|
| Capa, cabeçalho/rodapé institucional, cores, tipografia | Só transformação visual |
| Identificação, resumo, planta, ambientes, fotos, assinaturas | Existem — só reorganização visual |
| Quadro geral de pendências | Derivável dos dados atuais |
| Código P-001 | **Não existe** — gerado só no PDF, determinístico |
| Gravidade Crítica/Média/Baixa-Estética | Existe (`critico/medio/estetico`) |
| "Situação identificada" | Mapeia para `descricao`/`observacao` |
| "Correção solicitada" | **Campo não existe** — bloco visual preparado, exibido só se houver `observacao` designada; caso contrário, "—" |
| Registro da Execução / Verificação da Fiscalização / Antes×Depois / Correção aceita ou não / múltiplas tentativas | **Só "Antes×Depois" existe** (foto reprovação + foto correção). Aceite, data de execução, responsável pela correção e histórico de tentativas **não existem** |
| Relatório nº, Revisão, Tipo | **Não existem** — template preparado, sem valores inventados |
| Conclusão / situação consolidada | Só contagens reais existentes, texto neutro |

**Campos que seriam necessários no futuro (não serão criados agora):** `codigo` persistido na pendência; `correcao_solicitada`; `execucao_descricao`, `execucao_data`, `execucao_responsavel`; `verificacao_resultado` (aceita/não aceita), `verificacao_data`, `verificacao_por`; tabela de tentativas de correção; `relatorio_numero`, `revisao`, `tipo_relatorio`.

## 2. O que será implementado

Refatoração de `ChecklistPdfExport.ts` (mesma assinatura pública, mesmo ponto de chamada), quebrada em módulos sob `src/lib/pdf/checklist/`:

1. **Capa** — brasão/logo DPE-MT, "Defensoria Pública do Estado de Mato Grosso / Diretoria de Infraestrutura Física / Relatório de Vistoria — SiDIF", nome da obra, contrato, data, campos de Relatório nº / Revisão / Tipo renderizados apenas quando houver fonte real.
2. **Cabeçalho corrido** em todas as páginas internas (linha institucional discreta, sem faixa colorida grande).
3. **Rodapé** — `SiDIF · <obra> · Documento de uso interno` e `Página X de Y` (total calculado no fim).
4. **Identificação da vistoria** — tabela sóbria com quebra de linha (sem cortar texto).
5. **Resumo** — números em tabela/linha discreta (sem cards estilo dashboard, sem barra de progresso colorida).
6. **Planta de localização** — mesma renderização e coordenadas dos pins; planta maior, legenda em tabela `Pin | Ambiente | Pendência | Gravidade | Situação`.
7. **Quadro geral de pendências** — tabela `Nº | Ambiente | Serviço | Descrição resumida | Gravidade | Situação`, com o código P-XXX na coluna Nº.
8. **Pendências por ambiente** — cabeçalho `NOME DO AMBIENTE` + resumo `X pendências · X críticas · X médias · X baixas`; continuação marcada como `Ambiente: X — Continuação`.
9. **Bloco de pendência** — P-XXX, título, gravidade, status, ambiente, local, Situação identificada, Correção solicitada, fotos e legenda, medido antes de imprimir; se não couber inteiro, vai para a próxima página; se for maior que uma página, quebra com `P-XXX — Título — Continuação`.
10. **Fotos** — proporção preservada (`drawImageContain` de `sidifPdf.ts`); 1 foto centralizada, 2 em colunas, 3+ em grid; sem foto = aviso compacto de uma linha.
11. **Correção/reinspeção** — bloco "Antes × Depois" com as fotos existentes; subtítulos "Registro da Execução" e "Verificação da Fiscalização" renderizados apenas quando houver dado (hoje: não renderizam).
12. **Conclusão e situação consolidada** — apenas contagens reais e texto neutro; nenhuma regra percentual inventada.
13. **Assinaturas** — mesmo mecanismo, layout institucional.

**Definição de pendência (P-XXX):** todo serviço com status `reprovado` e toda ocorrência registrada, ordenados por ambiente → ordem do serviço → ordem da ocorrência. Serviços aprovados/pendentes continuam listados no checklist por ambiente, sem código P.

**Terminologia unificada:** "Situação identificada" e "Correção solicitada" em todo o documento.

## 3. Testes

Três PDFs gerados via Playwright na obra de teste: poucas pendências, muitas pendências, e fotos com proporções diferentes (retrato/paisagem). Conferência página a página (via `pdftoppm`) de: A4, cabeçalho, rodapé com X de Y, quebras, planta, quadro geral, ambientes, fotos, pendências sem foto, textos longos, sobreposição e corte.

## 4. Fora do escopo (não será feito)

Nenhuma migração, tabela, coluna, status, política RLS ou mudança de storage/URLs. Se algum ponto do layout exigir isso, paro e pergunto antes.

## Observação sobre o Figma

Não tenho acesso ao arquivo do Figma nesta sessão (o conector Figma exige o app Lovable Desktop). A implementação seguirá a especificação escrita acima; se você anexar prints das páginas-chave do Figma (capa, bloco de pendência, planta, conclusão), eu ajusto a fidelidade visual.
