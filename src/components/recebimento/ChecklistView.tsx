import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { List, Plus } from 'lucide-react';
import type { Ambiente, AmbienteServico, Verificacao } from '@/hooks/useRecebimentoChecklist';
import type { VerificacaoStatus } from '@/lib/recebimento/constants';
import type { Foto, Pendencia } from '@/hooks/useRecebimentoPendencias';
import { ABERTAS } from '@/lib/recebimento/constants';
import { AmbienteList } from './AmbienteList';
import { AmbienteSwitchSheet } from './AmbienteSwitchSheet';
import { ChecklistAmbiente } from './ChecklistAmbiente';
import { ContextoFotosPanel } from './ContextoFotosPanel';

interface Props {
  ambientes: Ambiente[];
  ambienteAtivoId: string | null;
  onSelecionarAmbiente: (id: string) => void;
  pendenciasPorAmbiente: Record<string, number>;
  pendencias: Pendencia[];
  fotos: Foto[];
  somenteLeitura: boolean;
  onSelecionarStatus: (v: Verificacao, status: VerificacaoStatus) => void;
  onMarcarPendentes: (servico: AmbienteServico) => void;
  onNovoAmbiente: () => void;
  onEditarAmbiente: () => void;
  onDuplicarAmbiente: () => void;
  onRemoverAmbiente: (id: string) => void;
  onAdicionarServico: () => void;
  onRemoverServico: (id: string) => void;
  onFoto: () => void;
  onAbrirPendencia: (p: Pendencia) => void;
}

export function ChecklistView({
  ambientes,
  ambienteAtivoId,
  onSelecionarAmbiente,
  pendenciasPorAmbiente,
  pendencias,
  fotos,
  somenteLeitura,
  onSelecionarStatus,
  onMarcarPendentes,
  onNovoAmbiente,
  onEditarAmbiente,
  onDuplicarAmbiente,
  onRemoverAmbiente,
  onAdicionarServico,
  onRemoverServico,
  onFoto,
  onAbrirPendencia,
}: Props) {
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [listaMobile, setListaMobile] = useState(false);

  const ambiente = ambientes.find((a) => a.id === ambienteAtivoId) ?? null;

  const fotosAmbiente = fotos.filter((f) => f.ambiente_id === ambienteAtivoId);
  const pendenciasAmbiente = pendencias.filter(
    (p) => p.ambiente_id === ambienteAtivoId && ABERTAS.includes(p.situacao),
  );

  if (ambientes.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhum ambiente cadastrado nesta vistoria. Comece adicionando os ambientes que serão
          vistoriados.
        </p>
        {!somenteLeitura && (
          <Button className="h-11" onClick={onNovoAmbiente}>
            <Plus className="mr-2 h-4 w-4" /> Novo ambiente
          </Button>
        )}
      </Card>
    );
  }

  const painelAmbientes = (
    <AmbienteList
      ambientes={ambientes}
      ativoId={ambienteAtivoId}
      onSelect={(id) => {
        onSelecionarAmbiente(id);
        setListaMobile(false);
      }}
      pendenciasPorAmbiente={pendenciasPorAmbiente}
      onNovoAmbiente={somenteLeitura ? undefined : onNovoAmbiente}
      className="lg:max-h-[calc(100vh-13rem)]"
    />
  );

  return (
    <>
      {/* Mobile: lista completa de ambientes */}
      {listaMobile ? (
        <div className="md:hidden">
          {painelAmbientes}
          {!somenteLeitura && (
            <Button
              size="icon"
              className="fixed bottom-24 right-5 z-40 h-14 w-14 rounded-full shadow-lg"
              onClick={onNovoAmbiente}
              aria-label="Adicionar ambiente"
            >
              <Plus className="h-6 w-6" />
            </Button>
          )}
        </div>
      ) : (
        <div className="md:hidden">
          <Button
            variant="outline"
            className="mb-3 h-11 w-full justify-start"
            onClick={() => setListaMobile(true)}
          >
            <List className="mr-2 h-4 w-4" /> Ambientes ({ambientes.length})
          </Button>
          {ambiente && (
            <ChecklistAmbiente
              ambiente={ambiente}
              somenteLeitura={somenteLeitura}
              onSelecionarStatus={onSelecionarStatus}
              onMarcarPendentes={onMarcarPendentes}
              onAdicionarServico={somenteLeitura ? undefined : onAdicionarServico}
              onRemoverServico={somenteLeitura ? undefined : onRemoverServico}
              onEditarAmbiente={somenteLeitura ? undefined : onEditarAmbiente}
              onDuplicarAmbiente={somenteLeitura ? undefined : onDuplicarAmbiente}
              onRemoverAmbiente={somenteLeitura ? undefined : onRemoverAmbiente}
              onFoto={onFoto}
              onTrocarAmbiente={() => setSeletorAberto(true)}
            />
          )}
        </div>
      )}

      {/* Tablet: split view · Desktop: três painéis */}
      <div className="hidden gap-5 md:grid md:grid-cols-[minmax(240px,280px)_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_300px]">
        <div className="md:sticky md:top-4 md:self-start">{painelAmbientes}</div>

        <div className="min-w-0">
          {ambiente && (
            <ChecklistAmbiente
              ambiente={ambiente}
              somenteLeitura={somenteLeitura}
              onSelecionarStatus={onSelecionarStatus}
              onMarcarPendentes={onMarcarPendentes}
              onAdicionarServico={somenteLeitura ? undefined : onAdicionarServico}
              onRemoverServico={somenteLeitura ? undefined : onRemoverServico}
              onEditarAmbiente={somenteLeitura ? undefined : onEditarAmbiente}
              onDuplicarAmbiente={somenteLeitura ? undefined : onDuplicarAmbiente}
              onRemoverAmbiente={somenteLeitura ? undefined : onRemoverAmbiente}
              onFoto={onFoto}
            />
          )}
        </div>

        <div className="hidden xl:sticky xl:top-4 xl:block xl:max-h-[calc(100vh-8rem)] xl:self-start">
          <ContextoFotosPanel
            ambienteNome={ambiente?.nome ?? ''}
            fotos={fotosAmbiente}
            pendencias={pendenciasAmbiente}
            onAbrirPendencia={onAbrirPendencia}
            onFoto={onFoto}
          />
        </div>
      </div>

      <AmbienteSwitchSheet
        open={seletorAberto}
        onOpenChange={setSeletorAberto}
        ambientes={ambientes}
        ativoId={ambienteAtivoId}
        pendenciasPorAmbiente={pendenciasPorAmbiente}
        onSelect={onSelecionarAmbiente}
      />
    </>
  );
}
