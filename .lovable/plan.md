# Diagnóstico somente leitura — Avaliação 003/2026 (Peixoto de Azevedo/MT)

Nenhuma alteração foi feita. Valores lidos do banco em 13/11/2026 ~17:55 UTC. Avaliação: status ATIVA, etapa RESULTADO_ECONOMICO.

## 1) Amostras (17 no total; todas com "Usar" = sim)

| # | Endereço | Município | Área m² | Valor unit. | Dist. polo | Banh. | No modelo (atual) | No conjunto v1 |
|---|---|---|---|---|---|---|---|---|
| 1 | Av Brasil, 1075 | Peixoto | 300,00 | 40,0000 | 1,70 | 2 | sim | sim |
| 2 | Rua da Saúde, 104 | Peixoto | 292,97 | 40,9598 | 0,95 | 2 | sim | sim |
| 3 | Av. Lions Internacional, 808 | Peixoto | 300,00 | 18,3333 | 2,00 | 1 | não | não |
| 4 | Rua Francisca Maria Guedes, 42 | Peixoto | 116,32 | 42,9849 | 1,00 | 1 | sim | sim |
| 5 | Rua Salvador, 256 | Peixoto | 114,00 | 26,3158 | 1,90 | 1 | sim | sim |
| 6 | Rua P. Morais, 37 | Peixoto | 360,00 | 13,8889 | 0,85 | 5 | não | não |
| 7 | Av. Thiago Magalhães Nunes, 340 | Peixoto | 60,00 | 20,0000 | 1,10 | 1 | **não** | **sim** |
| 8 | Av. Thiago Magalhães Nunes, 340 | Peixoto | 120,00 | 13,3333 | 1,10 | 1 | não | não |
| 9 | Av. Mal. Cândido Rondon, s/n | Colíder | 35,00 | 71,4286 | 0,90 | 1 | sim | sim |
| 10 | Avenida Tancredo Neves, 471 | Colíder | 200,00 | 17,5000 | 2,70 | 1 | não | não |
| 11 | Av. Tancredo Neves, s/n | Colíder | 70,11 | 35,6583 | 2,60 | 2 | sim | sim |
| 12 | Rua dos Ipês, 38 | Guarantã | 110,00 | 31,8182 | 1,30 | 4 | sim | sim |
| 13 | Av. Cambará, 1095 | Guarantã | 242,00 | 24,7934 | 1,10 | 1 | sim | sim |
| 14 | Rua das Figueiras, 133 | Guarantã | 80,00 | 35,6250 | 1,50 | 1 | sim | sim |
| 15 | Av. Jatobá, 691 | Guarantã | 80,00 | 56,2500 | 1,70 | 1 | sim | sim |
| 16 | Av Jatobá, 1190 | Guarantã | 170,00 | 17,6471 | 1,30 | 2 | não | não |
| 17 | Avenida Mato Grosso, 77-A | Terra Nova | 129,20 | 23,2198 | 1,10 | 2 | não | não |

- "No modelo" atual: 10 (1, 2, 4, 5, 9, 11, 12, 13, 14, 15).
- Fora do modelo atual: 3, 6, 7, 8, 10, 16, 17.
- Divergência real: a amostra 7 (60 m²) está desmarcada hoje, mas entrou habilitada no conjunto congelado v1.

## 2) Conjunto de dados
- Existe 1 conjunto: versão 1, CONGELADO em 13/11/2026 17:17:55 UTC.
- 17 amostras registradas; 11 habilitadas: 1, 2, 4, 5, 7, 9, 11, 12, 13, 14, 15.

## 3) Configuração de modelagem
- Dependente: Valor unitário, transformação SQUARE (y²), relação INDEFINIDA.
- Independentes ativas: Área construída (obrigatória, só INV_SQUARE = 1/x², relação NEGATIVA); Distância ao polo (DIRECT/LN/INVERSE, NEGATIVA, papel "disponível"); Banheiros (DIRECT/LN/INVERSE, POSITIVA, papel "disponível"). Distância ao centro: inativa.
- Rodada 1, modo ASSISTIDO, 1 candidato criado e calculado.

## 4) Modelo calculado (rodada 1)
- Modelo 1 — status EM_VALIDACAO, não stale, não arquivado, confiança 80%, motor 1.1.1, nenhuma amostra excluída.
- n = 11; k = 1 (só Área construída entrou no modelo).
- Equação: y² = 934,8454133563919 + 4.443.335,951496548 × (1/Área²)
- Intercepto: β 934,8454; EP 360,7182; t 2,5916; p 0,02914.
- Área (1/x²): β 4.443.335,9515; EP 1.295.715,1849; t 3,4293; p 0,00752.
- R² 0,566469; R² ajustado 0,518299; r (correlação) 0,752642; r da estimativa 0,585058.
- F 11,7598; significância F 0,00752; s 943,3518 (em y²).
- Faixas usadas: área 35–300; valor unitário 20,00–71,4286.
- Centro preliminar 34,6559; amplitude do intervalo de confiança 37,38%; grau de precisão II; sem extrapolação.

## 5) Avaliando (Travessa Marília, 30)
- Área construída 129,20 (é o valor usado na projeção, dentro da faixa 35–300).
- Distância ao polo 0; Banheiros 1; Valor unitário não informado (é a variável a estimar).
- Projeção registrada (17:44 UTC, marcada como desatualizada): mínimo 27,5676 · centro 34,6559 · máximo 40,5227 R$/m², amplitude 37,38%, grau II.

## Technical details
Fontes: avaliacao_amostras, avaliacao_conjunto_amostras, imoveis, dados_mercado, avaliacao_variavel_valores, imovel_atributos (BANHEIROS), avaliacao_variaveis, avaliacao_model_generation_runs, avaliacao_modelos/modelo_variaveis, modelo_coeficientes, modelo_resultado_resumo, saída do motor (fit), avaliacao_projecoes/projecao_centros. A ordem visual segue a data de inclusão.
