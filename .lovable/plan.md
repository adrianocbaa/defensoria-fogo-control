## Objetivo

Adicionar dois modos de cálculo ao módulo de Dimensionamento de Calhas (NBR 10844:1989):
1. **Modo Verificação** — fluxo atual (usuário define calha e o sistema valida).
2. **Modo Dimensionamento Automático** — usuário informa apenas telhado/chuva/material/declividade e o sistema escolhe a melhor calha comercial de uma biblioteca, sugerindo descidas e diâmetro dos condutores.

Incluir biblioteca de calhas comerciais cadastrável, classificação das soluções e memorial de cálculo da solução adotada + alternativas.

## Mudanças

### 1. Seleção de modo no início do fluxo
- Novo passo inicial no `DimensionamentoCalhas.tsx` (antes do cadastro) ou toggle no topo: `Verificação` × `Dimensionamento automático`.
- O stepper se adapta:
  - **Verificação**: cadastro → chuva → panos → calhas → cálculo → condutores → resultados → relatório (fluxo atual).
  - **Automático**: cadastro → chuva → panos → parâmetros (material/declividade/descidas) → **seleção automática** → resultados → relatório.

### 2. Biblioteca de calhas comerciais
- Persistência local (localStorage) com mesmo padrão do `projetoCalhasStorage.ts`.
- Novo arquivo `src/lib/bibliotecaCalhasStorage.ts` com CRUD.
- Itens com: `tipo` (semicircular/retangular/trapezoidal), `largura_m`, `altura_m`, `diametro_m`, `base_menor_m`, `base_maior_m`, `material`, `manning_n`, `observacoes`. Capacidade é calculada na hora (não armazenada) para refletir declividade do projeto.
- Tela de gestão acessível via botão no header do módulo: `BibliotecaCalhasManager.tsx` (lista + form + seed inicial com tamanhos comuns de PVC/galvanizado).

### 3. Motor de dimensionamento automático
- Novo `src/lib/dimensionamentoAutomatico.ts`:
  - Recebe: vazão de projeto total, parâmetros (declividade, material padrão, nº descidas) e biblioteca.
  - Para cada calha da biblioteca, calcula capacidade via Manning (reaproveita `geometriaSecaoPlena` e `vazaoManningM3s` de `calhaCalculo.ts`, parametrizando declividade e n).
  - Calcula vazão por descida = Q_total / nº_descidas e compara com capacidade da calha entre descidas.
  - Classifica cada opção por **fator de segurança** F = Q_cap / Q_proj:
    - `nao_atende` F < 1
    - `atende_limite` 1 ≤ F < 1.2
    - `atende` 1.2 ≤ F < 1.5
    - `atende_com_folga` F ≥ 1.5
  - Retorna: solução recomendada (menor seção com F ≥ 1.2), dimensão mínima absoluta (menor F ≥ 1), alternativas (lista classificada), e diâmetro mínimo do condutor vertical (usa `condutorVertical.ts` existente).
  - Sugestões: "aumentar seção" (próxima da lista) e "aumentar descidas" (recalcula com n+1 descidas).

### 4. Novo step de parâmetros + resultado automático
- `ParametrosAutomaticoStep.tsx`: form com material (lista do `MATERIAIS_CALHA`), declividade %, nº pontos de descida, margem de segurança alvo.
- `DimensionamentoAutomaticoStep.tsx`: roda o motor, mostra:
  - Card "Solução recomendada" (dimensão, material, capacidade, F, descidas, Ø condutor).
  - Tabela "Alternativas analisadas" com badges coloridos por classificação.
  - Card "Sugestões" (aumentar seção / aumentar descidas).

### 5. Memorial atualizado
- Estender `memorialCalhas.ts` para receber modo e, no modo automático, imprimir:
  - Parâmetros de entrada.
  - Solução adotada (com fórmulas).
  - Tabela completa de alternativas analisadas com classificação.
  - Observações da NBR mantidas.

### 6. Tipos/zod
- Estender `panoSchema` não é necessário; criar `bibliotecaCalhaSchema.ts` reaproveitando campos do `calhaSchema` (sem comprimento/declividade/pontos de descida).

## Arquivos novos
- `src/lib/bibliotecaCalhasStorage.ts`
- `src/lib/dimensionamentoAutomatico.ts`
- `src/components/dimensionamento/calhas/BibliotecaCalhasManager.tsx`
- `src/components/dimensionamento/calhas/ParametrosAutomaticoStep.tsx`
- `src/components/dimensionamento/calhas/DimensionamentoAutomaticoStep.tsx`
- `src/components/dimensionamento/calhas/bibliotecaCalhaSchema.ts`

## Arquivos editados
- `src/pages/DimensionamentoCalhas.tsx` — toggle de modo, stepper condicional, integração da biblioteca.
- `src/lib/memorialCalhas.ts` — memorial do modo automático.
- `src/components/dimensionamento/calhas/RelatorioStep.tsx` — props para modo automático.

## Notas técnicas
- Persistência continua em localStorage (mesmo padrão do módulo).
- Classificação por F é parametrizável (constantes no topo do motor).
- Diâmetro do condutor vertical reaproveita `nbr10844Tabela5.ts` / `condutorVertical.ts` já existentes.
