import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ObrasLayout, ObrasSidebarMenuButton } from '@/components/obras/ObrasLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Map, ListChecks, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const MODOS = [
  {
    key: 'dinamico',
    titulo: 'Checklist Dinâmico com Projeto',
    desc: 'Marque ocorrências diretamente sobre a planta em PDF, com ambientes e serviços vinculados aos pontos do projeto.',
    icon: Map,
  },
  {
    key: 'recebimento',
    titulo: 'Recebimento de Obra (lista de serviços)',
    desc: 'Vistoria mobile-first por ambiente e serviço, com biblioteca padronizada, pendências, reinspeção e relatório.',
    icon: ListChecks,
  },
];

export function ChecklistHub() {
  const { obraId = '' } = useParams();
  const navigate = useNavigate();
  const [nome, setNome] = useState('');

  useEffect(() => {
    if (!obraId) return;
    supabase
      .from('obras')
      .select('nome')
      .eq('id', obraId)
      .maybeSingle()
      .then(({ data }) => setNome(data?.nome ?? ''));
  }, [obraId]);

  return (
    <ObrasLayout
      header={({ openMenu }) => (
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur md:px-8">
          <ObrasSidebarMenuButton onClick={openMenu} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/obras/${obraId}`)}
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold md:text-lg">Checklist da obra</h1>
            <p className="truncate text-xs text-muted-foreground">{nome}</p>
          </div>
        </header>
      )}
    >
      <div className="mx-auto w-full max-w-3xl space-y-3">
        <p className="text-sm text-muted-foreground">
          Escolha o modo de checklist que deseja utilizar nesta obra. Os dois modos funcionam de
          forma independente e podem ser usados em paralelo.
        </p>
        {MODOS.map((m) => (
          <Card
            key={m.key}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/obras/${obraId}/checklist/${m.key}`)}
            onKeyDown={(e) =>
              e.key === 'Enter' && navigate(`/obras/${obraId}/checklist/${m.key}`)
            }
            className="flex cursor-pointer items-center gap-4 p-5 transition-colors hover:bg-muted/40"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <m.icon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{m.titulo}</p>
              <p className="text-sm text-muted-foreground">{m.desc}</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </Card>
        ))}
      </div>
    </ObrasLayout>
  );
}

export default ChecklistHub;
