# Alinhar valores dos documentos de medição

## Objetivo
Fazer a Planilha PDF e o Relatório de Medição exibirem exatamente os mesmos totais mostrados nos cartões da tela.

## Implementação
- Usar como referência única nos dois documentos os valores já calculados para **Pós-Aditivo**, **Executado** e **Acumulado** na tela.
- Manter o detalhamento dos itens, mas impedir que uma nova soma interna produza diferença de centavos nos totais dos documentos.
- Alinhar também os percentuais dos documentos aos mesmos valores-base da tela.
- Validar a alteração no fluxo de exportação sem modificar dados, banco ou medições existentes.

## Arquivos previstos
- `src/pages/Medicao.tsx`
- `src/components/RelatorioMedicaoModal.tsx`
