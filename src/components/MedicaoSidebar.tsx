import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from '@/components/ui/sidebar';
import { Calculator, Zap, Plus, MoreVertical, Lock, Check } from 'lucide-react';
import { ResumoContrato } from '@/components/ResumoContrato';
import { CronogramaView } from '@/components/CronogramaView';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Medicao {
  id: number;
  sessionId?: string;
  nome: string;
  dados: { [itemId: number]: { qnt: number; percentual: number; total: number } };
  bloqueada?: boolean;
  dataBloqueio?: string;
  usuarioBloqueio?: string;
}

interface Aditivo {
  id: number;
  nome: string;
  dados: { [itemId: number]: { qnt: number; percentual: number; total: number } };
  sessionId?: string;
  sequencia?: number;
  bloqueada?: boolean;
  created_at?: string;
}

interface MedicaoSidebarProps {
  obraId: string;
  valorTotalOriginal: number;
  aditivos: Aditivo[];
  items: any[];
  ehItemPrimeiroNivel: (codigo: string) => boolean;
  medicaoAtual: number | null;
  medicoes: Medicao[];
  isAdmin: boolean;
  setMedicaoAtual: (id: number) => void;
  criarNovaMedicao: () => void;
  salvarEBloquearMedicao: (id: number) => void;
  setConfirm: (value: any) => void;
  setNovoAditivoAberto: (value: boolean) => void;
  salvarAditivo: (id: number) => void;
  publicarAditivo: (id: number) => void;
  editarAditivo: (id: number) => void;
}

const relativeTimePTBR = (iso?: string) => {
  if (!iso) return '';
  try {
    return formatDistanceToNow(new Date(iso), { locale: ptBR, addSuffix: true });
  } catch {
    return '';
  }
};

export function MedicaoSidebar({
  obraId,
  valorTotalOriginal,
  aditivos,
  items,
  ehItemPrimeiroNivel,
  medicaoAtual,
  medicoes,
  isAdmin,
  setMedicaoAtual,
  criarNovaMedicao,
  salvarEBloquearMedicao,
  setConfirm,
  setNovoAditivoAberto,
  salvarAditivo,
  publicarAditivo,
  editarAditivo,
}: MedicaoSidebarProps) {
  return (
    <Sidebar className="border-l" collapsible="none">
      <SidebarContent className="overflow-y-auto">
        {/* Análise Financeira */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-base font-semibold">Análise Financeira</SidebarGroupLabel>
          <SidebarGroupContent className="space-y-4 px-2">
            <ResumoContrato 
              valorTotalOriginal={valorTotalOriginal}
              aditivos={aditivos}
              items={items}
              ehItemPrimeiroNivel={ehItemPrimeiroNivel}
              medicaoAtual={medicaoAtual}
            />
            <CronogramaView obraId={obraId} />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Gestão de Medições */}
        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-base font-semibold">Gestão</SidebarGroupLabel>
          <SidebarGroupContent className="space-y-4 px-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Calculator className="h-4 w-4" />
                    Medições
                  </CardTitle>
                  <Button onClick={criarNovaMedicao} disabled={!isAdmin} size="sm" variant="outline">
                    <Plus className="h-3 w-3 mr-1" />
                    Nova
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {medicoes.length === 0 ? (
                  <p className="text-muted-foreground text-xs">Nenhuma medição criada.</p>
                ) : (
                  <div className="space-y-2">
                    {medicoes.map((m) => (
                      <div
                        key={m.id}
                        className={`flex items-center justify-between p-2 rounded-md border text-xs ${
                          medicaoAtual === m.id ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Button
                            variant={medicaoAtual === m.id ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setMedicaoAtual(m.id)}
                            className="h-7 text-xs"
                          >
                            {m.nome}
                          </Button>
                          {m.bloqueada && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Lock className="h-3 w-3 text-yellow-600 flex-shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Bloqueada {m.dataBloqueio ? relativeTimePTBR(m.dataBloqueio) : ''}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        {isAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {m.bloqueada ? (
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    setConfirm({ open: true, type: 'reabrir-medicao', medicaoId: m.id });
                                  }}
                                >
                                  🔓 Reabrir
                                </DropdownMenuItem>
                              ) : (
                                <>
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      salvarEBloquearMedicao(m.id);
                                    }}
                                  >
                                    🔒 Bloquear
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      setConfirm({ open: true, type: 'excluir-medicao', medicaoId: m.id });
                                    }}
                                  >
                                    🗑️ Excluir
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Aditivos */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Zap className="h-4 w-4" />
                    Aditivos
                  </CardTitle>
                  <Button onClick={() => setNovoAditivoAberto(true)} disabled={!isAdmin} size="sm" variant="outline">
                    <Plus className="h-3 w-3 mr-1" />
                    Novo
                  </Button>
                </div>
              </CardHeader>
              {aditivos.length > 0 && (
                <CardContent>
                  <div className="space-y-2">
                    {aditivos.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-2 rounded-md border border-border text-xs"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Badge variant={a.bloqueada ? 'default' : 'secondary'} className="text-xs">
                            {a.nome}
                          </Badge>
                          {a.bloqueada && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Publicado {a.created_at ? relativeTimePTBR(a.created_at) : ''}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {a.sequencia && (
                            <span className="text-xs text-muted-foreground truncate">
                              ({a.sequencia}ª med.)
                            </span>
                          )}
                        </div>
                        {isAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {a.bloqueada ? (
                                <>
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      editarAditivo(a.id);
                                    }}
                                  >
                                    🔓 Reabrir
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      setConfirm({ open: true, type: 'excluir-aditivo', aditivoId: a.id });
                                    }}
                                  >
                                    🗑️ Excluir
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <>
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      salvarAditivo(a.id);
                                    }}
                                  >
                                    💾 Salvar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      publicarAditivo(a.id);
                                    }}
                                  >
                                    ✅ Publicar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      setConfirm({ open: true, type: 'excluir-aditivo', aditivoId: a.id });
                                    }}
                                  >
                                    🗑️ Excluir
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
