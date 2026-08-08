import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type {
  EntregaStatus,
  Impacto,
  PendenciaSituacao,
  Responsabilidade,
  VerificacaoStatus,
} from '@/lib/entrega/constants';

const db = supabase as any;

export interface EntregaVerificacao {
  id: string;
  ambiente_grupo_id: string;
  ambiente_id: string;
  entrega_id: string;
  obra_id: string;
  descricao_snapshot: string;
  status: VerificacaoStatus;
  observacao: string | null;
  respondido_por: string | null;
  respondido_em: string | null;
  ordem: number;
}

export interface EntregaGrupo {
  id: string;
  ambiente_id: string;
  grupo_snapshot: string;
  responsabilidade_padrao: Responsabilidade;
  ordem: number;
  verificacoes: EntregaVerificacao[];
}

export interface EntregaAmbiente {
  id: string;
  entrega_id: string;
  obra_id: string;
  recebimento_ambiente_id: string | null;
  nome: string;
  tipo_modelo: string | null;
  pavimento: string | null;
  observacoes: string | null;
  ordem: number;
  grupos: EntregaGrupo[];
}

export interface EntregaVistoria {
  id: string;
  obra_id: string;
  recebimento_definitivo_id: string | null;
  recebimento_definitivo_data: string | null;
  status: EntregaStatus;
  data: string;
  observacoes: string | null;
  iniciado_em: string;
  iniciado_por: string | null;
  resultado_congelado: 'apto' | 'apto_com_ressalvas' | 'nao_apto' | null;
  resultado_resumo: Record<string, unknown> | null;
  ciencia_em: string | null;
  ciencia_por: string | null;
  ciencia_observacoes: string | null;
  created_at: string;
}

export interface EntregaParticipante {
  id: string;
  entrega_id: string;
  user_id: string | null;
  nome_snapshot: string;
  papel: 'fiscal' | 'gestor' | 'diretoria' | 'outro';
  funcao_snapshot: string | null;
}

export interface EntregaPendencia {
  id: string;
  entrega_id: string;
  obra_id: string;
  ambiente_id: string | null;
  ambiente_grupo_id: string | null;
  verificacao_id: string | null;
  titulo: string;
  descricao: string | null;
  responsabilidade: Responsabilidade;
  responsavel_terceiro: string | null;
  impacto: Impacto;
  situacao: PendenciaSituacao;
  prazo_correcao: string | null;
  criada_por: string | null;
  sanada_em: string | null;
  cancelada_em: string | null;
  motivo_cancelamento: string | null;
  created_at: string;
}

export interface BibliotecaGrupo {
  id: string;
  nome: string;
  responsabilidade_padrao: Responsabilidade;
  ordem: number;
}

export interface EntregaTemplate {
  id: string;
  nome: string;
  tipo_modelo: string | null;
  ordem: number;
}

export interface RecebimentoDefinitivo {
  id: string;
  data: string;
  concluido_em: string | null;
  sequencia: number;
}

