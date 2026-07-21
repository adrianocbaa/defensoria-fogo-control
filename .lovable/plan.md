
# Etapa 1 — Auditoria do RDO (Criação / Edição)

Levantamento completo do que existe hoje. **Nada será alterado antes da sua aprovação.** As 21 referências do `RDO_NEW.zip` foram conferidas contra o código atual.

---

## 1. Rotas e componentes atuais

**Rotas**
- `/obras/:obraId/rdo/resumo` → `src/pages/RDO.tsx` (calendário/lista/relatórios — já refatorada anteriormente).
- `/obras/:obraId/rdo?data=YYYY-MM-DD&step=N` → `src/pages/RDODiario.tsx` (**alvo desta etapa** — criação/edição).
- `/rdo/verify/:token` → `RdoVerify.tsx`.
- `/publico/rdo/:token` → `PublicRDO.tsx`, `PublicRDODiario.tsx`.

**Componentes envolvidos em `RDODiario.tsx`**
- Cabeçalho + ações (atualmente via `SimpleHeader` + linha de botões: Voltar, ← →, Salvar, Concluir, Reabrir, Excluir, PDF).
- Stepper: `src/components/rdo/RdoStepper.tsx` (8 etapas fixas).
- Steps: `AnotacoesStep`, `AtividadesStep` (+ `AtividadesManualMode`, `AtividadesPlanilhaMode`, `AtividadesTemplateMode`, `PlanilhaTreeView`), `OcorrenciasStep`, `VisitasStep`, `EquipamentosStep`, `MaoDeObraStep`, `EvidenciasStep`, `AssinaturasStep`.
- Diálogos: `ChooseModeDialog`, `RdoApprovalDialog`, `ActivityNoteDialog`, `ItemExecutionDetailsDialog`, `SignatureCanvas`, `AlertDialog` de exclusão/reabertura.

**Fonte única de estado**
- Hook `useRdoForm(obraId, data)` retorna `formData`, `updateField`, `saveNow`, `conclude`, `reopen`, `deleteRdo`, `ensureRdoExists`, `isSaving`, `hasChanges`.
- Outras fontes usadas pelos steps: `useRdoConfig`, `useRdoData`, `useRdoRestrictions`, `useRdoTemplates`, `useAditivosParaRdo`, `useRdoActivitiesAcumulado`, `useRdoAuditLog`.
- `window.rdoSavePending` é usado para flush do autosave de atividades antes de trocar de step.

## 2. Banco, buckets e integrações (não serão tocados)

Tabelas: `rdo_reports` (principal), `rdo_activities`, `rdo_activity_notes`, `rdo_workforce`, `rdo_equipment`, `rdo_occurrences`, `rdo_visits`, `rdo_media`, `rdo_comments`, `rdo_audit_log`, `rdo_config`, `rdo_templates_atividades`, `rdo_dias_sem_expediente`, `rdo_notificacoes_enviadas`, `rdo_ui_prefs`.
Storage: bucket `rdo-photos` (paths atuais preservados).
Edge functions: `rdo-sync-activities`, `generate-rdo-pdf`, `notify-rdo-delay`.
RPCs/triggers: cálculo de balanço, notificação, numeração sequencial.

**Nenhuma migration, RLS, bucket, RPC ou função será alterada nesta refatoração.**

## 3. Regras atuais mapeadas

- Numeração automática (trigger no `rdo_reports`) — preservada.
- Status válidos: `rascunho`, `preenchendo`, `concluido`, `aprovado`, `reprovado`.
- Modo de atividade é **por obra** (`rdo_config.modo_atividades`), pode ser **alterado** pelo Fiscal via botão “Alterar Modo” (não é irreversível — o modal do Figma será ajustado para refletir isso).
- `canEdit = obraConcluida ? false : (isAdmin || isContratada ? canEditRDO : canEditObra)` — permissão mantida.
- Salvamento: manual via `saveNow` + salvamento por campo nos steps (atividades usam autosave com debounce). **Não há autosave global.**
- Exclusão: `deleteRdo` com AlertDialog, apenas admin/fiscal com permissão.
- Navegação anterior/próximo RDO: por data via `useRdoData`.
- Pendências reais: derivadas de validações dos hooks (fotos sem descrição, campos obrigatórios do step, assinatura). Não existe hoje o "checklist de integridade" completo do Figma — será derivado só das validações existentes.
- Somente leitura: banner + RLS. Preservado.

## 4. Mapa Figma × Sistema atual

