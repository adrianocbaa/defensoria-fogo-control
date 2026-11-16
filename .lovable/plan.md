# Diagnóstico Tapurah (005/2026) — somente leitura

Nada foi alterado. Avaliação 005/2026, Tapurah/MT, etapa VALIDACAO. Conjunto v1 congelado 16/11 14:17 UTC. Modelo 1 (Assistido, EM_VALIDACAO).

## 1) Amostras
15 amostras; 15 "Usar"; 15 "No modelo". Todas as 15 estão no conjunto v1.

Área, banheiros, vagas e valor unitário: os 15 batem com o SisDEA.

**Divergência na distância ao polo (unidades misturadas):**
- ID1 (Av. dos Pioneiros, 174) = **650**, em metros
- IDs 2 a 15 em **km**: 1,2; 0,4; 1,6; 0,45 (x3); 1,6; 1,3; 1,5; 0,45; 0,25; 2,1; 0,55; 1,2
- Avaliando = 0,35 (km)
- SisDEA usa tudo em metros (650, 1200, 400…, avaliando 350).

Obs.: a distância está gravada como atributo mestre do imóvel (`imovel_atributos.DISTANCIA_POLO`), e não como valor contextual da avaliação.

## 2) Modelagem — diferenças com o SisDEA
| Variável | SiDIF | SisDEA |
|---|---|---|
| Valor unitário (dep.) | direta (y) | ln(y) |
| Área construída | direta (x), relação NEGATIVA | 1/x |
| Banheiros | direta (x), relação **NEGATIVA** | ln(x) (coef. positivo) |
| Distância ao polo | direta (x), relação NEGATIVA | 1/x |
| Vagas | fora (não é variável da avaliação) | fora |

As 4 variáveis estão com transformações autorizadas = [DIRECT] apenas. Por isso o modo Assistido não pôde testar ln ou 1/x. Rodada 1: n=15, k=3 (igual ao SisDEA).

## 3) Modelo 1 (execução atual)
`Valor unitário = 56,15338 − 0,0021778×Distância + 3,12917×Banheiros − 0,115835×Área`

| Regressor | β | EP | t | p |
|---|---|---|---|---|
| Intercepto | 56,15338 | 6,21478 | 9,035 | 0,0002% |
| Distância | −0,0021778 | 0,017270 | −0,126 | **90,19%** |
| Banheiros | 3,129174 | 1,038632 | 3,013 | 1,18% |
| Área | −0,115835 | 0,028788 | −4,024 | 0,20% |

R² = 0,7131 · R² aj. = 0,6349 · r ≈ 0,8445 · F = 9,114 · sig F = 0,26%.
SisDEA: R² 0,8782 · F 26,433.

Estimativa central preliminar **44,74 R$/m²**, amplitude do IC 18,00%, grau III. Não há projeção formal gravada, e a faixa mín/máx não foi persistida.

## 4) Avaliando
Av. das Flores, 1772: área 152,52 (igual), banheiros 2 (igual), distância **0,35** (SisDEA 350). Valor solicitado pelo proprietário: R$ 7.500/mês, o que dá cerca de 49,17 R$/m² na área de 152,52.

## Diferenças objetivas
1. Distância em unidades misturadas: ID1 em metros e os demais mais o avaliando em km. Isso explica o p = 90%.
2. Transformações limitadas a "direta" nas 4 variáveis; o SisDEA usa ln(y), 1/x, ln(x) e 1/x.
3. A relação esperada de Banheiros está NEGATIVA; no SisDEA o efeito é positivo.

## Correção sugerida (só se autorizada; nada foi feito)
- Padronizar a distância em uma única unidade (metros, como no SisDEA), incluindo o ID1 e o avaliando.
- Liberar ln/1/x nas transformações autorizadas e ajustar a relação de Banheiros para POSITIVA.
- Congelar o conjunto v2 e gerar um novo modelo. O v1 e o Modelo 1 ficam preservados.
