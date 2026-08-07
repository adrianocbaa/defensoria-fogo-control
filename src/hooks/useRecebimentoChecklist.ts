import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { VerificacaoStatus } from '@/lib/recebimento/constants';
import {
  ackDrafts,
  clearDrafts,
  enqueueDrafts,
  loadDrafts,
  type DraftEntry,
} from '@/lib/recebimento/autosaveQueue';

export type SyncEstado = 'sincronizado' | 'salvando' | 'pendente' | 'offline';


export interface Verificacao {
  id: string;
  ambiente_servico_id: string;
  ambiente_id: string;
  vistoria_id: string;
  obra_id: string;
  biblioteca_verificacao_id: string | null;
  descricao_snapshot: string;
  status: VerificacaoStatus;
  observacao: string | null;
  respondido_por: string | null;
  respondido_em: string | null;
  ordem: number;
}

export interface AmbienteServico {
  id: string;
  ambiente_id: string;
  biblioteca_servico_id: string | null;
  macro_snapshot: string;
  servico_snapshot: string;
  ordem: number;
  verificacoes: Verificacao[];
}

export interface Ambiente {
  id: string;
  vistoria_id: string;
  obra_id: string;
  nome: string;
  tipo_modelo: string | null;
  pavimento: string | null;
  observacoes: string | null;
  ordem: number;
  servicos: AmbienteServico[];
}

export interface TemplateResumo {
  id: string;
  nome: string;
  descricao: string | null;
}

