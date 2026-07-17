# Documentos de Encerramento da Obra (TRP · TRD · ACT)

Este é um escopo grande. Proponho entregar em **6 fases**, cada uma revisável antes da próxima. Nenhuma fase altera a lógica atual de medições, importações, aditivos ou cálculos — apenas **consome** os dados existentes e acrescenta o que faltar (migrations não destrutivas, campos nullable).

---

## Antes de codar — decisões pendentes

Preciso confirmar 4 pontos que impactam schema/UX. Se estiver tudo ok pode responder "ok" e eu sigo.

1. **DPG (Defensora Pública-Geral)** — nova tabela `dpg_gestao` (vigências + cargo + CPF + condição titular/substituta/em exercício). OK criar?
2. **Catálogo de sistemas/serviços da edificação** — nova tabela `catalogo_sistemas_servicos` (seedada com a lista de referência, editável por admin). OK?
3. **Endereço e CNPJ institucional da Defensoria** — armazenar em nova tabela `config_institucional` (chave/valor) ou como constantes em código com override no admin? Sugestão: tabela `config_institucional` singleton editável por admin.
4. **Bucket dos documentos gerados** — novo bucket privado `documentos-encerramento` com URLs assinadas (não reutilizar `documents` para não misturar). OK?

---

## Fase 1 — Fundação de dados (migrations não destrutivas)

**Reutilização (nada é duplicado):**
- `obras` → nome, contrato, valor, datas, fiscal_id, empresa_id, coords/endereço parcial
- `empresas` → razão social, CNPJ, endereço, representante
- `aditivos` / `aditivo_sessions` / `aditivo_items` → aditivos financeiros e de prazo
- `medicoes` / `medicao_items` / `orcamento_items` → quantidades executadas acumuladas
- `obra_fiscal_substitutos` → substitutos
- `profiles` → dados de servidores/fiscais

**Novos campos em `obras` (todos nullable):**
- `endereco_completo`, `numero_art_execucao`, `area_interferencia_m2`
- `data_recebimento_provisorio`, `data_recebimento_definitivo`, `prazo_observacao_dias` (default 90)
- `configuracao_edificacao` (enum: `terrea`/`2_pav`/`3_pav`/`4_mais_pav`/`custom`), `descricao_edificacao_custom`
- `condicao_imovel` (enum: `proprio`/`locado`/`cedido`/`outro`), `condicao_imovel_custom`
- `descricao_tecnica_imovel`, `objeto_contrato`
- `sistemas_servicos_ids` (uuid[]) — FK lógica para catálogo

**Novos campos em `empresas` (nullable):**
- endereco/numero/complemento/bairro/cidade/estado/cep
- representante_legal_nome, representante_legal_cpf, representante_legal_cargo
- responsavel_tecnico_nome, responsavel_tecnico_cpf, responsavel_tecnico_profissao
- conselho_tipo (CREA/CAU), conselho_numero, conselho_uf

**Novas tabelas:**
- `dpg_gestao` (nome, cpf, cargo, condicao, vigencia_inicio, vigencia_fim, ativo, assinatura_url, observacoes)
- `catalogo_sistemas_servicos` (nome, texto_documento, ativo, ordem)
- `config_institucional` (singleton: razao_social, cnpj, endereco, cidade)
- `documentos_encerramento` (obra_id, tipo TRP/TRD/ACT, versao, data_emissao, snapshot_dados jsonb, arquivo_pdf_path, arquivo_docx_path, gerado_por, criado_em, justificativa_excecao, hash)
- `documento_assinantes` (documento_id, ordem, nome, cargo, cpf, complementos)

**Novos aditivos em `aditivos`:** `numero_art` (nullable), `nova_data_termino` (nullable) — se ainda não existirem.

GRANTs + RLS por perfil (admin/gestor/fiscal/consulta), CPF restrito via view/policy.

---

## Fase 2 — Cadastros administrativos (UI)

- Admin > **Gestão institucional** → CRUD `config_institucional`, `dpg_gestao` (com timeline de vigências), `catalogo_sistemas_servicos`.
- **Empresas**: estender formulário com endereço, representante legal e responsável técnico (CPF mascarado, botão "revelar" para admin/gestor).
- **Obra – aba nova "Encerramento (Cadastro)"**: campos complementares da obra (datas de recebimento, prazo observação, configuração edificação, condição imóvel, ART, área, sistemas/serviços multi-select, descrição técnica).

---

## Fase 3 — Motor de dados + validação

