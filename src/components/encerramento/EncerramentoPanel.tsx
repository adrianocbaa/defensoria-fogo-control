import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, FileCheck2, FileText, Info, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useEncerramentoData } from '@/hooks/useEncerramentoData';
import { validaDocumento } from '@/lib/encerramento/validation';
import { gerarDocumentoEncerramento, nomeArquivoDocumento } from '@/lib/encerramento/docGenerator';
import { supabase } from '@/integrations/supabase/client';
import type { EncerramentoData, EncerramentoTipo, ValidationResult } from '@/lib/encerramento/types';

interface Props {
  obraId: string;
}


const DOC_META: Record<EncerramentoTipo, { titulo: string; descricao: string }> = {
  TRP: {
    titulo: 'TRP — Termo de Recebimento Provisório',
    descricao: 'Emitido ao término da execução, para vistoria e verificação inicial da obra.',
  },
  TRD: {
    titulo: 'TRD — Termo de Recebimento Definitivo',
    descricao: 'Emitido após o TRP e a comprovação da adequação do objeto aos termos contratuais.',
  },
  ACT: {
    titulo: 'ACT — Atestado de Capacidade Técnica',
    descricao: 'Comprova a execução satisfatória da obra pela empresa contratada.',
  },
};

function StatusBadge({ result }: { result: ValidationResult }) {
  if (result.ok && result.avisos.length === 0) {
    return (
      <Badge className="bg-green-600 hover:bg-green-600 text-white gap-1">
        <CheckCircle2 className="h-3 w-3" /> Pronto para gerar
      </Badge>
    );
  }
  if (result.ok) {
    return (
      <Badge className="bg-amber-500 hover:bg-amber-500 text-white gap-1">
        <AlertTriangle className="h-3 w-3" /> Pronto com avisos
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="h-3 w-3" /> Pendências
    </Badge>
  );
}

function DocCard({
  tipo,
  data,
  obraId,
}: {
  tipo: EncerramentoTipo;
  data: EncerramentoData;
  obraId: string;
}) {
  const result = useMemo(() => validaDocumento(tipo, data), [tipo, data]);
  const meta = DOC_META[tipo];
  const [gerando, setGerando] = useState(false);

  const handleGerar = async () => {
    setGerando(true);
    try {
      const blob = await gerarDocumentoEncerramento(tipo, data);
      const filename = nomeArquivoDocumento(tipo, data);

      // Upload para storage
      const timestamp = Date.now();
      const path = `${obraId}/${tipo}/${timestamp}_${filename}`;
      const { error: upErr } = await supabase.storage
        .from('documentos-encerramento')
        .upload(path, blob, {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          upsert: false,
        });
      if (upErr) throw upErr;

      // Descobrir próxima versão
      const { data: existentes } = await supabase
        .from('documentos_encerramento')
        .select('versao')
        .eq('obra_id', obraId)
        .eq('tipo', tipo)
        .order('versao', { ascending: false })
        .limit(1);
      const proxVersao = (existentes?.[0]?.versao ?? 0) + 1;

      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      const { data: prof } = uid
        ? await supabase.from('profiles').select('display_name').eq('user_id', uid).maybeSingle()
        : { data: null } as any;

      const { error: insErr } = await supabase.from('documentos_encerramento').insert({
        obra_id: obraId,
        tipo,
        versao: proxVersao,
        status: 'gerado',
        arquivo_docx_path: path,
        snapshot_dados: data as any,
        gerado_por: uid,
        gerado_por_nome: prof?.display_name || null,
      });
      if (insErr) throw insErr;

      // Download local
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success(`${tipo} gerado (v${proxVersao}) e arquivado com sucesso.`);
    } catch (e: any) {
      console.error(e);
      toast.error(`Erro ao gerar ${tipo}: ${e?.message || e}`);
    } finally {
      setGerando(false);
    }
  };

  return (
    <Card className="border-l-4" style={{ borderLeftColor: result.ok ? '#16a34a' : '#dc2626' }}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-primary" />
              {meta.titulo}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{meta.descricao}</p>
          </div>
          <StatusBadge result={result} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {result.erros.length > 0 && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-xs font-semibold text-destructive mb-1 flex items-center gap-1">
              <XCircle className="h-3 w-3" /> Pendências que impedem a emissão
            </p>
            <ul className="text-xs text-destructive space-y-0.5 list-disc pl-5">
              {result.erros.map((e, i) => (
                <li key={i}>{e.mensagem}</li>
              ))}
            </ul>
          </div>
        )}
        {result.avisos.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Avisos
            </p>
            <ul className="text-xs text-amber-800 space-y-0.5 list-disc pl-5">
              {result.avisos.map((a, i) => (
                <li key={i}>{a.mensagem}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" disabled={!result.ok || gerando} onClick={handleGerar}>
            {gerando ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-1" />
            )}
            {gerando ? 'Gerando…' : `Gerar ${tipo} (DOCX)`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


export function EncerramentoPanel({ obraId }: Props) {
  const { data, isLoading, error, refetch } = useEncerramentoData(obraId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando dados de encerramento…
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-destructive">
          Falha ao carregar dados de encerramento. Tente novamente.
        </CardContent>
      </Card>
    );
  }

  const missingDpg = !data.dpg;
  const missingInst = !data.institucional?.cnpj;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" /> Encerramento da Obra
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Contratada</p>
              <p className="font-medium">
                {data.empresa?.razao_social || (
                  <span className="text-destructive">Não vinculada</span>
                )}
              </p>
              {data.empresa?.cnpj && (
                <p className="text-xs text-muted-foreground">CNPJ {data.empresa.cnpj}</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground text-xs">DPG em exercício</p>
              <p className="font-medium">
                {data.dpg?.nome || <span className="text-destructive">Não configurado</span>}
              </p>
              {data.dpg?.texto_cargo_documento && (
                <p className="text-xs text-muted-foreground">{data.dpg.texto_cargo_documento}</p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Recebimento provisório</p>
              <p className="font-medium">{data.obra.data_recebimento_provisorio || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Recebimento definitivo</p>
              <p className="font-medium">{data.obra.data_recebimento_definitivo || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">ARTs cadastradas</p>
              <p className="font-medium">
                {data.obra.arts.length > 0
                  ? `${data.obra.arts.length} registro${data.obra.arts.length > 1 ? 's' : ''}`
                  : <span className="text-destructive">Nenhuma</span>}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Valor executado</p>
              <p className="font-medium">
                {data.obra.valor_executado.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>
            </div>
          </div>
          {(missingDpg || missingInst) && (
            <>
              <Separator />
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  Dados institucionais pendentes.{' '}
                  <Link to="/admin/encerramento" className="underline font-medium">
                    Abrir painel administrativo
                  </Link>{' '}
                  para configurar {missingDpg && 'DPG em exercício'}
                  {missingDpg && missingInst && ' e '}
                  {missingInst && 'dados institucionais'}.
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ObraArtsManager obraId={obraId} onChanged={() => refetch()} />

      <div className="grid grid-cols-1 gap-3">
        <DocCard tipo="TRP" data={data} obraId={obraId} />
        <DocCard tipo="TRD" data={data} obraId={obraId} />
        <DocCard tipo="ACT" data={data} obraId={obraId} />

      </div>
    </div>
  );
}
