import { FileText, Download, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Calha } from './calhaSchema';
import type { Pano } from './panoSchema';
import type { CadastroObra } from './types';
import type { ChuvaProjeto } from './chuvaSchema';
import { gerarMemorialPDF } from '@/lib/memorialCalhas';
import { toast } from '@/hooks/use-toast';

interface Props {
  cadastro: CadastroObra;
  chuva: ChuvaProjeto;
  panos: Pano[];
  calhas: Calha[];
  onBack: () => void;
}

export function RelatorioStep({ cadastro, chuva, panos, calhas, onBack }: Props) {
  const handleGerar = () => {
    try {
      gerarMemorialPDF({ cadastro, chuva, panos, calhas });
      toast({ title: 'Memorial gerado', description: 'O PDF foi baixado.' });
    } catch (e) {
      toast({
        title: 'Erro ao gerar PDF',
        description: e instanceof Error ? e.message : 'Falha desconhecida',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-md border bg-muted/40 px-4 py-3">
        <FileText className="h-5 w-5 text-primary mt-0.5" />
        <div className="text-sm text-muted-foreground">
          Gera um <strong>memorial de cálculo</strong> em PDF contendo dados da obra,
          norma adotada, chuva de projeto, áreas de contribuição, fórmulas utilizadas,
          dimensionamento das calhas e dos condutores verticais, tabela final com
          dimensões adotadas e campo para assinatura do responsável técnico.
        </div>
      </div>

      <div className="rounded-lg border p-6 space-y-4">
        <div>
          <div className="text-base font-semibold">{cadastro.nome_obra}</div>
          <div className="text-sm text-muted-foreground">
            {cadastro.cidade}/{cadastro.uf} • {cadastro.tipo_edificacao} • RT:{' '}
            {cadastro.responsavel_tecnico}
          </div>
        </div>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
          <li>Intensidade de projeto: <strong>{chuva.intensidade_mm_h} mm/h</strong> (TR {chuva.tempo_retorno_anos} anos)</li>
          <li>{panos.length} pano(s) de telhado cadastrado(s)</li>
          <li>{calhas.length} calha(s) e {calhas.reduce((s, c) => s + c.pontos_descida.length, 0)} ponto(s) de descida</li>
        </ul>

        <Button onClick={handleGerar} className="gap-2">
          <Download className="h-4 w-4" />
          Gerar memorial em PDF
        </Button>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-sm">
        <Info className="h-4 w-4 text-amber-600 mt-0.5" />
        <div>
          Os nomogramas e ábacos utilizados (condutores verticais) devem ser conferidos
          conforme publicação oficial da <strong>ABNT NBR 10844:1989</strong> antes da
          emissão definitiva do projeto.
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Voltar</Button>
      </div>
    </div>
  );
}
