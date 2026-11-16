# Diagnóstico Tapurah 005/2026 — segunda revisão (somente leitura)

Nada foi alterado. Este documento é o relatório; aprovar não executa nenhuma correção.

## 1. Modelo mais recente
- Modelo 2 (15b5cc4b…), EM_VALIDACAO, não desatualizado, criado 16/11 14:52:23.
- Usa o conjunto v2 (57f6a360…), CONGELADO em 16/11 14:52:15.
- Conjunto v1 (36e000a4…) está SUPERADO; o Modelo 1 continua ligado a ele, marcado desatualizado ("Correção de dados (1 campo)").

## 2. Amostras congeladas no v2 (15, todas "No modelo")
Todas as 15 batem com a tabela do SisDEA em área, banheiros e valor unitário (mesmas casas decimais, sem recálculo).
Distância: **todas em km**, inclusive a ID 1 (0,65). A mistura metros/km da primeira revisão foi corrigida e entrou no snapshot.
Diferença só de escala: SisDEA em metros (650), SiDIF em km (0,65). A variável está cadastrada com unidade "km".

## 3. Transformações persistidas no Modelo 2
| Variável | SisDEA | SiDIF |
|---|---|---|
| Valor unitário (dependente) | ln(y) | **LN** (ok) |
| Área | 1/x | **DIRECT** (diverge) |
| Banheiros | ln(x) | **LN** (ok) |
| Distância | 1/x | **DIRECT** (diverge) |
| Vagas | fora | fora (ok) |
n=15, k=3 (ok).
Transformações liberadas no cadastro das variáveis: Área [DIRECT], Distância [DIRECT], Banheiros [LN], Valor unitário [LN]. Por isso o Assistido não podia testar 1/x.
Relação esperada: Banheiros e Distância ainda estão "NEGATIVA", Área "NEGATIVA".

## 4. Estatística do Modelo 2
ln(VU) = 4,138580 − 0,0029831·Área + 0,248096·ln(Banh) − 0,081708·Dist(km)

| Regressor | β | EP | t | sig |
|---|---|---|---|---|
| Intercepto | 4,138580 | 0,144492 | 28,64 | ≈0% |
| Área | −0,0029831 | 0,000634 | −4,71 | 0,06% |
| ln(Banheiros) | 0,248096 | 0,082218 | 3,02 | 1,17% |
| Distância | −0,081708 | 0,109629 | −0,75 | 47,17% |

R² 0,770345 · R² aj. 0,707711 · r ≈ 0,8777 · F 12,299 · p(F) 0,078% · amplitude 22,99% · Grau III.

## 5. Comparação com o SisDEA
- R² 0,7703 vs 0,8782; F 12,30 vs 26,43.
- Maior divergência: **Distância** — t −0,75 (47%) vs 3,89 (0,25%). Na forma direta a distância não explica nada; em 1/x ela é forte.
- Área também diverge: t −4,71 em forma direta vs 6,23 em 1/x.
- Banheiros: 0,2481 vs 0,3016 (mesma forma ln, diferença causada pelas outras duas variáveis).

## 6. Avaliando usado no cálculo
Área 152,52 · Banheiros 2 · Distância 0,35 km (= 350 m, coerente com as amostras).
Estimativa central gravada: 45,92 R$/m² (SisDEA moda 45,45). Nenhuma projeção oficial foi gravada para o Modelo 2, então não há limites/moda/mediana/média persistidos.

## 7. Conjuntos e dados vivos
- v1 superado → Modelo 1 (desatualizado). v2 congelado → Modelo 2 (atual, sem aviso).
- O Modelo 2 não usa snapshot antigo: o v2 já tem as distâncias corrigidas.

## Divergências encontradas (mais provável primeiro)
1. **Distância em DIRECT, não 1/x** — principal causa (t 0,75 vs 3,89). Só DIRECT está liberada na variável.
2. **Área em DIRECT, não 1/x** — só DIRECT está liberada.
3. **Relação esperada de Banheiros = NEGATIVA** — SisDEA mostra efeito positivo; pode gerar alerta de coerência (não muda coeficientes).
4. **Unidade da distância km vs m** — não altera R², t nem estimativa; em 1/x só muda a escala do coeficiente (166,27/m equivale a 0,16627/km).
5. Dados das amostras e do avaliando: **sem divergência**.

Para reproduzir o SisDEA: liberar 1/x em Área e Distância, mudar Banheiros para positiva, congelar v3 e gerar novo modelo. Só faço com sua autorização.
