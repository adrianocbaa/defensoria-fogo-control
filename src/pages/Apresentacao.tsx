import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ChevronLeft, 
  ChevronRight, 
  Building2, 
  FileText, 
  ClipboardCheck, 
  BarChart3, 
  Users, 
  Calendar,
  Shield,
  Eye,
  FileSpreadsheet,
  TrendingUp,
  CheckCircle2,
  PenLine,
  Home,
  MapPin,
  Image,
  FileUp,
  Plus,
  Trash2,
  FileX,
  AlertTriangle,
  AlertCircle,
  Camera,
  MessageSquare,
  Download,
  Printer,
  XCircle,
  History,
  Lock,
  Check,
  Save,
  UserPlus,
  UserMinus,
  ChevronDown,
  Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import sidifLogo from '@/assets/sidif-logo-oficial.png';

// Componentes dos novos slides
import {
  CalendarioDifCapa,
  CalendarioDifObjetivos,
  CalendarioDifDiretrizes,
  GoogleCalendarReal,
  ModeloPreenchimento
} from '@/components/apresentacao/CalendarioDifSlides';

import {
  GestaoContratosCapa,
  DiretrizesInternasFiscalizacao,
  AtribuicoesGestorContratos,
  GestorContratosRegras,
  GestorContratosExcecoes,
  HierarquiaFuncoes,
  ResumoNovasDiretrizes
} from '@/components/apresentacao/GestaoContratosSlides';

interface Slide {
  id: number;
  title: string;
  subtitle?: string;
  content: React.ReactNode;
}

// Componente simulando o formulário de cadastro de obras
// Componente de balão explicativo
function TooltipBalloon({ children, position = 'right' }: { children: React.ReactNode; position?: 'right' | 'left' | 'top' }) {
  const positionClasses = {
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2'
  };
  
  const arrowClasses = {
    right: 'right-full top-1/2 -translate-y-1/2 border-r-amber-500 border-t-transparent border-b-transparent border-l-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-amber-500 border-t-transparent border-b-transparent border-r-transparent',
    top: 'top-full left-1/2 -translate-x-1/2 border-t-amber-500 border-l-transparent border-r-transparent border-b-transparent'
  };

  return (
    <div className={`absolute ${positionClasses[position]} z-10 w-max max-w-[200px]`}>
      <div className="bg-amber-500 text-white text-xs px-2 py-1.5 rounded-md shadow-lg font-medium relative">
        {children}
        <div className={`absolute w-0 h-0 border-[6px] ${arrowClasses[position]}`} />
      </div>
    </div>
  );
}

