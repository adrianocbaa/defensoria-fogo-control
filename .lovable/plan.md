# Recebimento de Obra — novo modo de checklist

Adiciona um segundo modo de checklist ao módulo Obras, sem alterar o checklist dinâmico (PDF/projeto) existente. Ao entrar em `/obras/:id/checklist`, o usuário escolhe:

- **Dinâmico com Projeto** (atual, intocado)
- **Recebimento de Obra** (novo, por lista de serviços)

A escolha fica lembrada por obra (localStorage) e pode ser trocada a qualquer momento por um seletor no topo.

## Modelagem de dados (novas tabelas)

Reutiliza `obras`, `auth.users`/`profiles`, RLS via `can_edit_obra`/`user_has_obra_access`/`is_admin`, e o bucket de storage existente `checklist-fotos`.

```text
recebimento_vistorias        obra_id, tipo (provisorio|reinspecao|definitivo), status,
                             data, iniciado_em, concluido_em, fiscal_id, observacoes
recebimento_ambientes        vistoria_id, obra_id, nome, tipo_modelo, pavimento,
                             observacoes, ordem
recebimento_ambiente_servicos  ambiente_id, macro, servico, ordem   (serviço aplicado ao ambiente)
recebimento_verificacoes     ambiente_servico_id, ambiente_id, vistoria_id, obra_id,
                             descricao, ordem, status (nao_vistoriado|conforme|nao_conforme|
                             nao_executado|nao_aplica), respondido_por, respondido_em
recebimento_pendencias       verificacao_id, ambiente_id, vistoria_id, obra_id, titulo,
                             descricao, classificacao (acabamento|funcional|seguranca|
                             acessibilidade|instalacao|outro), prazo_correcao,
                             situacao (pendente|correcao_registrada|sanada|reprovada)
recebimento_fotos            obra_id, vistoria_id, ambiente_id, pendencia_id?, tipo
                             (ocorrencia|correcao|geral), url, legenda, autor, created_at
recebimento_pendencia_historico  pendencia_id, evento, situacao_anterior, situacao_nova,
                             observacao, autor, created_at
biblioteca_servicos          macro, servico, verificacoes text[], keywords, escopo
                             (global|obra), obra_id?, is_ativo
```

Estrutura relacional (sem JSON monolítico), com GRANTs + RLS por obra seguindo o padrão atual. A biblioteca global é semeada com as 30 macros / famílias / verificações da especificação. `recebimento_ambiente_servicos` não tem vínculo 1:1 com item orçamentário — fica aberto para a integração futura com a planilha e com TRP/TRD.

## Interface

- Rota mantida: `/obras/:obraId/checklist` com seletor de modo.
- Nova área **Recebimento** com abas: Visão Geral · Checklist · Pendências · Fotos · Histórico · Relatório (tabs com scroll horizontal no mobile).
- **Checklist mobile-first**: cards/accordion por ambiente → serviço → verificações; botões grandes de status (segmented), ação prioritária **✓ Marcar todos como Conforme** e **Marcar grupo como N/A** por grupo; barra de progresso por ambiente e geral; barra fixa inferior com Anterior / 📷 Foto / Próximo e seletor rápido de ambiente.
- **Não Conforme** abre bottom sheet: descrição, fotos (câmera/galeria, múltiplas), classificação, prazo, observação → cria pendência automaticamente.
- Templates de ambiente (Sala/Gabinete, Banheiro, Banheiro PCD, Copa, Circulação, Área Externa) e **Duplicar ambiente** (copia só a estrutura).
- Busca de serviços com "mais utilizados" e "recentes"; item personalizado com opção de salvar só na obra ou na biblioteca global (admin).
- **Pendências**: agrupadas por ambiente, filtros (todas/pendentes/corrigidas/reprovadas/classificação) e busca; detalhe com Antes/Depois, histórico e "Registrar Correção" (não sana automaticamente).
- **Reinspeção**: carrega só pendências abertas, com Sanada / Continua Pendente e novo registro no histórico (nada é sobrescrito).
- **Visão Geral**: contadores de ambientes, itens por status, pendências abertas/sanadas, progresso, pendências por classificação.
- **Relatório**: reutiliza o padrão institucional de PDF já usado no módulo Obras, com resumo, pendências e fotos antes/depois.
- Finalizar Vistoria confirma quando há itens não vistoriados, com atalho "Ver itens pendentes".

## Detalhes técnicos

- Autosave por verificação com feedback discreto "Salvo ✓" e erro explícito em falha.
- Fotos: compressão/redimensionamento no cliente antes do upload (padrão do `ImageProcessor`), thumbnails + lazy loading, URLs assinadas via `signChecklistUrl`.
- Queries em lote (sem N+1), `.limit(10000)` nas listagens, carregamento por ambiente.
- Auditoria: autor/data em respostas, pendências e histórico; vistoria encerrada exige registro no histórico para alterações.
- Componentes shadcn existentes (Card, Sheet, Tabs, Badge, AlertDialog) e identidade visual do módulo Obras.

## Ordem de execução

1. Migração + seed da biblioteca + seletor de modo e casca da aba Recebimento
2. Ambientes, templates, duplicação
3. Checklist, status, ações em massa, progresso, autosave
4. Pendências + fotos
5. Reinspeção + histórico
6. Visão Geral + Relatório