- Hook `useEncerramentoData(obraId)` agrega:
  - obra + empresa + fiscal + substitutos + aditivos ordenados + medição final (executado acumulado) + DPG vigente na data de emissão + config institucional + catálogo selecionado.
- Utilitário `validarDocumento(tipo, dados)` retorna `{ok, faltantes[], alertas[]}` conforme regras da seção 14.
- Utilitários puros:
  - `formatarDataPorExtenso(date)` → "1º de novembro de 2026" / "7 de novembro de 2026"
  - `montarLinhasAditivos(aditivos)` → linhas de valor e de prazo (só quando alteram)
  - `montarTextoSistemas(itens)` → junção com vírgulas + "e" antes do último
  - `descricaoEdificacao(config, custom)` → "edificação térrea" etc.
  - `calcularValorFinal(inicial, aditivos)` → algébrico com supressões
  - `selecionarDpgVigente(dpgs, dataEmissao)` → única ou erro

---

## Fase 4 — UI Aba "Documentos de encerramento"

Nova aba dentro do detalhe da obra (`ObraDetails.tsx`) com 3 cards TRP/TRD/ACT:
- status (não preenchido / pronto / gerado), última versão, autor, data.
- Ações: **Preencher/Conferir** (abre modal de conferência), **Visualizar**, **Exportar PDF**, **Exportar DOCX**.

Modal de conferência (por tipo):
- Resumo dos dados consumidos.
- Lista de **campos ausentes** (bloqueia geração) e **alertas**.
- Seletor de responsáveis pelas assinaturas (fiscal/comissão/representante empresa/DPG).
- Data de emissão (default hoje, editável, Cuiabá/MT fixo).
- Campos específicos: TRP (data recebimento provisório, prazo obs.); TRD (data recebimento definitivo + alerta se antes de TRP+prazo, com justificativa); ACT (fonte quantitativos, objeto editável, descrição final editável).
- **Preview** renderizado.
- Só libera exportar após validação.

---

## Fase 5 — Geração de documentos (PDF + DOCX)

**Não usar screenshot.** Geração server-side via edge function `generate-encerramento-doc`:
- **DOCX**: `docx` (npm) — cabeçalho institucional (logo + textos), rodapé, data no canto superior direito, títulos, parágrafos, blocos de assinatura, e para o ACT a tabela `Anexo 1` com repetição de header (`tableHeader: true`), keep-together de linhas quando viável, quebra de descrição, numeração de páginas.
- **PDF**: converter DOCX → PDF via LibreOffice headless na edge function **ou** gerar direto com `pdfmake` mantendo mesma diagramação. Decisão: **pdfmake** (mais previsível em edge; sem dependência de binário). Confirma?
- ACT planilha: só `Item · Código · Banco · Descrição · Unidade · Quantidade`; filtra `quantidade_executada = 0`; preserva hierarquia e ordenação `1, 1.1, 1.1.1`; vírgula decimal; alto máximo por linha adaptável.
- Salva PDF e DOCX no bucket `documentos-encerramento`, registra em `documentos_encerramento` com snapshot completo (imutável).
- Versionamento incremental (v1, v2, …). Nome de arquivo padronizado.

---

## Fase 6 — Histórico, permissões, testes

- Aba "Versões" no card de cada documento — lista todas as versões, quem gerou, quando, download PDF/DOCX, justificativa (se houver).
- Snapshot garante que edições posteriores não alteram documentos emitidos.
- RLS por perfil conforme seção 17.
- Testes manuais roteirizados nos 14 cenários da seção 18 + QA visual dos 3 documentos.

---

## O que **não** será tocado (garantia explícita)

- `orcamento_items`, `medicao_items`, `medicoes`, `medicao_sessions`, `aditivo_*` — schema e cálculos inalterados.
- `ImportarPlanilha`, `ImportarDoRDO`, `ImportarCronograma`, `excelUtils` — inalterados.
- RPCs de progresso, snapshots, congelamento — inalterados.
- Políticas RLS existentes — apenas somamos novas para as novas tabelas.

---

## Entregáveis por fase

Cada fase termina com: migrations aplicadas, typecheck limpo, screenshots do que foi entregue, e sua aprovação para seguir.

**Estimativa de tamanho:** Fase 1 (schema) + Fase 2 (cadastros) já são um chat grande. Sugiro rodar **Fase 1 primeiro isoladamente**, você aprova a migration, e daí seguimos.

Confirma as 4 decisões acima + começamos pela Fase 1?