/** Núcleo da Entrega Institucional: vistoria, participantes, ambientes e checklist. */
export function useEntregaInstitucional(obraId: string) {
  const { user } = useAuth();
  const [entregas, setEntregas] = useState<EntregaVistoria[]>([]);
  const [entregaId, setEntregaId] = useState<string | null>(null);
  const [ambientes, setAmbientes] = useState<EntregaAmbiente[]>([]);
  const [participantes, setParticipantes] = useState<EntregaParticipante[]>([]);
  const [definitivo, setDefinitivo] = useState<RecebimentoDefinitivo | null>(null);
  const [templates, setTemplates] = useState<EntregaTemplate[]>([]);
  const [biblioteca, setBiblioteca] = useState<BibliotecaGrupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [ultimoSalvamento, setUltimoSalvamento] = useState<Date | null>(null);

  const entrega = useMemo(
    () => entregas.find((e) => e.id === entregaId) ?? null,
    [entregas, entregaId],
  );

  /* ------------------------------------------------------------------ carga */

  const fetchBase = useCallback(async () => {
    if (!obraId) return;
    setLoading(true);

    const [{ data: evs }, { data: rdef }, { data: tpls }, { data: grps }] = await Promise.all([
      db
        .from('entrega_vistorias')
        .select('*')
        .eq('obra_id', obraId)
        .order('created_at', { ascending: false })
        .limit(1000),
      db
        .from('recebimento_vistorias')
        .select('id, data, concluido_em, sequencia')
        .eq('obra_id', obraId)
        .eq('tipo', 'definitivo')
        .eq('status', 'concluida')
        .order('concluido_em', { ascending: false })
        .limit(1),
      db.from('entrega_templates').select('*').eq('ativo', true).order('ordem').limit(200),
      db
        .from('entrega_biblioteca_grupos')
        .select('*')
        .eq('ativo', true)
        .order('ordem')
        .limit(500),
    ]);

    const lista = (evs ?? []) as EntregaVistoria[];
    setEntregas(lista);
    setDefinitivo(((rdef ?? [])[0] as RecebimentoDefinitivo) ?? null);
    setTemplates((tpls ?? []) as EntregaTemplate[]);
    setBiblioteca((grps ?? []) as BibliotecaGrupo[]);
    setEntregaId((atual) => atual ?? lista[0]?.id ?? null);
    setLoading(false);
  }, [obraId]);

  useEffect(() => {
    fetchBase();
  }, [fetchBase]);

  const fetchChecklist = useCallback(async () => {
    if (!entregaId) {
      setAmbientes([]);
      setParticipantes([]);
      return;
    }
    const [{ data: ambs }, { data: grps }, { data: verifs }, { data: parts }] = await Promise.all([
      db
        .from('entrega_ambientes')
        .select('*')
        .eq('entrega_id', entregaId)
        .eq('ativo', true)
        .order('ordem')
        .limit(10000),
      db
        .from('entrega_ambiente_grupos')
        .select('*')
        .eq('entrega_id', entregaId)
        .eq('ativo', true)
        .order('ordem')
        .limit(10000),
      db
        .from('entrega_verificacoes')
        .select('*')
        .eq('entrega_id', entregaId)
        .eq('ativo', true)
        .order('ordem')
        .limit(10000),
      db.from('entrega_participantes').select('*').eq('entrega_id', entregaId).limit(1000),
    ]);

    const verifsPorGrupo = new Map<string, EntregaVerificacao[]>();
    for (const v of (verifs ?? []) as EntregaVerificacao[]) {
      const l = verifsPorGrupo.get(v.ambiente_grupo_id) ?? [];
      l.push(v);
      verifsPorGrupo.set(v.ambiente_grupo_id, l);
    }
    const gruposPorAmbiente = new Map<string, EntregaGrupo[]>();
    for (const g of (grps ?? []) as EntregaGrupo[]) {
      const l = gruposPorAmbiente.get(g.ambiente_id) ?? [];
      l.push({ ...g, verificacoes: verifsPorGrupo.get(g.id) ?? [] });
      gruposPorAmbiente.set(g.ambiente_id, l);
    }

    setAmbientes(
      ((ambs ?? []) as EntregaAmbiente[]).map((a) => ({
        ...a,
        grupos: gruposPorAmbiente.get(a.id) ?? [],
      })),
    );
    setParticipantes((parts ?? []) as EntregaParticipante[]);
  }, [entregaId]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  /* ------------------------------------------------- criação / preparação */

  /** Cria os grupos + verificações de um ambiente a partir de um template. */
  const aplicarTemplate = async (
    ambienteId: string,
    entrega: string,
    templateId: string,
  ): Promise<void> => {
    const { data: tgs } = await db
      .from('entrega_template_grupos')
      .select('ordem, grupo_id, entrega_biblioteca_grupos(id, nome, responsabilidade_padrao)')
      .eq('template_id', templateId)
      .order('ordem')
      .limit(500);

    const grupos = (tgs ?? []) as {
      ordem: number;
      grupo_id: string;
      entrega_biblioteca_grupos: {
        id: string;
        nome: string;
        responsabilidade_padrao: Responsabilidade;
      } | null;
    }[];
    if (!grupos.length) return;

    const { data: verifs } = await db
      .from('entrega_biblioteca_verificacoes')
      .select('id, grupo_id, descricao, ordem')
      .in(
        'grupo_id',
        grupos.map((g) => g.grupo_id),
      )
      .eq('ativo', true)
      .order('ordem')
      .limit(10000);

    const { data: criados } = await db
      .from('entrega_ambiente_grupos')
      .insert(
        grupos.map((g) => ({
          ambiente_id: ambienteId,
          entrega_id: entrega,
          obra_id: obraId,
          biblioteca_grupo_id: g.grupo_id,
          grupo_snapshot: g.entrega_biblioteca_grupos?.nome ?? 'Grupo',
          responsabilidade_padrao:
            g.entrega_biblioteca_grupos?.responsabilidade_padrao ?? 'contratada',
          ordem: g.ordem,
          created_by: user?.id ?? null,
        })),
      )
      .select();

    const linhas: Record<string, unknown>[] = [];
    for (const novo of (criados ?? []) as { id: string; biblioteca_grupo_id: string }[]) {
      const vs = ((verifs ?? []) as { id: string; grupo_id: string; descricao: string; ordem: number }[])
        .filter((v) => v.grupo_id === novo.biblioteca_grupo_id);
      for (const v of vs) {
        linhas.push({
          ambiente_grupo_id: novo.id,
          ambiente_id: ambienteId,
          entrega_id: entrega,
          obra_id: obraId,
          biblioteca_verificacao_id: v.id,
          descricao_snapshot: v.descricao,
          ordem: v.ordem,
        });
      }
    }
    if (linhas.length) await db.from('entrega_verificacoes').insert(linhas);
  };

  const templatePara = useCallback(
    (tipoModelo: string | null | undefined) => {
      const alvo = (tipoModelo ?? '').toLowerCase().trim();
      const porTipo = templates.find((t) => (t.tipo_modelo ?? '').toLowerCase() === alvo);
      const porNome = templates.find((t) => t.nome.toLowerCase() === alvo);
      return porTipo ?? porNome ?? templates.find((t) => t.tipo_modelo === 'generico') ?? null;
    },
    [templates],
  );

  /**
   * Prepara a Entrega Institucional: cria a vistoria, importa os ambientes do
   * Recebimento Definitivo (snapshot do nome) e aplica os templates institucionais.
   */
  const prepararEntrega = async (args: {
    data: string;
    observacoes?: string;
    participantes: { userId: string | null; nome: string; papel: string; funcao?: string | null }[];
  }): Promise<string | null> => {
    if (!definitivo) {
      toast.error('É necessário concluir o Recebimento Definitivo antes da Entrega Institucional.');
      return null;
    }
    setSalvando(true);
    try {
      const { data: nova, error } = await db
        .from('entrega_vistorias')
        .insert({
          obra_id: obraId,
          recebimento_definitivo_id: definitivo.id,
          recebimento_definitivo_data: (definitivo.concluido_em ?? definitivo.data)?.slice(0, 10),
          data: args.data,
          observacoes: args.observacoes ?? null,
          status: 'em_andamento',
          iniciado_por: user?.id ?? null,
        })
        .select()
        .single();
      if (error || !nova) throw error ?? new Error('Falha ao criar a entrega');

      if (args.participantes.length) {
        await db.from('entrega_participantes').insert(
          args.participantes.map((p) => ({
            entrega_id: nova.id,
            obra_id: obraId,
            user_id: p.userId,
            nome_snapshot: p.nome,
            papel: p.papel,
            funcao_snapshot: p.funcao ?? null,
          })),
        );
      }

      // importa ambientes do Recebimento Definitivo (snapshot)
      const { data: origem } = await db
        .from('recebimento_ambientes')
        .select('id, nome, tipo_modelo, pavimento, ordem')
        .eq('vistoria_id', definitivo.id)
        .eq('ativo', true)
        .order('ordem')
        .limit(10000);

      const listaOrigem = (origem ?? []) as {
        id: string;
        nome: string;
        tipo_modelo: string | null;
        pavimento: string | null;
        ordem: number;
      }[];

      if (listaOrigem.length) {
        const { data: novosAmb } = await db
          .from('entrega_ambientes')
          .insert(
            listaOrigem.map((a, i) => ({
              entrega_id: nova.id,
              obra_id: obraId,
              recebimento_ambiente_id: a.id,
              nome: a.nome,
              tipo_modelo: a.tipo_modelo,
              pavimento: a.pavimento,
              ordem: a.ordem ?? i + 1,
              created_by: user?.id ?? null,
            })),
          )
          .select();

        for (const amb of (novosAmb ?? []) as { id: string; tipo_modelo: string | null; nome: string }[]) {
          const tpl = templatePara(amb.tipo_modelo ?? amb.nome);
          if (tpl) await aplicarTemplate(amb.id, nova.id, tpl.id);
        }
      }

      await fetchBase();
      setEntregaId(nova.id);
      toast.success('Entrega Institucional preparada');
      return nova.id as string;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'erro desconhecido';
      toast.error('Erro ao preparar a entrega: ' + msg);
      return null;
    } finally {
      setSalvando(false);
    }
  };

  /* --------------------------------------------------- ambientes e grupos */

  const adicionarAmbiente = async (args: {
    nome: string;
    tipoModelo?: string | null;
    pavimento?: string | null;
    templateId?: string | null;
  }) => {
    if (!entregaId) return null;
    const { data: amb, error } = await db
      .from('entrega_ambientes')
      .insert({
        entrega_id: entregaId,
        obra_id: obraId,
        nome: args.nome,
        tipo_modelo: args.tipoModelo ?? null,
        pavimento: args.pavimento ?? null,
        ordem: ambientes.length + 1,
        created_by: user?.id ?? null,
      })
      .select()
      .single();
    if (error || !amb) {
      toast.error('Erro ao adicionar ambiente');
      return null;
    }
    const tpl = args.templateId
      ? templates.find((t) => t.id === args.templateId)
      : templatePara(args.tipoModelo ?? args.nome);
    if (tpl) await aplicarTemplate(amb.id, entregaId, tpl.id);
    await fetchChecklist();
    toast.success(`Ambiente "${args.nome}" adicionado`);
    return amb.id as string;
  };

  const removerAmbiente = async (ambienteId: string) => {
    await db.from('entrega_ambientes').update({ ativo: false }).eq('id', ambienteId);
    await fetchChecklist();
    toast.success('Ambiente removido da entrega');
  };

  /** Serviço complementar pós-obra aplicado a vários ambientes de uma vez. */
  const adicionarGrupoEmAmbientes = async (args: {
    bibliotecaGrupoId: string;
    responsabilidade: Responsabilidade;
    ambienteIds: string[];
  }) => {
    if (!entregaId || !args.ambienteIds.length) return;
    const grupo = biblioteca.find((g) => g.id === args.bibliotecaGrupoId);
    if (!grupo) return;

    const { data: verifs } = await db
      .from('entrega_biblioteca_verificacoes')
      .select('id, descricao, ordem')
      .eq('grupo_id', grupo.id)
      .eq('ativo', true)
      .order('ordem')
      .limit(1000);

    for (const ambienteId of args.ambienteIds) {
      const amb = ambientes.find((a) => a.id === ambienteId);
      if (amb?.grupos.some((g) => g.grupo_snapshot === grupo.nome)) continue;

      const { data: novo } = await db
        .from('entrega_ambiente_grupos')
        .insert({
          ambiente_id: ambienteId,
          entrega_id: entregaId,
          obra_id: obraId,
          biblioteca_grupo_id: grupo.id,
          grupo_snapshot: grupo.nome,
          responsabilidade_padrao: args.responsabilidade,
          ordem: (amb?.grupos.length ?? 0) + 1,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (!novo) continue;

      const linhas = ((verifs ?? []) as { id: string; descricao: string; ordem: number }[]).map(
        (v) => ({
          ambiente_grupo_id: novo.id,
          ambiente_id: ambienteId,
          entrega_id: entregaId,
          obra_id: obraId,
          biblioteca_verificacao_id: v.id,
          descricao_snapshot: v.descricao,
          ordem: v.ordem,
        }),
      );
      if (linhas.length) await db.from('entrega_verificacoes').insert(linhas);
    }
    await fetchChecklist();
    toast.success(`"${grupo.nome}" aplicado a ${args.ambienteIds.length} ambiente(s)`);
  };

  const removerGrupo = async (grupoId: string) => {
    await db.from('entrega_ambiente_grupos').update({ ativo: false }).eq('id', grupoId);
    await fetchChecklist();
  };

  /* ------------------------------------------------------ status/autosave */

  const aplicarLocal = (ids: string[], status: VerificacaoStatus) =>
    setAmbientes((prev) =>
      prev.map((a) => ({
        ...a,
        grupos: a.grupos.map((g) => ({
          ...g,
          verificacoes: g.verificacoes.map((v) =>
            ids.includes(v.id) ? { ...v, status } : v,
          ),
        })),
      })),
    );

  /** Autosave imediato de uma ou várias verificações. */
  const definirStatus = async (
    ids: string[],
    status: VerificacaoStatus,
  ): Promise<boolean> => {
    if (!ids.length) return true;
    aplicarLocal(ids, status);
    setSalvando(true);
    const { error } = await db
      .from('entrega_verificacoes')
      .update({
        status,
        respondido_por: user?.id ?? null,
        respondido_em: new Date().toISOString(),
      })
      .in('id', ids);
    setSalvando(false);
    if (error) {
      toast.error('Não foi possível salvar');
      await fetchChecklist();
      return false;
    }
    setUltimoSalvamento(new Date());
    return true;
  };

  /** Ação em massa: só altera itens ainda não vistoriados. */
  const marcarPendentesComoConforme = async (verificacoes: EntregaVerificacao[]) => {
    const alvos = verificacoes.filter((v) => v.status === 'nao_vistoriado');
    if (!alvos.length) {
      toast.info('Nenhuma verificação pendente neste grupo');
      return;
    }
    const ok = await definirStatus(
      alvos.map((v) => v.id),
      'conforme',
    );
    if (ok) toast.success(`${alvos.length} itens marcados como Conforme`);
  };

  /* --------------------------------------------------------- participantes */

  const adicionarParticipante = async (p: {
    userId: string | null;
    nome: string;
    papel: string;
    funcao?: string | null;
  }) => {
    if (!entregaId) return;
    await db.from('entrega_participantes').insert({
      entrega_id: entregaId,
      obra_id: obraId,
      user_id: p.userId,
      nome_snapshot: p.nome,
      papel: p.papel,
      funcao_snapshot: p.funcao ?? null,
    });
    await fetchChecklist();
  };

  const removerParticipante = async (id: string) => {
    await db.from('entrega_participantes').delete().eq('id', id);
    await fetchChecklist();
  };

  /* ------------------------------------------------------ ciência / entrega */

  /**
   * Registra a ciência e formaliza a entrega, congelando o resultado histórico
   * daquele momento. Correções posteriores não reescrevem esse registro.
   */
  const registrarCiencia = async (args: {
    resultado: 'apto' | 'apto_com_ressalvas';
    resumo: Record<string, unknown>;
    observacoes?: string;
  }) => {
    if (!entregaId) return false;
    const { error } = await db
      .from('entrega_vistorias')
      .update({
        status: 'entregue',
        resultado_congelado: args.resultado,
        resultado_resumo: args.resumo,
        ciencia_em: new Date().toISOString(),
        ciencia_por: user?.id ?? null,
        ciencia_observacoes: args.observacoes ?? null,
      })
      .eq('id', entregaId);
    if (error) {
      toast.error('Erro ao registrar a ciência');
      return false;
    }
    await fetchBase();
    toast.success('Ciência registrada — edificação entregue à Administração');
    return true;
  };

  const excluirEntrega = async (id: string) => {
    const { error } = await db.from('entrega_vistorias').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir a entrega: ' + error.message);
      return false;
    }
    setEntregaId(null);
    await fetchBase();
    toast.success('Entrega institucional excluída');
    return true;
  };

  return {
    loading,
    salvando,
    ultimoSalvamento,
    entregas,
    entrega,
    entregaId,
    setEntregaId,
    definitivo,
    templates,
    biblioteca,
    ambientes,
    participantes,
    prepararEntrega,
    adicionarAmbiente,
    removerAmbiente,
    adicionarGrupoEmAmbientes,
    removerGrupo,
    definirStatus,
    marcarPendentesComoConforme,
    adicionarParticipante,
    removerParticipante,
    registrarCiencia,
    excluirEntrega,
    refetch: async () => {
      await fetchBase();
      await fetchChecklist();
    },
    refetchChecklist: fetchChecklist,
  };
}
