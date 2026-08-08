import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  IMPACTO_LABEL,
  RESPONSABILIDADE_LABEL,
  type Impacto,
  type Responsabilidade,
} from '@/lib/entrega/constants';
import { FotoPicker } from './FotoPicker';

export interface PendenciaAlvo {
  verificacaoId: string | null;
  ambienteId: string | null;
  ambienteGrupoId: string | null;
  ambienteNome: string;
  grupoNome: string;
  descricao: string;
  responsabilidadePadrao: Responsabilidade;
}

interface Props {
  alvo: PendenciaAlvo | null;
  onOpenChange: (open: boolean) => void;
  onSalvar: (dados: {
    titulo: string;
    descricao: string;
    responsabilidade: Responsabilidade;
    responsavelTerceiro: string | null;
    impacto: Impacto;
    prazoCorrecao: string | null;
    fotos: File[];
  }) => Promise<void>;
  onCancelar: () => void;
}

const RESPONSABILIDADES: Responsabilidade[] = [
  'contratada',
  'dif_engenharia',
  'administracao',
  'terceiro',
];

/** Registro da pendência ao marcar uma verificação como "Pendência". */
export function EntregaPendenciaSheet({ alvo, onOpenChange, onSalvar, onCancelar }: Props) {
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [responsabilidade, setResponsabilidade] = useState<Responsabilidade>('contratada');
  const [terceiro, setTerceiro] = useState('');
  const [impacto, setImpacto] = useState<Impacto>('nao_impeditiva');
  const [prazo, setPrazo] = useState('');
  const [fotos, setFotos] = useState<File[]>([]);
  const [salvando, setSalvando] = useState(false);

  const abrir = (open: boolean) => {
    if (!open) {
      onCancelar();
      onOpenChange(false);
    }
  };

  // reinicializa quando um novo alvo chega
  const chave = alvo?.verificacaoId ?? '';
  const [ultimaChave, setUltimaChave] = useState('');
  if (alvo && chave !== ultimaChave) {
    setUltimaChave(chave);
    setTitulo(alvo.descricao);
    setDescricao('');
    setResponsabilidade(alvo.responsabilidadePadrao);
    setTerceiro('');
    setImpacto('nao_impeditiva');
    setPrazo('');
    setFotos([]);
  }

  const salvar = async () => {
    if (!titulo.trim()) return;
    setSalvando(true);
    await onSalvar({
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      responsabilidade,
      responsavelTerceiro: responsabilidade === 'terceiro' ? terceiro.trim() || null : null,
      impacto,
      prazoCorrecao: prazo || null,
      fotos,
    });
    setSalvando(false);
    onOpenChange(false);
  };

  return (
    <Sheet open={!!alvo} onOpenChange={abrir}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl sm:max-w-xl">
        {alvo && (
          <>
            <SheetHeader className="text-left">
              <SheetTitle>Registrar pendência da entrega</SheetTitle>
              <SheetDescription>
                {alvo.ambienteNome} › {alvo.grupoNome}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-4 pb-4">
              <div className="space-y-1.5">
                <Label htmlFor="pend-titulo">Título</Label>
                <Input
                  id="pend-titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pend-desc">Descrição do desvio</Label>
                <Textarea
                  id="pend-desc"
                  rows={3}
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descreva o que foi identificado durante a vistoria"
                />
              </div>

              <FotoPicker arquivos={fotos} onChange={setFotos} label="Fotografar ocorrência" />

              <div className="space-y-1.5">
                <Label>Responsabilidade</Label>
                <Select
                  value={responsabilidade}
                  onValueChange={(v) => setResponsabilidade(v as Responsabilidade)}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESPONSABILIDADES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {RESPONSABILIDADE_LABEL[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {responsabilidade === 'terceiro' && (
                <div className="space-y-1.5">
                  <Label htmlFor="pend-terceiro">Empresa / contrato / fornecedor</Label>
                  <Input
                    id="pend-terceiro"
                    value={terceiro}
                    onChange={(e) => setTerceiro(e.target.value)}
                    placeholder="Identifique o terceiro responsável"
                    className="h-11"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Impacto na entrega</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['nao_impeditiva', 'impeditiva'] as Impacto[]).map((i) => (
                    <Button
                      key={i}
                      type="button"
                      variant="outline"
                      className={cn(
                        'h-12',
                        impacto === i &&
                          (i === 'impeditiva'
                            ? 'border-destructive bg-destructive/10 text-destructive'
                            : 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400'),
                      )}
                      onClick={() => setImpacto(i)}
                    >
                      {IMPACTO_LABEL[i]}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Impeditiva bloqueia a entrega institucional até a correção.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pend-prazo">Prazo para correção (opcional)</Label>
                <Input
                  id="pend-prazo"
                  type="date"
                  value={prazo}
                  onChange={(e) => setPrazo(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="h-12 flex-1" onClick={() => abrir(false)}>
                  Cancelar
                </Button>
                <Button className="h-12 flex-1" disabled={salvando || !titulo.trim()} onClick={salvar}>
                  {salvando ? 'Registrando...' : 'Registrar pendência'}
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
