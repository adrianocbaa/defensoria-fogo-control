import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronRight, ChevronDown, MessageSquare, AlertTriangle, Search, Filter, Lock } from "lucide-react";
import { OrcamentoItem } from "@/hooks/useOrcamentoItems";
import { cn } from "@/lib/utils";

interface TreeNode extends OrcamentoItem {
  children: TreeNode[];
  executadoAcumulado: number;
  executadoDia: number;
  totalExecutado: number;
  percentualExecutado: number;
  disponivel: number;
  excedeuLimite: boolean;
  activity?: any;
  quantidadeOriginal?: number;
  quantidadeAjustada?: number;
  ajusteAditivo?: number;
}

interface PlanilhaTreeViewProps {
  items: any[];
  localExecutado: Record<string, number>;
  onExecutadoChange: (orcamentoItemId: string, activityId: string, value: number) => void;
  onExecutadoBlur: (orcamentoItemId: string, activityId: string, value: number) => void;
  onOpenNote: (activityId: string, orcamentoItemId: string, itemDescricao: string) => void;
  isUpdating: boolean;
  isRdoApproved?: boolean;
  isContratada?: boolean;
  activityNotes?: Map<string, number>; // Map de activityId -> contagem de notas
}

export function PlanilhaTreeView({
  items,
  localExecutado,
  onExecutadoChange,
  onExecutadoBlur,
  onOpenNote,
  isUpdating,
  isRdoApproved = false,
  isContratada = false,
  activityNotes = new Map()
}: PlanilhaTreeViewProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [showOnlyWithValue, setShowOnlyWithValue] = useState(false);

  // Construir árvore de itens
  const tree = useMemo(() => {
    const nodeMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    // Criar todos os nós
    items.forEach(item => {
      nodeMap.set(item.item, { ...item, children: [] });
    });

    // Organizar hierarquia
    items.forEach(item => {
      const node = nodeMap.get(item.item)!;
      if (item.parent_code) {
        const parent = nodeMap.get(item.parent_code);
        if (parent) {
          parent.children.push(node);
        } else {
          rootNodes.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    return rootNodes;
  }, [items]);

  // Filtrar árvore
  const filteredTree = useMemo(() => {
    const filterNode = (node: TreeNode): TreeNode | null => {
      // Aplicar busca
      const matchesSearch = !searchTerm || 
        node.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.codigo.toLowerCase().includes(searchTerm.toLowerCase());

      // Aplicar filtro de valor
      const matchesValueFilter = !showOnlyWithValue || 
        (!node.is_macro && node.executadoDia > 0);

      // Filtrar filhos recursivamente
      const filteredChildren = node.children
        .map(filterNode)
        .filter((child): child is TreeNode => child !== null);

      // Incluir nó se ele ou seus filhos correspondem aos filtros
      if (matchesSearch && matchesValueFilter) {
        return { ...node, children: filteredChildren };
      } else if (filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }

      return null;
    };

    return tree.map(filterNode).filter((node): node is TreeNode => node !== null);
  }, [tree, searchTerm, showOnlyWithValue]);

  const toggleNode = (itemCode: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(itemCode)) {
        next.delete(itemCode);
      } else {
        next.add(itemCode);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allMacros = new Set<string>();
    const collectMacros = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        if (node.is_macro) {
          allMacros.add(node.item);
        }
        collectMacros(node.children);
      });
    };
    collectMacros(tree);
    setExpandedNodes(allMacros);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Função recursiva para verificar se algum ancestral é "ADMINISTRAÇÃO"
  const hasAdministracaoAncestor = (currentNode: TreeNode, allNodes: TreeNode[]): boolean => {
    if (!currentNode.parent_code) return false;
    
    const parent = allNodes.find(n => n.item === currentNode.parent_code);
    if (!parent) return false;
    
    if (parent.is_macro && parent.descricao.toLowerCase().includes('administração')) {
      return true;
    }
    
    return hasAdministracaoAncestor(parent, allNodes);
  };

  // Função para coletar todos os nós em uma lista plana
  const flattenNodes = (nodes: TreeNode[]): TreeNode[] => {
    const result: TreeNode[] = [];
    const traverse = (nodeList: TreeNode[]) => {
      nodeList.forEach(n => {
        result.push(n);
        if (n.children.length > 0) {
          traverse(n.children);
        }
      });
    };
    traverse(nodes);
    return result;
  };

  const allFlatNodes = useMemo(() => flattenNodes(tree), [tree]);

  const renderNode = (node: TreeNode, level: number = 0): JSX.Element[] => {
    const isExpanded = expandedNodes.has(node.item);
    const hasChildren = node.children.length > 0;
    const isMacro = node.is_macro;
    const isAdministracaoMacro = isMacro && node.descricao.toLowerCase().includes('administração');
    const isUnderAdministracao = !isMacro && hasAdministracaoAncestor(node, allFlatNodes);
    // Bloquear edição de itens de Administração APENAS para Contratada
    const isBlockedByAdministracao = isUnderAdministracao && isContratada;
    // Bloquear edição de itens totalmente suprimidos (quantidade ajustada = 0)
    const isFullySuppressed = (node.quantidadeAjustada ?? node.quantidade) <= 0;

    const elements: JSX.Element[] = [];

    // Renderizar nó atual
    elements.push(
      <div
        key={node.id}
        className={cn(
          "border-b last:border-b-0",
          isMacro && "bg-muted/30",
          isBlockedByAdministracao && "opacity-60"
        )}
        style={{ paddingLeft: `${level * 1.5}rem` }}
      >
        <div className="flex items-center gap-2 py-3 px-3">
          {/* Ícone de expansão */}
          <div className="w-6 flex-shrink-0">
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => toggleNode(node.item)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>

          {/* Item Code */}
          <div className="w-20 flex-shrink-0">
            <Badge variant="outline" className="font-mono text-xs">
              {node.item}
            </Badge>
          </div>

          {/* Código Banco */}
          <div className="w-24 flex-shrink-0 text-xs text-muted-foreground truncate">
            {node.codigo}
          </div>

          {/* Descrição */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{node.descricao}</p>
              {isMacro && (
                <Badge variant="secondary" className="text-xs">MACRO</Badge>
              )}
              {node.origem === 'aditivo' && (
                <Badge variant="secondary" className="text-xs">
                  Aditivo {node.aditivo_num}
                </Badge>
              )}
            </div>
          </div>

          {/* Unidade */}
          <div className="w-16 flex-shrink-0 text-xs text-muted-foreground text-center">
            {node.unidade}
          </div>

          {/* Quantidade Total (ajustada se houver aditivo) */}
          <div className="w-24 flex-shrink-0 text-sm text-right">
            {isMacro ? '—' : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={cn(
                      node.ajusteAditivo && node.ajusteAditivo !== 0 && (
                        node.ajusteAditivo < 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
                      )
                    )}>
                      {(node.quantidadeAjustada ?? node.quantidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </TooltipTrigger>
                  {node.ajusteAditivo && node.ajusteAditivo !== 0 && (
                    <TooltipContent>
                      <p className="text-xs">
                        Original: {node.quantidadeOriginal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        <br />
                        {node.ajusteAditivo < 0 ? 'Supressão' : 'Acréscimo'}: {node.ajusteAditivo.toLocaleString('pt-BR', { minimumFractionDigits: 2, signDisplay: 'always' })}
                      </p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Executado (RDO) - apenas para MICRO */}
          <div className="w-32 flex-shrink-0">
            {!isMacro && node.activity && !isBlockedByAdministracao && !isFullySuppressed ? (
              isRdoApproved ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="h-8 flex items-center justify-center gap-1 px-2 border rounded-md bg-muted">
                        <Lock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{node.executadoDia.toFixed(2)}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>RDO aprovado - edição bloqueada</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  max={Math.max(0, (node.quantidadeAjustada ?? node.quantidade) - node.executadoAcumulado)}
                  value={parseFloat(node.executadoDia.toFixed(2))}
                  onChange={(e) => onExecutadoChange(
                    node.id,
                    node.activity.id,
                    parseFloat(e.target.value) || 0
                  )}
                  onBlur={(e) => onExecutadoBlur(
                    node.id,
                    node.activity.id,
                    parseFloat(e.target.value) || 0
                  )}
                  className={cn(
                    "h-8 text-sm",
                    node.excedeuLimite && 'border-destructive focus-visible:ring-destructive'
                  )}
                />
              )
            ) : isFullySuppressed ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="h-8 flex items-center justify-center gap-1 text-destructive">
                      <Lock className="h-3 w-3" />
                      <span className="text-xs">Suprimido</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Item totalmente suprimido por aditivo</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (isAdministracaoMacro || isBlockedByAdministracao) ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="h-8 flex items-center justify-center gap-1 text-muted-foreground">
                      <Lock className="h-3 w-3" />
                      <span className="text-xs">Bloqueado</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isContratada ? 'Itens de Administração: preenchimento exclusivo do Fiscal' : 'MACRO não recebe valores'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <div className="h-8 flex items-center justify-center text-muted-foreground">
                —
              </div>
            )}
          </div>

          {/* Acumulado */}
          <div className="w-24 flex-shrink-0 text-sm text-right">
            {!isMacro ? node.executadoAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'}
          </div>

          {/* Restante */}
          <div className="w-24 flex-shrink-0 text-sm text-right">
            {!isMacro ? node.disponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'}
          </div>

          {/* Obs. - apenas para MICRO */}
          <div className="w-12 flex-shrink-0">
            {!isMacro && node.activity && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 relative",
                        activityNotes.has(node.activity.id) && "text-primary"
                      )}
                      onClick={() => onOpenNote(
                        node.activity.id,
                        node.id,
                        `${node.item} - ${node.descricao}`
                      )}
                    >
                      <MessageSquare className="h-4 w-4" />
                      {activityNotes.has(node.activity.id) && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground rounded-full">
                          {activityNotes.get(node.activity.id)}
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {activityNotes.has(node.activity.id) 
                      ? `${activityNotes.get(node.activity.id)} observação(ões) registrada(s)`
                      : 'Adicionar observação'
                    }
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Barra de progresso para MICRO */}
        {!isMacro && (
          <div className="px-3 pb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progresso</span>
              <span className={cn(
                "font-semibold",
                node.excedeuLimite ? 'text-destructive' : 'text-primary'
              )}>
                {node.percentualExecutado.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={Math.min(100, node.percentualExecutado)} 
              className="h-1.5"
            />
            {node.excedeuLimite && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3" />
                Execução excede a quantidade disponível
              </p>
            )}
          </div>
        )}
      </div>
    );

    // Renderizar filhos se expandido
    if (isExpanded && hasChildren) {
      node.children.forEach(child => {
        elements.push(...renderNode(child, level + 1));
      });
    }

    return elements;
  };

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por item, descrição ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowOnlyWithValue(!showOnlyWithValue)}
          className={cn(showOnlyWithValue && "bg-primary text-primary-foreground")}
        >
          <Filter className="h-4 w-4 mr-2" />
          Apenas com valor
        </Button>
        <Button variant="outline" size="sm" onClick={expandAll}>
          Expandir tudo
        </Button>
        <Button variant="outline" size="sm" onClick={collapseAll}>
          Recolher tudo
        </Button>
      </div>

      {/* Header da tabela */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {/* Cabeçalho fixo */}
            <div className="border-b bg-muted/50 sticky top-0 z-10">
              <div className="flex items-center gap-2 py-2 px-3 text-xs font-semibold text-muted-foreground">
                <div className="w-6 flex-shrink-0"></div>
                <div className="w-20 flex-shrink-0">Item</div>
                <div className="w-24 flex-shrink-0">Código</div>
                <div className="flex-1 min-w-[200px]">Descrição</div>
                <div className="w-16 flex-shrink-0 text-center">Und</div>
                <div className="w-24 flex-shrink-0 text-right" title="Quantidade ajustada conforme aditivos">Quant. Atual</div>
                <div className="w-32 flex-shrink-0 text-center">Executado (RDO)</div>
                <div className="w-24 flex-shrink-0 text-right">Acumulado</div>
                <div className="w-24 flex-shrink-0 text-right">Restante</div>
                <div className="w-12 flex-shrink-0"></div>
              </div>
            </div>

            {/* Árvore de itens */}
            <div>
              {filteredTree.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Nenhum item encontrado</p>
                </div>
              ) : (
                filteredTree.map(node => renderNode(node))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
