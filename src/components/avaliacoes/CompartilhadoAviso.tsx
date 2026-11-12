import { Info } from 'lucide-react';

export interface Compartilhamento { compartilhado: boolean; outros_dados: number; vinculos_avaliando?: number; outras_avaliacoes: string[]; dado_outras_avaliacoes?: string[] }

/** Aviso de cadastro físico reutilizado em outros registros (dados de mercado ou avaliações ativas). */
export function CompartilhadoAviso({ share, children }: { share: Compartilhamento; children?: React.ReactNode }) {
  const partes = [
    share.outros_dados > 0 ? `${share.outros_dados} outro(s) dado(s) de mercado` : null,
    share.outras_avaliacoes.length > 0 ? `avaliação(ões) ativa(s) ${share.outras_avaliacoes.join(', ')}` : null,
  ].filter(Boolean);
  return (
    <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-3 text-sm" role="note">
      <Info className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
      <div className="space-y-2">
        <p><strong>Este cadastro físico é reutilizado em outros registros</strong>{partes.length ? `: ${partes.join('; ')}` : ''}.</p>
        {children}
      </div>
    </div>
  );
}
