import { Cloud, CloudOff, Loader2, RefreshCw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SyncEstado } from '@/hooks/useRecebimentoChecklist';

interface Props {
  estado: SyncEstado;
  pendentes: number;
  ultimoSalvamento: Date | null;
  onSincronizar: () => void;
  className?: string;
}

export function AutosaveIndicator({
  estado,
  pendentes,
  ultimoSalvamento,
  onSincronizar,
  className,
}: Props) {
  const hora = ultimoSalvamento
    ? ultimoSalvamento.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null;

  const conteudo = {
    sincronizado: {
      icon: <Check className="h-3.5 w-3.5" />,
      texto: hora ? `Salvo às ${hora}` : 'Tudo salvo',
      cor: 'text-muted-foreground',
    },
    salvando: {
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
      texto: 'Salvando…',
      cor: 'text-muted-foreground',
    },
    pendente: {
      icon: <Cloud className="h-3.5 w-3.5" />,
      texto: `${pendentes} resposta(s) aguardando envio`,
      cor: 'text-amber-600 dark:text-amber-500',
    },
    offline: {
      icon: <CloudOff className="h-3.5 w-3.5" />,
      texto:
        pendentes > 0
          ? `Offline — ${pendentes} resposta(s) salva(s) no aparelho`
          : 'Offline — respostas serão salvas no aparelho',
      cor: 'text-destructive',
    },
  }[estado];

  return (
    <div className={cn('flex items-center gap-2 text-xs', conteudo.cor, className)}>
      {conteudo.icon}
      <span className="truncate">{conteudo.texto}</span>
      {pendentes > 0 && estado !== 'salvando' && (
        <Button variant="ghost" size="sm" className="h-6 px-2" onClick={onSincronizar}>
          <RefreshCw className="mr-1 h-3 w-3" /> Tentar agora
        </Button>
      )}
    </div>
  );
}
