import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EncerramentoData, EncerramentoDPG, EncerramentoEmpresa, EncerramentoInstitucional, EncerramentoObra, EncerramentoArt } from '@/lib/encerramento/types';
import { useMedicoesFinanceiro } from './useMedicoesFinanceiro';

/**
 * Fase 3 — Motor de dados para Documentos de Encerramento (TRP/TRD/ACT).
 */
export function useEncerramentoData(obraId: string | null | undefined) {
  const { dados: financeiro, loading: loadingFinanceiro } = useMedicoesFinanceiro(obraId || '');

  const query = useQuery({
    enabled: !!obraId && !loadingFinanceiro,
    queryKey: ['encerramento-data', obraId, financeiro.valorTotalOriginal, financeiro.totalAditivo, financeiro.totalContrato, financeiro.valorAcumulado],

    queryFn: async (): Promise<Omit<EncerramentoData, never>> => {
      if (!obraId) throw new Error('obraId requerido');

      const { data: obraRow, error: obraErr } = await supabase
        .from('obras')
        .select('id, nome, municipio, endereco_completo, n_contrato, sei_numero, data_inicio, previsao_termino, data_termino_real, data_recebimento_provisorio, data_recebimento_definitivo, status, empresa_id, fiscal_id, objeto_contrato, descricao_imovel')
        .eq('id', obraId)
        .maybeSingle();
      if (obraErr) throw obraErr;
      if (!obraRow) throw new Error('Obra não encontrada');

      let fiscalNome: string | null = null;
      if ((obraRow as any).fiscal_id) {
        const { data: fiscalProfile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', (obraRow as any).fiscal_id)
          .maybeSingle();
        fiscalNome = fiscalProfile?.display_name ?? null;
      }

      // ARTs vinculadas à obra (contrato + aditivos)
      const { data: artsRows } = await (supabase as any)
        .from('obra_arts')
        .select('id, numero_art, tipo, aditivo_session_id, ordem, created_at')
        .eq('obra_id', obraId)
        .order('aditivo_session_id', { ascending: true, nullsFirst: true })
        .order('ordem', { ascending: true })
        .order('created_at', { ascending: true });

      // Sessões de aditivo para descobrir sequencia/tipo
      const { data: aditivoSessionsAll } = await supabase
        .from('aditivo_sessions')
        .select('id, sequencia, tipo_aditivo, status')
        .eq('obra_id', obraId);
      const sessionsMap = new Map<string, { sequencia: number; tipo_aditivo: string | null }>();
      (aditivoSessionsAll || []).forEach((s: any) => {
        sessionsMap.set(s.id, { sequencia: s.sequencia, tipo_aditivo: s.tipo_aditivo });
      });

      const arts: EncerramentoArt[] = (artsRows || []).map((a: any) => ({
        id: a.id,
        numero_art: a.numero_art,
        tipo: a.tipo,
        aditivo_session_id: a.aditivo_session_id,
        aditivo_sequencia: a.aditivo_session_id ? sessionsMap.get(a.aditivo_session_id)?.sequencia ?? null : null,
        aditivo_tipo: a.aditivo_session_id ? sessionsMap.get(a.aditivo_session_id)?.tipo_aditivo ?? null : null,
      }));

      const [empresaRes, dpgRes, instRes] = await Promise.all([
        obraRow.empresa_id
          ? supabase
              .from('empresas')
              .select('id, razao_social, cnpj, endereco, numero, bairro, cidade, uf, cep, representante_legal_nome, representante_legal_cpf, representante_legal_cargo, responsavel_tecnico_nome, responsavel_tecnico_cpf, responsavel_tecnico_profissao, conselho_tipo, conselho_numero, conselho_uf')
              .eq('id', obraRow.empresa_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null } as any),
        supabase
          .from('dpg_gestao')
          .select('id, nome, cargo, condicao, texto_cargo_documento, cpf, assinatura_url, vigencia_inicio, vigencia_fim, ativo')
          .eq('ativo', true)
          .lte('vigencia_inicio', new Date().toISOString().slice(0, 10))
          .order('vigencia_inicio', { ascending: false })
          .limit(5),
        supabase.from('config_institucional').select('cnpj, razao_social, endereco, cidade').limit(1).maybeSingle(),
      ]);

      const empresa = (empresaRes as any).data as EncerramentoEmpresa | null;
      const dpgList = (dpgRes.data || []) as any[];
      const hoje = new Date().toISOString().slice(0, 10);
      const dpgAtivo = dpgList.find((d) => !d.vigencia_fim || d.vigencia_fim >= hoje) || null;
      const dpg: EncerramentoDPG | null = dpgAtivo
        ? {
            id: dpgAtivo.id,
            nome: dpgAtivo.nome,
            cargo: dpgAtivo.cargo,
            condicao: dpgAtivo.condicao,
            texto_cargo_documento: dpgAtivo.texto_cargo_documento,
            cpf: dpgAtivo.cpf,
            assinatura_url: dpgAtivo.assinatura_url,
          }
        : null;
      const institucional = (instRes.data as EncerramentoInstitucional | null) || null;

      const obra: EncerramentoObra = {
        id: obraRow.id,
        nome: obraRow.nome,
        municipio: obraRow.municipio,
        endereco_completo: obraRow.endereco_completo,
        n_contrato: obraRow.n_contrato,
        sei_numero: obraRow.sei_numero,
        data_inicio: obraRow.data_inicio,
        previsao_termino: obraRow.previsao_termino,
        data_termino_real: (obraRow as any).data_termino_real ?? null,
        data_recebimento_provisorio: obraRow.data_recebimento_provisorio,
        data_recebimento_definitivo: obraRow.data_recebimento_definitivo,
        status: obraRow.status,
        valor_inicial: financeiro.valorTotalOriginal || 0,
        valor_aditivado: financeiro.totalAditivo || 0,
        valor_final: financeiro.totalContrato || 0,
        valor_executado: financeiro.valorAcumulado || 0,
        fiscal_nome: fiscalNome,
        objeto_contrato: (obraRow as any).objeto_contrato ?? null,
        descricao_imovel: (obraRow as any).descricao_imovel ?? null,
        arts,
      };


      return { obra, empresa, dpg, institucional };
    },
  });

  return {
    data: query.data as EncerramentoData | undefined,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