| Referência Figma | Corresponde a | Ação |
|---|---|---|
| Sidebar verde + item "Obras" ativo | Layout do SiDIF (não presente em `RDODiario.tsx`) | **Migrar** para `ObrasLayout` compartilhado |
| Cabeçalho com breadcrumb + `RDO Nº X` + status + Voltar/← → | Header atual (`SimpleHeader` + linhas soltas) | Substituir visualmente, mesmos dados |
| Stepper de 8 etapas com contadores e status | `RdoStepper` (mostra só ícone/label) | Adicionar contadores/status derivados de dados já carregados |
| Painel lateral “Resumo do RDO” + Pendências | Não existe hoje | Aditivo visual — consome dados já disponíveis; nenhuma nova regra |
| Matriz Manhã/Tarde/Noite × Clima/Condição | Campos individuais em `AnotacoesStep` | Reorganizar visual; mesmos campos do form |
| Modal “Defina o Modo…” | `ChooseModeDialog` | Ajustar texto (permite alterar; não é irreversível) |
| Atividades — Planilha (tabela com Previsto/Exec/Acum/Saldo/%) | `AtividadesPlanilhaMode` + `PlanilhaTreeView` | Reestilizar tabela; **manter** cálculo/hierarquia atual |
| Atividades — Manual (cards com #, descrição, unidade, qtd, local, obs, Pronto/Pendente, duplicar) | `AtividadesManualMode` (descrição + slider progresso + status em_andamento/concluida + obs) | ⚠️ **Divergência**: Figma tem `unidade`, `qtd`, `local`, badge Pronto/Pendente e **duplicar**. Atual tem `progresso` (slider) e `status`. **Preservar campos atuais**; só reorganizar visualmente. Duplicar exigirá aprovação. |
| Atividades — Modelo Padrão | `AtividadesTemplateMode` + `useRdoTemplates` | Reestilizar; sem novo motor de templates |
| Ocorrências | `OcorrenciasStep` | Reestilizar; **manter** enum atual de gravidade. **Não** adicionar “dias de impacto” do Figma |
| Visitas | `VisitasStep` | Reestilizar. **Não** adicionar entrada/saída/duração do Figma |
| Equipamentos | `EquipamentosStep` | Reestilizar. **Não** adicionar "repetir de ontem" |
| Mão de Obra | `MaoDeObraStep` | Reestilizar. **Não** adicionar "copiar equipe anterior" |
| Evidências (Fotos + Vídeos + Anexos + upload em andamento) | `EvidenciasStep` | Reestilizar galeria; **manter** bucket/paths; lightbox = aditivo visual |
| Assinaturas + Comentários + Checklist de integridade | `AssinaturasStep` + `SignatureCanvas` + `rdo_comments` | Reestilizar. Checklist será derivado das validações que **já existem** |
| Estado com pendências / estado completo | Vindo das validações atuais | Só apresentação |
| Confirmação de exclusão | `AlertDialog` atual | Manter comportamento; substituir visual |
| Somente leitura (banner azul + campos travados) | `readOnly` atual | Só apresentação |
| Estado de salvamento (Salvando/Salvo/Erro) | `isSaving` do `useRdoForm` | Só apresentação. **Não** implementar autosave global |
| Upload em andamento (arquivo + %) | Upload atual em `EvidenciasStep` | Se o hook atual não expõe progresso real, usar indeterminado |
| Mobile: step drawer + “Salvar e Ir para Resumo” | Não existe hoje | Aditivo visual; o botão executa `saveNow` + navegar (não é conclusão) |

## 5. Divergências que precisam da sua decisão antes de codar

1. **Cabeçalho do card lateral “Resumo do RDO”**: exibir `Fiscal Responsável` e `Clima Resumido` derivados dos dados atuais. OK?
2. **Contadores no stepper** (Atividades 12, Ocorrências 1 etc.): virão das queries já rodando em cada step. Aceita que sejam calculados no wrapper novo (`RdoFormStepper`) sem duplicar o estado?
3. **Modo Manual — Figma vs atual**: manter os campos atuais (`descrição`, `progresso %`, `status`, `observação`) e só reorganizar; ou você quer que eu apresente proposta separada para adicionar `unidade/qtd/local/duplicar`?
4. **Botão “Salvar e ir para Resumo” (mobile)**: mapear para `saveNow()` + navegar para `/obras/:id/rdo/resumo`. OK?
5. **Checklist de integridade da tela de Assinaturas**: derivar dos validadores que já existem em cada step. Se algum item do Figma não corresponder a validação real, será omitido. OK?
6. **Botão “Excluir”**: mover do cabeçalho para o menu ⋯ (kebab) mantendo o mesmo `AlertDialog`. OK?

## 6. Fora de escopo (não implementar sem sua ordem)

Autosave global, rascunho offline, copiar RDO/equipe/equipamentos anteriores, novos templates, novos campos/tabelas/status, drag-and-drop de ordenação, compressão de imagens, GPS, IA, integração meteorológica.

## 7. Estrutura de componentes de apresentação a criar

Puramente visuais, consumindo hooks/estado existentes:
`RdoFormLayout`, `RdoFormHeader`, `RdoFormStepper`, `RdoFormSummary` (painel lateral), `RdoFormFooterBar` (Voltar/Salvar/Próximo + estado de salvamento), `RdoMobileStepDrawer`, `RdoReadOnlyBanner`, `RdoUploadProgressItem`, `RdoIntegrityChecklist`, `RdoDeleteMenuAction`.

Os steps atuais (`AnotacoesStep`, `AtividadesStep`, etc.) e o `useRdoForm` **permanecem como fonte funcional** — os novos componentes são wrappers/skins.

---

**Aguardo:** aprovação geral + respostas aos 6 pontos da seção 5. Assim que autorizar, começo pela camada compartilhada (`RdoFormLayout` + header + stepper novo + painel de resumo) e sigo etapa por etapa.