function MockObraForm() {
  return (
    <div className="space-y-4">
      {/* Card de Padronização de Nomenclatura */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="bg-amber-500 text-white p-2 rounded-full">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-amber-800 mb-2">Padronização do Nome da Obra</h4>
            <p className="text-sm text-amber-700 mb-3">
              O nome da obra deve seguir o padrão: <strong>"Núcleo/Unidade + Cidade - Tipo de Serviço"</strong>
            </p>
            <div className="bg-white rounded-md p-3 border border-amber-200">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Exemplos corretos:</p>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Núcleo Criminal de Rondonópolis - Cobertura</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Núcleo de Sinop - Ampliação</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Núcleo de Barra do Garças - Sala de Estagiários</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário com balões */}
      <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
        <div className="bg-muted/50 px-4 py-3 border-b flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <span className="font-semibold">Nova Obra</span>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Nome da Obra *</label>
              <Input value="Núcleo Criminal de Rondonópolis - Cobertura" readOnly className="h-8 text-sm bg-muted/30" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Município *</label>
              <Input value="Rondonópolis" readOnly className="h-8 text-sm bg-muted/30" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Número do Contrato *</label>
              <Input value="CT-2024/0123" readOnly className="h-8 text-sm bg-muted/30" />
            </div>
            <div className="space-y-1 relative">
              <label className="text-xs text-muted-foreground font-medium">Status *</label>
              <div className="h-8 px-3 flex items-center justify-between bg-muted/30 rounded-md text-sm border cursor-pointer">
                <span>Planejamento</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
              <TooltipBalloon position="right">
                Planejamento, Em Andamento, Paralisada, Concluída
              </TooltipBalloon>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 relative">
              <label className="text-xs text-muted-foreground font-medium">Tipo *</label>
              <div className="h-8 px-3 flex items-center justify-between bg-muted/30 rounded-md text-sm border cursor-pointer">
                <span>Reforma</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
              <TooltipBalloon position="left">
                Construção, Reforma, Ampliação, Manutenção
              </TooltipBalloon>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Valor Inicial do Contrato (R$) *</label>
              <Input value="1.250.000,00" readOnly className="h-8 text-sm bg-muted/30" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Data de Início</label>
              <Input value="15/01/2024" readOnly className="h-8 text-sm bg-muted/30" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Tempo de Obra (dias)</label>
              <Input value="180" readOnly className="h-8 text-sm bg-muted/30" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 relative">
              <label className="text-xs text-muted-foreground font-medium">Empresa Responsável</label>
              <div className="h-8 px-3 flex items-center justify-between bg-muted/30 rounded-md text-sm border cursor-pointer">
                <span>Selecione a empresa</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
              <TooltipBalloon position="left">
                Lista de empresas cadastradas no sistema
              </TooltipBalloon>
            </div>
            <div className="space-y-1 relative">
              <label className="text-xs text-muted-foreground font-medium">Região</label>
              <div className="h-8 px-3 flex items-center justify-between bg-muted/30 rounded-md text-sm border cursor-pointer text-muted-foreground">
                <span>Selecione primeiro a empresa</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
              <TooltipBalloon position="right">
                Filtrado conforme regiões da ATA da empresa
              </TooltipBalloon>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 relative">
              <label className="text-xs text-muted-foreground font-medium">Fiscal do Contrato</label>
              <div className="h-8 px-3 flex items-center justify-between bg-muted/30 rounded-md text-sm border cursor-pointer">
                <span>Selecione o fiscal</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
              <TooltipBalloon position="left">
                Usuários com perfil Fiscal/DIF
              </TooltipBalloon>
            </div>
            <div className="space-y-1 relative">
              <label className="text-xs text-muted-foreground font-medium">Responsável pelo Projeto</label>
              <div className="h-8 px-3 flex items-center justify-between bg-muted/30 rounded-md text-sm border cursor-pointer">
                <span>Selecione o(a) arquiteto(a)</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
              <TooltipBalloon position="right">
                Arquitetos do setor DIF
              </TooltipBalloon>
            </div>
          </div>

          <div className="bg-muted/30 rounded-md p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">RDO Habilitado</p>
              <p className="text-xs text-muted-foreground">Se desabilitado, não exigirá preenchimento de RDO</p>
            </div>
            <div className="w-10 h-5 bg-primary rounded-full relative">
              <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" size="sm" className="gap-2">
              <MapPin className="h-4 w-4" />
              Selecionar no Mapa
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente simulando o calendário de RDO
function MockRdoCalendar() {
  const days = [
    { day: 1, status: 'aprovado', photos: 5, hasOccurrence: true },
    { day: 2, status: 'aprovado', photos: 3 },
    { day: 3, status: 'aprovado', photos: 8 },
    { day: 4, status: 'semExpediente' },
    { day: 5, status: 'semExpediente' },
    { day: 6, status: 'aprovado', photos: 4 },
    { day: 7, status: 'aprovado', photos: 2, hasOccurrence: true },
    { day: 8, status: 'concluido', pendingSignature: 'fiscal' },
    { day: 9, status: 'concluido', pendingSignature: 'contratada' },
    { day: 10, status: 'preenchendo', photos: 1 },
    { day: 11, status: 'semExpediente' },
    { day: 12, status: 'semExpediente' },
    { day: 13, status: 'falta' },
    { day: 14, status: 'falta' },
    { day: 15, status: null },
  ];

  const getStatusStyle = (status: string | null) => {
    switch(status) {
      case 'aprovado': return 'bg-green-100 dark:bg-green-950/30 border-green-300 text-green-800';
      case 'concluido': return 'bg-blue-100 dark:bg-blue-950/30 border-blue-300 text-blue-800';
      case 'preenchendo': return 'bg-orange-100 dark:bg-orange-950/30 border-orange-300 text-orange-800';
      case 'semExpediente': return 'bg-slate-100 dark:bg-slate-800/50 border-slate-300 text-slate-600';
      case 'falta': return 'bg-amber-50 dark:bg-amber-950/20 border-amber-300';
      default: return 'bg-card border-border hover:bg-accent/50';
    }
  };

  return (
    <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
      <div className="bg-muted/50 px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <span className="font-semibold">Calendário de RDO</span>
        </div>
        <div className="flex items-center gap-2">
          <ChevronLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Janeiro 2024</span>
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-medium text-muted-foreground">
          <div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div><div>Dom</div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((d, i) => (
            <div 
              key={i} 
              className={`aspect-square border rounded-lg p-1.5 relative transition-colors cursor-pointer text-center ${getStatusStyle(d.status)}`}
            >
              <span className="text-sm font-medium">{d.day}</span>
              {d.photos && (
                <div className="absolute bottom-1 left-1 flex items-center gap-0.5 text-[10px] text-muted-foreground">
                  <Camera className="h-2.5 w-2.5" />
                  {d.photos}
                </div>
              )}
              {d.hasOccurrence && (
                <div className="absolute bottom-1 right-1">
                  <MessageSquare className="h-2.5 w-2.5 text-orange-500" />
                </div>
              )}
              {d.pendingSignature && (
                <div className="absolute top-1 right-1">
                  <PenLine className="h-3 w-3 text-amber-500" />
                </div>
              )}
              {d.status === 'falta' && (
                <div className="absolute top-1 right-1">
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-200 border border-green-400" />
            <span>Aprovado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-200 border border-blue-400" />
            <span>Concluído</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-orange-200 border border-orange-400" />
            <span>Preenchendo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-slate-200 border border-slate-400" />
            <span>Sem Expediente</span>
          </div>
          <div className="flex items-center gap-1.5">
            <PenLine className="h-3 w-3 text-amber-500" />
            <span>Assinatura Pendente</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Ícones de ação do RDO
function MockRdoActions() {
  const actions = [
    { icon: Plus, label: 'Criar RDO', color: 'text-green-600', desc: 'Clique em um dia vazio' },
    { icon: FileX, label: 'Sem Atividade', color: 'text-slate-600', desc: 'Dia sem expediente na obra' },
    { icon: Eye, label: 'Visualizar', color: 'text-blue-600', desc: 'Ver detalhes do RDO' },
    { icon: PenLine, label: 'Editar', color: 'text-orange-600', desc: 'Modificar informações' },
    { icon: Download, label: 'Baixar PDF', color: 'text-red-600', desc: 'Exportar relatório' },
    { icon: Printer, label: 'Imprimir Lote', color: 'text-purple-600', desc: 'Múltiplos RDOs' },
    { icon: Trash2, label: 'Excluir', color: 'text-red-500', desc: 'Remover RDO (admin)' },
  ];

  return (
    <div className="bg-card border rounded-lg p-4">
      <h4 className="font-semibold mb-3 flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-primary" />
        Ações Disponíveis no Calendário
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map((a, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <a.icon className={`h-5 w-5 ${a.color}`} />
            <div>
              <p className="text-sm font-medium">{a.label}</p>
              <p className="text-[10px] text-muted-foreground">{a.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Lista de serviços do RDO
function MockServicesList() {
  const services = [
    { code: '01.01.01', desc: 'Demolição de alvenaria', unit: 'm³', qty: 15.50, total: 45.00 },
    { code: '01.02.03', desc: 'Remoção de revestimento cerâmico', unit: 'm²', qty: 28.00, total: 120.00 },
    { code: '02.01.01', desc: 'Alvenaria de tijolo cerâmico', unit: 'm²', qty: 35.00, total: 35.00 },
    { code: '03.01.02', desc: 'Chapisco interno', unit: 'm²', qty: 42.00, total: 42.00 },
    { code: '03.02.01', desc: 'Reboco interno', unit: 'm²', qty: 0, total: 0 },
  ];

  return (
    <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
      <div className="bg-muted/50 px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          <span className="font-semibold">Atividades do Dia - RDO #042</span>
        </div>
        <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
          Preenchendo
        </Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-3 py-2 font-medium">Código</th>
              <th className="px-3 py-2 font-medium">Descrição do Serviço</th>
              <th className="px-3 py-2 font-medium text-center">Un.</th>
              <th className="px-3 py-2 font-medium text-right">Qtd. Hoje</th>
              <th className="px-3 py-2 font-medium text-right">Acumulado</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s, i) => (
              <tr key={i} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs">{s.code}</td>
                <td className="px-3 py-2">{s.desc}</td>
                <td className="px-3 py-2 text-center text-muted-foreground">{s.unit}</td>
                <td className="px-3 py-2 text-right">
                  <Input 
                    value={s.qty > 0 ? s.qty.toFixed(2) : ''} 
                    readOnly 
                    className="h-7 w-20 text-right text-sm ml-auto bg-amber-50 border-amber-200" 
                    placeholder="0,00"
                  />
                </td>
                <td className="px-3 py-2 text-right font-medium">{s.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 bg-muted/30 border-t flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          <AlertTriangle className="h-3 w-3 inline mr-1 text-amber-500" />
          A <strong>Contratada</strong> preenche os quantitativos executados no dia
        </p>
        <Button size="sm" className="gap-2">
          <Save className="h-4 w-4" />
          Salvar Atividades
        </Button>
      </div>
    </div>
  );
}

// Simulação de assinaturas e histórico
function MockSignaturesPanel() {
  return (
    <div className="space-y-4">
      {/* Histórico de reprovações */}
      <div className="bg-card border border-amber-200 rounded-lg overflow-hidden">
        <div className="bg-amber-50 px-4 py-3 flex items-center gap-2 cursor-pointer">
          <History className="h-5 w-5 text-amber-600" />
          <span className="font-semibold text-amber-800">Histórico de Reprovações (2)</span>
          <ChevronDown className="h-4 w-4 text-amber-600 ml-auto" />
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
            <XCircle className="h-5 w-5 text-red-500 shrink-0" />
            <div className="text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-red-700">Reprovação #2</span>
                <span className="text-muted-foreground">• 08/01/2024 14:32</span>
              </div>
              <p className="mt-1"><strong>Motivo:</strong> Faltam fotos das fundações concluídas</p>
            </div>
          </div>
          <div className="flex gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
            <XCircle className="h-5 w-5 text-red-500 shrink-0" />
            <div className="text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-red-700">Reprovação #1</span>
                <span className="text-muted-foreground">• 08/01/2024 10:15</span>
              </div>
              <p className="mt-1"><strong>Motivo:</strong> Quantidade do item 01.02.03 está incorreta</p>
            </div>
          </div>
        </div>
      </div>

      {/* Painel de assinaturas */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Fiscal/Gestor (DPE-MT)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <p className="text-xs text-muted-foreground">Assinado por</p>
              <p className="font-medium text-sm">João da Silva</p>
              <p className="text-xs text-muted-foreground">Fiscal de Obras</p>
              <p className="text-xs text-muted-foreground mt-1">08/01/2024 às 16:45</p>
            </div>
            <Badge className="bg-green-100 text-green-800 border-green-300">
              ✓ Validado
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Responsável Técnico (Contratada)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <p className="text-xs text-muted-foreground">Assinado por</p>
              <p className="font-medium text-sm">Maria Oliveira</p>
              <p className="text-xs text-muted-foreground">Engenheira Civil - CREA 12345</p>
              <p className="text-xs text-muted-foreground mt-1">08/01/2024 às 15:30</p>
            </div>
            <Badge className="bg-green-100 text-green-800 border-green-300">
              ✓ Validado
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Status final */}
      <div className="flex items-center justify-center gap-2 p-4 bg-green-50 rounded-lg border border-green-200">
        <Lock className="h-5 w-5 text-green-600" />
        <span className="font-semibold text-green-800">RDO Aprovado e Bloqueado</span>
      </div>
    </div>
  );
}

// Simulação de RDO impresso
function MockPrintedRdo() {
  return (
    <div className="bg-white border-2 border-gray-300 rounded shadow-lg p-6 max-w-2xl mx-auto text-black text-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-gray-400 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
            LOGO
          </div>
          <div>
            <h1 className="font-bold text-lg">RELATÓRIO DIÁRIO DE OBRA</h1>
            <p className="text-xs text-gray-600">Defensoria Pública do Estado de Mato Grosso</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-2xl">RDO #042</p>
          <p className="text-xs text-gray-600">08/01/2024</p>
        </div>
      </div>

      {/* Info da Obra */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
        <div>
          <p className="text-gray-500">Obra:</p>
          <p className="font-medium">Reforma da Defensoria Pública de Cuiabá</p>
        </div>
        <div>
          <p className="text-gray-500">Contrato:</p>
          <p className="font-medium">CT-2024/0123</p>
        </div>
        <div>
          <p className="text-gray-500">Contratada:</p>
          <p className="font-medium">Construtora ABC Ltda</p>
        </div>
        <div>
          <p className="text-gray-500">Condições Climáticas:</p>
          <p className="font-medium">☀️ Ensolarado - 32°C</p>
        </div>
      </div>

      {/* Tabela de Atividades */}
      <div className="border rounded mb-4">
        <div className="bg-gray-100 px-3 py-2 font-bold text-xs border-b">
          ATIVIDADES EXECUTADAS
        </div>
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-1 text-left border-b">Código</th>
              <th className="px-2 py-1 text-left border-b">Descrição</th>
              <th className="px-2 py-1 text-center border-b">Un.</th>
              <th className="px-2 py-1 text-right border-b">Qtd.</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="px-2 py-1 border-b">01.01.01</td><td className="px-2 py-1 border-b">Demolição de alvenaria</td><td className="px-2 py-1 text-center border-b">m³</td><td className="px-2 py-1 text-right border-b">15,50</td></tr>
            <tr><td className="px-2 py-1 border-b">01.02.03</td><td className="px-2 py-1 border-b">Remoção de revestimento cerâmico</td><td className="px-2 py-1 text-center border-b">m²</td><td className="px-2 py-1 text-right border-b">28,00</td></tr>
            <tr><td className="px-2 py-1">02.01.01</td><td className="px-2 py-1">Alvenaria de tijolo cerâmico</td><td className="px-2 py-1 text-center">m²</td><td className="px-2 py-1 text-right">35,00</td></tr>
          </tbody>
        </table>
      </div>

      {/* Mão de Obra e Equipamentos */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
        <div className="border rounded p-2">
          <p className="font-bold mb-1">MÃO DE OBRA</p>
          <p>Pedreiro: 4 | Servente: 6 | Eletricista: 2</p>
        </div>
        <div className="border rounded p-2">
          <p className="font-bold mb-1">EQUIPAMENTOS</p>
          <p>Betoneira: 1 | Andaime: 3 conjuntos</p>
        </div>
      </div>

      {/* Assinaturas */}
      <div className="grid grid-cols-2 gap-6 mt-6 pt-4 border-t-2 border-gray-400">
        <div className="text-center">
          <div className="border-b border-gray-400 h-12 mb-1 flex items-end justify-center italic text-gray-400 text-xs">
            [Assinatura Digital]
          </div>
          <p className="font-medium">João da Silva</p>
          <p className="text-xs text-gray-500">Fiscal de Obras - DPE/MT</p>
          <p className="text-xs text-gray-500">08/01/2024 16:45</p>
        </div>
        <div className="text-center">
          <div className="border-b border-gray-400 h-12 mb-1 flex items-end justify-center italic text-gray-400 text-xs">
            [Assinatura Digital]
          </div>
          <p className="font-medium">Maria Oliveira</p>
          <p className="text-xs text-gray-500">Eng. Civil - CREA 12345</p>
          <p className="text-xs text-gray-500">08/01/2024 15:30</p>
        </div>
      </div>

      {/* QR Code placeholder */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-[8px]">
            QR CODE
          </div>
          <div>
            <p>Documento verificável em:</p>
            <p className="font-mono">sidif.lovable.app/rdo/verify/abc123</p>
          </div>
        </div>
        <p>Gerado em: 08/01/2024 17:00</p>
      </div>
    </div>
  );
}

// Simulação do gerenciamento de permissões
function MockPermissionsManager() {
  const obras = [
    { nome: 'Reforma DP Cuiabá', role: 'titular', substitutos: ['Ana Paula', 'Carlos Souza'] },
    { nome: 'Construção DP Rondonópolis', role: 'titular', substitutos: [] },
    { nome: 'Adequações DP Sinop', role: 'autorizado', substitutos: null },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
        <div className="bg-muted/50 px-4 py-3 border-b flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-semibold">Minhas Obras - Gerenciar Acessos</span>
        </div>
        <div className="divide-y">
          {obras.map((obra, i) => (
            <div key={i} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{obra.nome}</span>
                </div>
                <Badge variant={obra.role === 'titular' ? 'default' : 'secondary'}>
                  {obra.role === 'titular' ? 'Fiscal Titular' : 'Autorizado'}
                </Badge>
              </div>
              
              {obra.role === 'titular' && (
                <div className="ml-6 mt-3 p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Servidores Autorizados:</span>
                    <Button variant="outline" size="sm" className="h-7 gap-1">
                      <UserPlus className="h-3 w-3" />
                      Adicionar
                    </Button>
                  </div>
                  {obra.substitutos && obra.substitutos.length > 0 ? (
                    <div className="space-y-2">
                      {obra.substitutos.map((sub, j) => (
                        <div key={j} className="flex items-center justify-between bg-card p-2 rounded border">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{sub}</span>
                            <Badge variant="outline" className="text-xs">Autorizado</Badge>
                          </div>
                          <Button variant="ghost" size="sm" className="h-7 text-red-500 hover:text-red-700">
                            <UserMinus className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nenhum servidor autorizado</p>
                  )}
                </div>
              )}
              
              {obra.role === 'autorizado' && (
                <p className="ml-6 text-sm text-muted-foreground italic">
                  Você tem permissão de edição nesta obra
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Regras de Permissão
          </h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Fiscal Titular:</strong> Acesso total + pode autorizar outros servidores</li>
            <li>• <strong>Autorizado:</strong> Pode editar apenas obras "Em Andamento"</li>
            <li>• <strong>Sem vínculo:</strong> Apenas visualização (sem edição)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// Tipos de medição
function MockMedicaoTypes() {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="border-2 border-orange-200 bg-orange-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="h-5 w-5 text-orange-600" />
            Medição Manual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            O fiscal insere manualmente os quantitativos executados de cada serviço.
          </p>
          <ul className="text-sm space-y-1">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Flexibilidade total
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Útil para ajustes pontuais
            </li>
            <li className="flex items-center gap-2 text-muted-foreground">
              <XCircle className="h-4 w-4 text-red-400" />
              Sem rastreabilidade diária
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-2 border-green-300 bg-green-50/50 ring-2 ring-green-400 ring-offset-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardCheck className="h-5 w-5 text-green-600" />
              Medição por RDO
            </CardTitle>
            <Badge className="bg-green-600">Recomendado</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Sistema importa automaticamente os quantitativos dos RDOs aprovados no período.
          </p>
          <ul className="text-sm space-y-1">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Rastreabilidade completa
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Dados validados por assinatura
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Obrigatório em novos contratos
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Apresentacao() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const slides: Slide[] = [
    // ============ RESUMO DAS NOVAS DIRETRIZES (PRIMEIRO SLIDE) ============
    // SLIDE 1 - Novas Diretrizes DIF
    {
      id: 1,
      title: 'Novas Diretrizes DIF',
      subtitle: 'Resumo das principais mudanças',
      content: <ResumoNovasDiretrizes />,
    },

    // ============ CALENDÁRIO DIF ============
    // SLIDE 2 - Capa Calendário DIF
    {
      id: 2,
      title: '',
      content: <CalendarioDifCapa />,
    },

    // SLIDE 3 - Objetivos
    {
      id: 3,
      title: 'Objetivos',
      subtitle: 'Registro de viagens institucionais no Google Agenda',
      content: <CalendarioDifObjetivos />,
    },

    // SLIDE 4 - Diretrizes
    {
      id: 4,
      title: 'Diretrizes de Preenchimento',
      subtitle: 'Regras para registro de viagens',
      content: <CalendarioDifDiretrizes />,
    },

    // SLIDE 5 - Google Calendar Visual
    {
      id: 5,
      title: 'Agenda de Viagens DIF',
      subtitle: 'Visualização real no Google Calendar',
      content: (
        <div className="mt-4">
          <GoogleCalendarReal />
        </div>
      ),
    },

    // SLIDE 6 - Modelo de Preenchimento
    {
      id: 6,
      title: 'Como Preencher',
      subtitle: 'Modelo padrão para registro de viagens',
      content: <ModeloPreenchimento />,
    },

    // ============ GESTÃO E FISCALIZAÇÃO DE CONTRATOS ============
    // SLIDE 7 - Capa Gestão de Contratos
    {
      id: 7,
      title: '',
      content: <GestaoContratosCapa />,
    },

    // SLIDE 8 - Diretrizes Internas - Fiscalização e Gestão de Contratos
    {
      id: 8,
      title: 'Diretrizes Internas',
      subtitle: 'Fiscalização e Gestão de Contratos - SEI n° 2025.0.000019210-4',
      content: <DiretrizesInternasFiscalizacao />,
    },

    // SLIDE 9 - Atribuições do Gestor de Contratos
    {
      id: 9,
      title: 'Atribuições do Gestor de Contratos',
      subtitle: 'Função, atribuições e responsabilidades',
      content: <AtribuicoesGestorContratos />,
    },

    // SLIDE 10 - Regras do Gestor
    {
      id: 10,
      title: 'Função de Gestor de Contratos',
      subtitle: 'Novas diretrizes para designação',
      content: <GestorContratosRegras />,
    },

    // SLIDE 11 - Exceções e Continuidade
    {
      id: 11,
      title: 'Exceções e Continuidade',
      subtitle: 'Situações especiais e garantia de fluxo administrativo',
      content: <GestorContratosExcecoes />,
    },

    // SLIDE 12 - Hierarquia
    {
      id: 12,
      title: 'Gestor vs Fiscal',
      subtitle: 'Diferenças de atribuições e responsabilidades',
      content: <HierarquiaFuncoes />,
    },

    // ============ SISTEMA INTEGRADO DIF ============
    // SLIDE 11 - Capa Sistema SIDIF
    {
      id: 11,
      title: '',
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-8">
          <img src={sidifLogo} alt="SIDIF Logo" className="h-32 object-contain" />
          <div>
            <h1 className="text-5xl font-bold text-primary mb-4">
              Sistema Integrado DIF
            </h1>
            <p className="text-2xl text-muted-foreground">
              Diretoria de Infraestrutura Física
            </p>
          </div>
          <div className="mt-8 space-y-2">
            <p className="text-xl font-medium">Apresentação de Funcionalidades</p>
            <p className="text-lg text-muted-foreground">Módulos: Obras, Medições e RDO</p>
          </div>
          <Badge variant="outline" className="text-base px-4 py-2 mt-8">
            Público: Fiscais de Obras
          </Badge>
        </div>
      ),
    },

    // SLIDE 11 - Visão Geral
    {
      id: 11,
      title: 'Visão Geral do Sistema',
      subtitle: 'Uma plataforma integrada para gestão de obras públicas',
      content: (
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200">
            <CardContent className="p-6 text-center">
              <Building2 className="h-16 w-16 mx-auto mb-4 text-blue-600" />
              <h3 className="text-xl font-bold mb-2">Gestão de Obras</h3>
              <p className="text-muted-foreground">
                Cadastro, acompanhamento e controle de todas as obras
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200">
            <CardContent className="p-6 text-center">
              <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 text-green-600" />
              <h3 className="text-xl font-bold mb-2">Medições</h3>
              <p className="text-muted-foreground">
                Controle financeiro, planilhas e aditivos contratuais
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200">
            <CardContent className="p-6 text-center">
              <ClipboardCheck className="h-16 w-16 mx-auto mb-4 text-orange-600" />
              <h3 className="text-xl font-bold mb-2">RDO</h3>
              <p className="text-muted-foreground">
                Relatório Diário de Obra com atividades e assinaturas
              </p>
            </CardContent>
          </Card>
        </div>
      ),
    },

    // SLIDE 12 - Cadastro de Obras (VISUAL)
    {
      id: 12,
      title: 'Cadastro de Obras',
      subtitle: 'Formulário completo com todas as informações contratuais',
      content: (
        <div className="mt-4">
          <MockObraForm />
        </div>
      ),
    },

    // SLIDE 13 - Mapa de Obras Públicas
    {
      id: 13,
      title: 'Mapa de Obras Públicas',
      subtitle: 'Visualização geográfica de todas as obras do estado',
      content: (
        <div className="mt-4 border rounded-lg overflow-hidden bg-card shadow-lg">
          {/* Header do mapa */}
          <div className="bg-primary px-4 py-2 flex items-center gap-3">
            <div className="flex items-center gap-2 text-primary-foreground">
              <img src={sidifLogo} alt="SiDIF" className="h-6" />
            </div>
          </div>
          
          <div className="flex h-[400px]">
            {/* Sidebar de Filtros */}
            <div className="w-56 border-r bg-card p-4 space-y-4 overflow-y-auto">
              <div>
                <h4 className="font-semibold text-sm mb-2">Mapa de Obras Públicas</h4>
                <p className="text-xs text-muted-foreground">Visualize e acompanhe o andamento das obras públicas no estado</p>
              </div>
              
              <div className="border-t pt-4">
                <p className="text-xs font-medium mb-2 flex items-center gap-1">
                  <Eye className="h-3 w-3" /> Filtros
                </p>
              </div>
              
              <div>
                <p className="text-xs font-medium mb-2">Status da Obra</p>
                <div className="space-y-1.5">
                  {[
                    { label: 'Concluída', color: 'bg-green-500', checked: false },
                    { label: 'Em Andamento', color: 'bg-blue-500', checked: true },
                    { label: 'Planejada', color: 'bg-amber-500', checked: false },
                    { label: 'Paralisada', color: 'bg-red-500', checked: false },
                  ].map((status, i) => (
                    <label key={i} className="flex items-center gap-2 text-xs cursor-pointer">
                      <div className={`w-3 h-3 rounded border ${status.checked ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                        {status.checked && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <span className={`w-2 h-2 rounded-full ${status.color}`} />
                      <span>{status.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <p className="text-xs font-medium mb-2">Tipo de Obra</p>
                <div className="space-y-1.5">
                  {['Reforma', 'Construção', 'Adequações'].map((tipo, i) => (
                    <label key={i} className="flex items-center gap-2 text-xs cursor-pointer">
                      <div className="w-3 h-3 rounded border border-muted-foreground/30" />
                      <span>{tipo}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <p className="text-xs font-medium mb-2">Município</p>
                <div className="flex items-center gap-2 border rounded-md px-2 py-1.5 bg-muted/30">
                  <Search className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Buscar por município...</span>
                </div>
              </div>
            </div>
            
            {/* Área do Mapa */}
            <div className="flex-1 relative bg-[#e8f0e8]">
              {/* Simulação do mapa */}
              <div className="absolute inset-0 opacity-50" style={{ 
                backgroundImage: 'linear-gradient(rgba(200,220,200,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(200,220,200,0.3) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
              }} />
              
              {/* Pins no mapa */}
              <div className="absolute top-[20%] left-[30%]">
                <div className="bg-blue-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white">2</div>
              </div>
              <div className="absolute top-[35%] right-[25%]">
                <div className="bg-blue-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                  <MapPin className="h-3 w-3" />
                </div>
              </div>
              <div className="absolute top-[50%] left-[45%]">
                <div className="bg-blue-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                  <MapPin className="h-3 w-3" />
                </div>
              </div>
              <div className="absolute top-[65%] right-[35%]">
                <div className="bg-blue-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                  <MapPin className="h-3 w-3" />
                </div>
              </div>
              <div className="absolute bottom-[15%] left-[55%]">
                <div className="bg-green-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                  <MapPin className="h-3 w-3" />
                </div>
              </div>
              <div className="absolute bottom-[25%] right-[15%]">
                <div className="bg-blue-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white">4</div>
              </div>
              
              {/* Contador de resultados */}
              <div className="absolute top-3 right-3 bg-background/95 backdrop-blur-sm px-3 py-1.5 rounded-lg border shadow-sm">
                <span className="text-xs font-medium">8 obras encontradas</span>
              </div>
              
              {/* Nomes de cidades fictícios */}
              <span className="absolute top-[15%] left-[20%] text-[10px] text-muted-foreground/70">Porto Velho</span>
              <span className="absolute top-[30%] left-[50%] text-[10px] text-muted-foreground/70">Ariquemes</span>
              <span className="absolute top-[45%] left-[35%] text-[10px] text-muted-foreground/70">Ji-Paraná</span>
              <span className="absolute top-[60%] right-[30%] text-[10px] text-muted-foreground/70">Tangará da Serra</span>
              <span className="absolute bottom-[20%] right-[20%] text-[10px] text-muted-foreground/70">Rondonópolis</span>
              <span className="absolute bottom-[35%] left-[60%] text-[10px] text-muted-foreground/70">Cuiabá</span>
            </div>
          </div>
        </div>
      ),
    },

    // SLIDE 14 - Detalhes da Obra (Painel Lateral)
    {
      id: 14,
      title: 'Visualização Externa',
      subtitle: 'Ao clicar em uma obra no mapa, o painel de detalhes é exibido',
      content: (
        <div className="mt-4 border rounded-lg overflow-hidden bg-card shadow-lg">
          {/* Simulação do painel lateral */}
          <div className="flex">
            {/* Mapa reduzido */}
            <div className="w-1/2 h-[420px] relative bg-[#e8f0e8] border-r">
              <div className="absolute inset-0 opacity-50" style={{ 
                backgroundImage: 'linear-gradient(rgba(200,220,200,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(200,220,200,0.3) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
              }} />
              {/* Pin selecionado */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="bg-blue-500 text-white text-xs w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-pulse">
                  <MapPin className="h-5 w-5" />
                </div>
              </div>
              <span className="absolute top-1/2 left-1/2 translate-x-4 -translate-y-4 text-xs text-muted-foreground bg-white/80 px-1 rounded">Cuiabá</span>
            </div>
            
            {/* Painel de detalhes */}
            <div className="w-1/2 h-[420px] overflow-y-auto p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-base">Almoxarifado Santa Cruz - Reforma 02</h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="h-3 w-3" />
                    <span>Cuiabá</span>
                  </div>
                </div>
                <button className="text-muted-foreground hover:text-foreground">
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              
              <div className="flex gap-2">
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Em Andamento</Badge>
                <Badge variant="outline">Reforma</Badge>
              </div>
              
              {/* Informações Gerais */}
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <Building2 className="h-4 w-4" />
                  <span>Informações Gerais</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div>
                    <span className="text-muted-foreground">Contrato:</span>
                    <p className="font-medium">111/2025</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Objeto:</span>
                    <p className="font-medium">Almoxarifado Santa Cruz - Reforma 02</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fiscal do Contrato:</span>
                    <p className="font-medium">Adriano Augusto</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Empresa Responsável:</span>
                    <p className="font-medium">A M I CONSTRUÇÕES LTDA</p>
                  </div>
                </div>
              </div>
              
              {/* Prazos */}
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>Prazos de Execução</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Data de início:</span>
                    <p className="font-medium">28/09/2025</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Data prevista de término:</span>
                    <p className="font-medium">13/10/2025</p>
                  </div>
                </div>
              </div>
              
              {/* Financeiro */}
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <TrendingUp className="h-4 w-4" />
                  <span>Informações Financeiras</span>
                </div>
                <div className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Dados atualizados com base nas medições registradas
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Valor Inicial:</span>
                    <p className="font-semibold">R$ 73.766,43</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Valor Aditivado:</span>
                    <p className="font-medium">R$ 0,00</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Valor Final:</span>
                    <p className="font-semibold text-primary">R$ 73.766,43</p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>Valor Pago:</span>
                    <span className="font-bold text-green-600">23.31%</span>
                  </div>
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div className="absolute h-full bg-green-500 rounded-full" style={{ width: '23.31%' }}>
                      <div className="absolute right-0 top-0 h-full w-0.5 bg-green-700" />
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                    <span>Valor Executado: R$ 17.194,37</span>
                    <span>Valor Final: R$ 73.766,43</span>
                  </div>
                </div>
              </div>
              
              {/* Álbum de Fotos */}
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <Image className="h-4 w-4" />
                  <span>Álbum de Fotos (17)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Álbum de Fotos</span>
                  <Badge variant="secondary" className="text-[10px]">17 fotos em 1 pasta</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-muted p-2 rounded">
                    <Camera className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-xs">
                    <p className="font-medium">NOV. DE 2025</p>
                    <p className="text-muted-foreground">17 fotos</p>
                  </div>
                  <div className="flex gap-1 ml-auto">
                    {[1,2,3].map((i) => (
                      <div key={i} className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                        <Camera className="h-3 w-3 text-muted-foreground/50" />
                      </div>
                    ))}
                    <div className="w-8 h-8 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                      +14
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // SLIDE 15 - Gerenciar Obras (Simplificado)
    {
      id: 15,
      title: 'Gerenciar Obras',
      subtitle: 'Visão consolidada para gestão administrativa',
      content: (
        <div className="space-y-6 mt-6">
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { label: 'Em Andamento', value: '12', color: 'bg-blue-500' },
              { label: 'Paralisadas', value: '3', color: 'bg-yellow-500' },
              { label: 'Concluídas', value: '28', color: 'bg-green-500' },
              { label: 'Total', value: '43', color: 'bg-primary' },
            ].map((stat, i) => (
              <Card key={i}>
                <CardContent className="p-4 text-center">
                  <div className={`w-3 h-3 rounded-full ${stat.color} mx-auto mb-2`} />
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold mb-3">Funcionalidades Principais</h4>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  <span>Mapa de obras por região</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-500" />
                  <span>Gestão de acessos autorizados</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  <span>Ações rápidas (RDO, Medição)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },

    // SLIDE 16 - Tipos de Medição
    {
      id: 16,
      title: 'Sistema de Medições',
      subtitle: 'Dois modos de trabalho: Manual ou via RDO',
      content: (
        <div className="mt-6 space-y-6">
          <MockMedicaoTypes />
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <p className="text-sm text-amber-800">
                <strong>⚠️ Importante:</strong> A partir dos novos contratos, será obrigatório que a Contratada preencha o RDO diariamente. 
                Isso garantirá rastreabilidade total dos quantitativos executados.
              </p>
            </CardContent>
          </Card>
        </div>
      ),
    },

    // SLIDE 17 - RDO Calendário Visual
    {
      id: 17,
      title: 'Calendário de RDO',
      subtitle: 'Visualização mensal com status e indicadores',
      content: (
        <div className="mt-4 space-y-4">
          <MockRdoCalendar />
          <MockRdoActions />
        </div>
      ),
    },

    // SLIDE 18 - RDO Lista de Serviços
    {
      id: 18,
      title: 'Preenchimento de Atividades',
      subtitle: 'A Contratada insere os quantitativos executados no dia',
      content: (
        <div className="mt-4">
          <MockServicesList />
        </div>
      ),
    },

    // SLIDE 19 - Assinaturas e Histórico
    {
      id: 19,
      title: 'Assinaturas e Validação',
      subtitle: 'Fluxo de aprovação com histórico de reprovações',
      content: (
        <div className="mt-4">
          <MockSignaturesPanel />
        </div>
      ),
    },

    // SLIDE 20 - RDO Impresso
    {
      id: 20,
      title: 'RDO Impresso',
      subtitle: 'Documento gerado automaticamente pelo sistema',
      content: (
        <div className="mt-4 overflow-auto max-h-[500px]">
          <MockPrintedRdo />
        </div>
      ),
    },

    // SLIDE 21 - Permissões
    {
      id: 21,
      title: 'Permissões e Segurança',
      subtitle: 'Como o fiscal gerencia suas obras e acessos autorizados',
      content: (
        <div className="mt-4">
          <MockPermissionsManager />
        </div>
      ),
    },

    // SLIDE 22 - Encerramento
    {
      id: 22,
      title: '',
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-8">
          <img src={sidifLogo} alt="SIDIF Logo" className="h-24 object-contain" />
          <div>
            <h1 className="text-4xl font-bold text-primary mb-4">
              Obrigado!
            </h1>
            <p className="text-xl text-muted-foreground">
              Sistema Integrado DIF
            </p>
          </div>
          <div className="flex gap-4 mt-8">
            <Button size="lg" onClick={() => navigate('/dashboard')}>
              <Home className="h-5 w-5 mr-2" />
              Acessar o Sistema
            </Button>
            <Button size="lg" variant="outline" onClick={() => setCurrentSlide(0)}>
              Reiniciar Apresentação
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-8">
            Diretoria de Infraestrutura Física - DPE/MT
          </p>
        </div>
      ),
    },
  ];

  const totalSlides = slides.length;
  const progress = ((currentSlide + 1) / totalSlides) * 100;

  const goToSlide = (index: number) => {
    if (index >= 0 && index < totalSlides) {
      setCurrentSlide(index);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      goToSlide(currentSlide + 1);
    } else if (e.key === 'ArrowLeft') {
      goToSlide(currentSlide - 1);
    }
  };

  return (
    <div 
      className="min-h-screen bg-background flex flex-col"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Header com progresso */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <Home className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Slide {currentSlide + 1} de {totalSlides}
            </span>
          </div>
          <div className="flex-1 max-w-xs mx-4">
            <Progress value={progress} className="h-1" />
          </div>
          <div className="flex gap-1">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentSlide ? 'bg-primary' : 'bg-muted hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Conteúdo do Slide */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
        <div className="w-full max-w-5xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="min-h-[500px]"
            >
              {slides[currentSlide].title && (
                <div className="text-center mb-6">
                  <h2 className="text-3xl font-bold">{slides[currentSlide].title}</h2>
                  {slides[currentSlide].subtitle && (
                    <p className="text-lg text-muted-foreground mt-2">
                      {slides[currentSlide].subtitle}
                    </p>
                  )}
                </div>
              )}
              {slides[currentSlide].content}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navegação */}
      <div className="border-t bg-card/50 backdrop-blur-sm sticky bottom-0">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => goToSlide(currentSlide - 1)}
            disabled={currentSlide === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>
          <p className="text-sm text-muted-foreground">
            Use as setas ← → ou barra de espaço para navegar
          </p>
          <Button
            onClick={() => goToSlide(currentSlide + 1)}
            disabled={currentSlide === totalSlides - 1}
          >
            Próximo
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