export function useRecebimentoChecklist(obraId: string, vistoriaId: string | null) {
  const { user } = useAuth();
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [templates, setTemplates] = useState<TemplateResumo[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendentes, setPendentes] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [ultimoSalvamento, setUltimoSalvamento] = useState<Date | null>(null);
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const flushingRef = useRef(false);

  /** Aplica rascunhos locais sobre os dados vindos do servidor (recuperação). */
  const aplicarDrafts = useCallback(
    (lista: Ambiente[], drafts: DraftEntry[]): Ambiente[] => {
      if (!drafts.length) return lista;
      const map = new Map(drafts.map((d) => [d.verificacaoId, d.status]));
      return lista.map((a) => ({
        ...a,
        servicos: a.servicos.map((s) => ({
          ...s,
          verificacoes: s.verificacoes.map((v) =>
            map.has(v.id) ? { ...v, status: map.get(v.id)! } : v,
          ),
        })),
      }));
    },
    [],
  );


  const fetchChecklist = useCallback(async () => {
    if (!vistoriaId) {
      setAmbientes([]);
      return;
    }
    setLoading(true);
    const [{ data: ambs }, { data: servs }, { data: verifs }] = await Promise.all([
      supabase
        .from('recebimento_ambientes')
        .select('*')
        .eq('vistoria_id', vistoriaId)
        .eq('ativo', true)
        .order('ordem')
        .limit(10000),
      supabase
        .from('recebimento_ambiente_servicos')
        .select('*')
        .eq('vistoria_id', vistoriaId)
        .eq('ativo', true)
        .order('ordem')
        .limit(10000),
      supabase
        .from('recebimento_verificacoes')
        .select('*')
        .eq('vistoria_id', vistoriaId)
        .eq('ativo', true)
        .order('ordem')
        .limit(10000),
    ]);

    const verifsByServ = new Map<string, Verificacao[]>();
    for (const v of (verifs ?? []) as unknown as Verificacao[]) {
      const list = verifsByServ.get(v.ambiente_servico_id) ?? [];
      list.push(v);
      verifsByServ.set(v.ambiente_servico_id, list);
    }
    const servsByAmb = new Map<string, AmbienteServico[]>();
    for (const s of (servs ?? []) as any[]) {
      const list = servsByAmb.get(s.ambiente_id) ?? [];
      list.push({ ...s, verificacoes: verifsByServ.get(s.id) ?? [] });
      servsByAmb.set(s.ambiente_id, list);
    }

    const base = ((ambs ?? []) as any[]).map((a) => ({
      ...a,
      servicos: servsByAmb.get(a.id) ?? [],
    })) as Ambiente[];

    const drafts = loadDrafts(vistoriaId);
    setPendentes(drafts.length);
    setAmbientes(aplicarDrafts(base, drafts));
    setLoading(false);
  }, [vistoriaId, aplicarDrafts]);


  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase
      .from('recebimento_templates')
      .select('id, nome, descricao')
      .eq('ativo', true)
      .or(`escopo.eq.global,obra_id.eq.${obraId}`)
      .order('ordem')
      .limit(1000);
    setTemplates((data ?? []) as TemplateResumo[]);
  }, [obraId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  /** Cria ambiente e, opcionalmente, aplica um template (copia serviços + verificações). */
  const criarAmbiente = async (args: {
    nome: string;
    tipoModelo?: string | null;
    pavimento?: string | null;
    observacoes?: string | null;
    templateId?: string | null;
  }) => {
    if (!vistoriaId || !user) return null;
    const { data: amb, error } = await supabase
      .from('recebimento_ambientes')
      .insert({
        vistoria_id: vistoriaId,
        obra_id: obraId,
        nome: args.nome,
        tipo_modelo: args.tipoModelo ?? null,
        pavimento: args.pavimento ?? null,
        observacoes: args.observacoes ?? null,
        ordem: ambientes.length + 1,
        created_by: user.id,
      })
      .select()
      .single();
    if (error || !amb) {
      toast.error('Erro ao criar ambiente');
      return null;
    }

    if (args.templateId) {
      await aplicarTemplate(amb.id, args.templateId);
    }
    await fetchChecklist();
    toast.success(`Ambiente "${args.nome}" criado`);
    return amb.id as string;
  };

  const aplicarTemplate = async (ambienteId: string, templateId: string) => {
    if (!vistoriaId || !user) return;
    const { data: tservs } = await supabase
      .from('recebimento_template_servicos')
      .select('ordem, biblioteca_servico_id')
      .eq('template_id', templateId)
      .order('ordem')
      .limit(1000);
    const ids = (tservs ?? []).map((t) => t.biblioteca_servico_id);
    if (!ids.length) return;
    await adicionarServicos(ambienteId, ids);
  };

  /** Adiciona serviços da biblioteca ao ambiente, copiando snapshots e verificações. */
  const adicionarServicos = async (ambienteId: string, bibliotecaServicoIds: string[]) => {
    if (!vistoriaId || !user || bibliotecaServicoIds.length === 0) return;

    const { data: servicos } = await supabase
      .from('biblioteca_servicos')
      .select('id, macro, servico')
      .in('id', bibliotecaServicoIds);
    const { data: verifs } = await supabase
      .from('biblioteca_verificacoes')
      .select('id, servico_id, descricao, ordem')
      .in('servico_id', bibliotecaServicoIds)
      .eq('ativo', true)
      .order('ordem')
      .limit(10000);

    const { count } = await supabase
      .from('recebimento_ambiente_servicos')
      .select('id', { count: 'exact', head: true })
      .eq('ambiente_id', ambienteId);
    let ordem = count ?? 0;

    for (const id of bibliotecaServicoIds) {
      const s = (servicos ?? []).find((x) => x.id === id);
      if (!s) continue;
      ordem += 1;
      const { data: novo } = await supabase
        .from('recebimento_ambiente_servicos')
        .insert({
          ambiente_id: ambienteId,
          vistoria_id: vistoriaId,
          obra_id: obraId,
          biblioteca_servico_id: s.id,
          macro_snapshot: s.macro,
          servico_snapshot: s.servico,
          ordem,
          created_by: user.id,
        })
        .select()
        .single();
      if (!novo) continue;

      const vs = (verifs ?? []).filter((v) => v.servico_id === s.id);
      if (vs.length) {
        await supabase.from('recebimento_verificacoes').insert(
          vs.map((v) => ({
            ambiente_servico_id: novo.id,
            ambiente_id: ambienteId,
            vistoria_id: vistoriaId,
            obra_id: obraId,
            biblioteca_verificacao_id: v.id,
            descricao_snapshot: v.descricao,
            ordem: v.ordem,
          })),
        );
      }
    }
    await fetchChecklist();
  };

  /** Serviço/verificação personalizados criados direto no ambiente. */
  const adicionarServicoPersonalizado = async (
    ambienteId: string,
    macro: string,
    servico: string,
    verificacoes: string[],
  ) => {
    if (!vistoriaId || !user) return;
    const { count } = await supabase
      .from('recebimento_ambiente_servicos')
      .select('id', { count: 'exact', head: true })
      .eq('ambiente_id', ambienteId);

    const { data: novo } = await supabase
      .from('recebimento_ambiente_servicos')
      .insert({
        ambiente_id: ambienteId,
        vistoria_id: vistoriaId,
        obra_id: obraId,
        macro_snapshot: macro,
        servico_snapshot: servico,
        ordem: (count ?? 0) + 1,
        created_by: user.id,
      })
      .select()
      .single();
    if (!novo) {
      toast.error('Erro ao adicionar serviço');
      return;
    }
    const lista = verificacoes.filter((v) => v.trim());
    if (lista.length) {
      await supabase.from('recebimento_verificacoes').insert(
        lista.map((d, i) => ({
          ambiente_servico_id: novo.id,
          ambiente_id: ambienteId,
          vistoria_id: vistoriaId,
          obra_id: obraId,
          descricao_snapshot: d.trim(),
          ordem: i + 1,
        })),
      );
    }
    await fetchChecklist();
    toast.success('Serviço adicionado');
  };

  /** Duplica a estrutura (sem respostas) do ambiente para novos nomes. */
  const duplicarAmbiente = async (ambienteId: string, novosNomes: string[]) => {
    if (!vistoriaId || !user) return;
    const origem = ambientes.find((a) => a.id === ambienteId);
    if (!origem) return;

    for (const [idx, nome] of novosNomes.entries()) {
      const { data: novoAmb } = await supabase
        .from('recebimento_ambientes')
        .insert({
          vistoria_id: vistoriaId,
          obra_id: obraId,
          nome,
          tipo_modelo: origem.tipo_modelo,
          pavimento: origem.pavimento,
          ordem: ambientes.length + idx + 1,
          created_by: user.id,
        })
        .select()
        .single();
      if (!novoAmb) continue;

      for (const s of origem.servicos) {
        const { data: novoServ } = await supabase
          .from('recebimento_ambiente_servicos')
          .insert({
            ambiente_id: novoAmb.id,
            vistoria_id: vistoriaId,
            obra_id: obraId,
            biblioteca_servico_id: s.biblioteca_servico_id,
            macro_snapshot: s.macro_snapshot,
            servico_snapshot: s.servico_snapshot,
            ordem: s.ordem,
            created_by: user.id,
          })
          .select()
          .single();
        if (!novoServ) continue;
        if (s.verificacoes.length) {
          await supabase.from('recebimento_verificacoes').insert(
            s.verificacoes.map((v) => ({
              ambiente_servico_id: novoServ.id,
              ambiente_id: novoAmb.id,
              vistoria_id: vistoriaId,
              obra_id: obraId,
              biblioteca_verificacao_id: v.biblioteca_verificacao_id,
              descricao_snapshot: v.descricao_snapshot,
              ordem: v.ordem,
            })),
          );
        }
      }
    }
    await fetchChecklist();
    toast.success(`${novosNomes.length} ambiente(s) criado(s)`);
  };

  const inativarAmbiente = async (ambienteId: string) => {
    await supabase.from('recebimento_ambientes').update({ ativo: false }).eq('id', ambienteId);
    await fetchChecklist();
    toast.success('Ambiente removido da vistoria');
  };

  const inativarServico = async (servicoId: string) => {
    await supabase
      .from('recebimento_ambiente_servicos')
      .update({ ativo: false })
      .eq('id', servicoId);
    await fetchChecklist();
  };

  /** Autosave de uma verificação. Retorna true em sucesso. */
  const setStatus = async (
    verificacaoId: string,
    status: VerificacaoStatus,
  ): Promise<boolean> => {
    // otimista
    setAmbientes((prev) =>
      prev.map((a) => ({
        ...a,
        servicos: a.servicos.map((s) => ({
          ...s,
          verificacoes: s.verificacoes.map((v) =>
            v.id === verificacaoId ? { ...v, status } : v,
          ),
        })),
      })),
    );

    const { error } = await supabase
      .from('recebimento_verificacoes')
      .update({
        status,
        respondido_por: user?.id ?? null,
        respondido_em: new Date().toISOString(),
      })
      .eq('id', verificacaoId);

    if (error) {
      toast.error('Não foi possível salvar — tentar novamente');
      await fetchChecklist();
      return false;
    }
    return true;
  };

  /** Ação em massa. Por padrão só altera itens ainda não vistoriados. */
  const marcarGrupo = async (
    verificacoes: Verificacao[],
    status: VerificacaoStatus,
    sobrescrever = false,
  ) => {
    const alvos = verificacoes.filter((v) =>
      sobrescrever ? v.status !== status : v.status === 'nao_vistoriado',
    );
    if (!alvos.length) {
      toast.info('Nenhuma verificação para atualizar');
      return;
    }
    const ids = alvos.map((v) => v.id);
    setAmbientes((prev) =>
      prev.map((a) => ({
        ...a,
        servicos: a.servicos.map((s) => ({
          ...s,
          verificacoes: s.verificacoes.map((v) =>
            ids.includes(v.id) ? { ...v, status } : v,
          ),
        })),
      })),
    );
    const { error } = await supabase
      .from('recebimento_verificacoes')
      .update({
        status,
        respondido_por: user?.id ?? null,
        respondido_em: new Date().toISOString(),
      })
      .in('id', ids);
    if (error) {
      toast.error('Não foi possível salvar — tentar novamente');
      await fetchChecklist();
      return;
    }
    toast.success(`${ids.length} verificação(ões) atualizadas`);
  };

  return {
    ambientes,
    templates,
    loading,
    criarAmbiente,
    aplicarTemplate,
    adicionarServicos,
    adicionarServicoPersonalizado,
    duplicarAmbiente,
    inativarAmbiente,
    inativarServico,
    setStatus,
    marcarGrupo,
    refetch: fetchChecklist,
  };
}
