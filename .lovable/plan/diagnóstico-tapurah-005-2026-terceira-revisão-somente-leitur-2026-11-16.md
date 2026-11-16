# Diagnóstico Tapurah 005/2026 — terceira revisão (somente leitura)

Nada foi alterado. Resultado: **o Modelo 3 agora reproduz o SisDEA**. Resta uma diferença de configuração, a relação esperada de Banheiros, e ainda não existe projeção oficial gravada.

## 1) Conjunto mais recente
- Versão 2, CONGELADO em 16/11 às 14:52 UTC (o v1 está SUPERADO).
- 15 amostras, todas no modelo. O Modelo 3 não está desatualizado nem arquivado.

## 2) Modelo mais recente: Modelo 3
- Criado às 14:57, Assistido, EM_VALIDACAO, motor 1.1.1, confiança 80%.
- n=15, k=3. Valor unitário em LN.
- Área: 1/x. Banheiros: LN(x). Distância: 1/x. Vagas fora do modelo.

## 3) Relações esperadas atuais
- Área: NEGATIVA. Com 1/x e coeficiente positivo, o valor cai quando a área cresce, então está coerente.
- Distância: NEGATIVA. Também coerente com 1/x e coeficiente positivo.
- **Banheiros: NEGATIVA, mas o coeficiente é positivo.** Não bate com o efeito do SisDEA e pode gerar alerta de coerência. Não muda nenhum número.

## 4) Equação e coeficientes
ln(VU) = 2,789226611 + 56,05821528/Área + 0,3015916863·ln(Banheiros) + 0,1662663815/Distância(km)

| Termo | β | EP | t | p |
|---|---|---|---|---|
| Intercepto | 2,789226611 | 0,114500 | 24,36 | 0,00% |
| 1/Área | 56,05821528 | 9,000510 | 6,23 | 0,0065% |
| ln(Banheiros) | 0,3015916863 | 0,060887 | 4,95 | 0,043% |
| 1/Distância (km) | 0,1662663815 | 0,042786 | 3,89 | 0,254% |

Em km, 0,16627 equivale a 166,2663815 em metros, que é o coeficiente do SisDEA.

## 5) Indicadores
- R² = 0,8781829.
- R² ajustado = 0,8449601.
- r = 0,9371142. O r de estimativa é 0,9612.
- F = 26,4331; significância do modelo = 0,0025%.
- Outliers: 0 (maior |Resíduo/DP| = 1,92).

## 6) Avaliando usado
- Área 152,52; Banheiros 2; Distância 0,35 km (350 m).
- Os três estão dentro da faixa das amostras, então não há extrapolação.

## 7) Projeção
- **Não há projeção oficial gravada.** Nenhuma linha foi encontrada nas tabelas de projeção da 005/2026.
- Existe só a projeção preliminar desta execução:

| Centro | Mínimo | Central | Máximo | Amplitude | Grau |
|---|---|---|---|---|---|
| Moda | 41,13 | 45,45 | 50,22 | 20,01% | III |
| Mediana | 42,14 | 46,57 | 51,46 | 20,01% | III |
| Média | 42,66 | 47,14 | 52,09 | 20,01% | III |

## 8) Comparação com o SisDEA
| Item | SiDIF | SisDEA | Bate? |
|---|---|---|---|
| n / transformações | 15 / LN, 1/x, LN, 1/x | igual | Sim |
| Coeficientes | 2,789227 / 56,05822 / 0,301592 / 166,2664 por m | igual | Sim |
| t (Área, Banheiros, Distância) | 6,23 / 4,95 / 3,89 | igual | Sim |
| Significância | 0,01% / 0,04% / 0,25% | igual | Sim |
| R² / r / F | 0,8781829 / 0,9371142 / 26,433 | igual | Sim |
| Significância do modelo | 0,0025% | ≈0,00% | Sim |
| Outliers | 0 | 0 | Sim |
| Moda / Mediana / Média | iguais na preliminar | iguais | Sim, mas ainda não oficial |
| Relação esperada de Banheiros | NEGATIVA | positiva | **Não** |

## 9) Amostras do conjunto v2
As 15 amostras congeladas têm área, banheiros, distância em km e valor unitário iguais à tabela, com as mesmas casas. Os valores observados na regressão são os mesmos (20,00; 27,03; 31,25; …; 69,00).

## Pendências (nada executado)
1. Mudar a relação esperada de Banheiros para positiva. Isso só afeta a validação e não recalcula o modelo.
2. Aceitar o Modelo 3 e confirmar a projeção, para que a moda, a mediana e a média passem a ser oficiais.
