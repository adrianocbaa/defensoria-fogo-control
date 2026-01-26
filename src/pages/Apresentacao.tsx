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

import { CapaApresentacao } from '@/components/apresentacao/CapaApresentacao';

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
    <div className="grid grid-cols-2 gap-3">
      {/* Card de Padronização de Nomenclatura */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <div className="bg-amber-500 text-white p-1.5 rounded-full shrink-0">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-semibold text-amber-800 text-sm mb-1">Padronização do Nome</h4>
            <p className="text-xs text-amber-700 mb-2">
              Padrão: <strong>"Núcleo + Cidade - Serviço"</strong>
            </p>
            <div className="bg-white rounded p-2 border border-amber-200">
              <p className="text-[10px] text-muted-foreground mb-1 font-medium">Exemplos:</p>
              <ul className="space-y-0.5 text-xs">
                <li className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  <span>Núcleo Criminal Rondonópolis - Cobertura</span>
                </li>
                <li className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  <span>Núcleo de Sinop - Ampliação</span>
                </li>
                <li className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  <span>Núcleo de Barra do Garças - Sala Estagiários</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário com balões */}
      <div className="bg-card border rounded-lg shadow-sm overflow-hidden row-span-2">
        <div className="bg-muted/50 px-3 py-2 border-b flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Nova Obra</span>
        </div>
        <div className="p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <label className="text-[10px] text-muted-foreground font-medium">Nome da Obra *</label>
              <Input value="Núcleo Criminal Rondonópolis - Cobertura" readOnly className="h-7 text-xs bg-muted/30" />
            </div>
            <div className="space-y-0.5">
              <label className="text-[10px] text-muted-foreground font-medium">Município *</label>
              <Input value="Rondonópolis" readOnly className="h-7 text-xs bg-muted/30" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <label className="text-[10px] text-muted-foreground font-medium">Nº Contrato *</label>
              <Input value="CT-2024/0123" readOnly className="h-7 text-xs bg-muted/30" />
            </div>
            <div className="space-y-0.5 relative">
              <label className="text-[10px] text-muted-foreground font-medium">Status *</label>
              <div className="h-7 px-2 flex items-center justify-between bg-muted/30 rounded text-xs border">
                <span>Planejamento</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </div>
              <TooltipBalloon position="right">
                Planejamento, Em Andamento, Paralisada, Concluída
              </TooltipBalloon>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5 relative">
              <label className="text-[10px] text-muted-foreground font-medium">Tipo *</label>
              <div className="h-7 px-2 flex items-center justify-between bg-muted/30 rounded text-xs border">
                <span>Reforma</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </div>
              <TooltipBalloon position="left">
                Construção, Reforma, Ampliação
              </TooltipBalloon>
            </div>
            <div className="space-y-0.5">
              <label className="text-[10px] text-muted-foreground font-medium">Valor (R$) *</label>
              <Input value="1.250.000,00" readOnly className="h-7 text-xs bg-muted/30" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5 relative">
              <label className="text-[10px] text-muted-foreground font-medium">Empresa</label>
              <div className="h-7 px-2 flex items-center justify-between bg-muted/30 rounded text-xs border">
                <span className="text-muted-foreground">Selecione...</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </div>
              <TooltipBalloon position="left">
                Empresas cadastradas
              </TooltipBalloon>
            </div>
            <div className="space-y-0.5 relative">
              <label className="text-[10px] text-muted-foreground font-medium">Região</label>
              <div className="h-7 px-2 flex items-center justify-between bg-muted/30 rounded text-xs border text-muted-foreground">
                <span>Filtrado pela ATA</span>
                <ChevronDown className="h-3 w-3" />
              </div>
              <TooltipBalloon position="right">
                Regiões da ATA
              </TooltipBalloon>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5 relative">
              <label className="text-[10px] text-muted-foreground font-medium">Fiscal</label>
              <div className="h-7 px-2 flex items-center justify-between bg-muted/30 rounded text-xs border">
                <span className="text-muted-foreground">Selecione...</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </div>
              <TooltipBalloon position="left">
                Perfil Fiscal/DIF
              </TooltipBalloon>
            </div>
            <div className="space-y-0.5 relative">
              <label className="text-[10px] text-muted-foreground font-medium">Arquiteto</label>
              <div className="h-7 px-2 flex items-center justify-between bg-muted/30 rounded text-xs border">
                <span className="text-muted-foreground">Selecione...</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </div>
              <TooltipBalloon position="right">
                Arquitetos DIF
              </TooltipBalloon>
            </div>
          </div>

          <div className="bg-muted/30 rounded p-2 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium">RDO Habilitado</p>
              <p className="text-[10px] text-muted-foreground">Exigir preenchimento</p>
            </div>
            <div className="w-8 h-4 bg-primary rounded-full relative">
              <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow" />
            </div>
          </div>
        </div>
      </div>

      {/* Card informativo sobre campos obrigatórios */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h4 className="font-semibold text-blue-800 text-sm mb-2 flex items-center gap-1.5">
          <Building2 className="h-4 w-4" />
          Campos com Lista
        </h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li className="flex items-center gap-1.5">
            <ChevronDown className="h-3 w-3" />
            <strong>Status:</strong> Opções do ciclo de vida
          </li>
          <li className="flex items-center gap-1.5">
            <ChevronDown className="h-3 w-3" />
            <strong>Tipo:</strong> Categoria da obra
          </li>
          <li className="flex items-center gap-1.5">
            <ChevronDown className="h-3 w-3" />
            <strong>Empresa/Região:</strong> Vinculados à ATA
          </li>
          <li className="flex items-center gap-1.5">
            <ChevronDown className="h-3 w-3" />
            <strong>Fiscal/Arquiteto:</strong> Usuários do sistema
          </li>
        </ul>
      </div>
    </div>
  );
}

// Componente simulando o calendário de RDO
function MockRdoCalendar() {
  const days = [
    { day: 1, status: 'aprovado', photos: 5 },
    { day: 2, status: 'aprovado', photos: 3 },
    { day: 3, status: 'aprovado', photos: 8 },
    { day: 4, status: 'semExpediente' },
    { day: 5, status: 'semExpediente' },
    { day: 6, status: 'aprovado', photos: 4 },
    { day: 7, status: 'aprovado', photos: 2 },
    { day: 8, status: 'concluido' },
    { day: 9, status: 'concluido' },
    { day: 10, status: 'preenchendo' },
    { day: 11, status: 'semExpediente' },
    { day: 12, status: 'semExpediente' },
    { day: 13, status: 'falta' },
    { day: 14, status: null },
  ];

  const getStatusStyle = (status: string | null) => {
    switch(status) {
      case 'aprovado': return 'bg-green-100 border-green-300 text-green-800';
      case 'preenchendo': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'semExpediente': return 'bg-slate-100 border-slate-300 text-slate-600';
      case 'falta': return 'bg-amber-50 border-amber-300';
      default: return 'bg-card border-border';
    }
  };

  return (
    <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
      <div className="bg-muted/50 px-3 py-2 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Calendário de RDO</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <ChevronLeft className="h-3 w-3" />
          <span className="font-medium">Janeiro 2024</span>
          <ChevronRight className="h-3 w-3" />
        </div>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-7 gap-1.5 mb-1.5 text-center text-[10px] font-medium text-muted-foreground">
          <div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div><div>Dom</div>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d, i) => (
            <div 
              key={i} 
              className={`aspect-square border rounded p-1 relative text-center ${getStatusStyle(d.status)}`}
            >
              <span className="text-xs font-medium">{d.day}</span>
              {d.photos && (
                <div className="absolute bottom-0.5 left-0.5 text-[8px] text-muted-foreground flex items-center gap-0.5">
                  <Camera className="h-2 w-2" />
                  {d.photos}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-2 text-[10px]">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded bg-green-200 border border-green-400" />
            <span>Aprovado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded bg-orange-200 border border-orange-400" />
            <span>Preenchendo</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded bg-slate-200 border border-slate-400" />
            <span>Sem Expediente</span>
          </div>
          <div className="flex items-center gap-1">
            <PenLine className="h-2.5 w-2.5 text-amber-500" />
            <span>Pendente</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Ícones de ação do RDO
function MockRdoActions() {
  const actions = [
    { icon: Plus, label: 'Criar RDO', color: 'text-green-600' },
    { icon: FileX, label: 'Sem Atividade', color: 'text-slate-600' },
    { icon: Eye, label: 'Visualizar', color: 'text-blue-600' },
    { icon: PenLine, label: 'Editar', color: 'text-orange-600' },
    { icon: Download, label: 'Baixar PDF', color: 'text-red-600' },
    { icon: Printer, label: 'Imprimir Lote', color: 'text-purple-600' },
  ];

  return (
    <div className="bg-card border rounded-lg p-3">
      <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
        <ClipboardCheck className="h-4 w-4 text-primary" />
        Ações Disponíveis
      </h4>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {actions.map((a, i) => (
          <div key={i} className="flex items-center gap-1.5 p-1.5 rounded bg-muted/30 text-xs">
            <a.icon className={`h-4 w-4 ${a.color}`} />
            <span className="font-medium">{a.label}</span>
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
  ];

  return (
    <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
      <div className="bg-muted/50 px-3 py-2 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Atividades do Dia - RDO #042</span>
        </div>
        <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300 text-[10px]">
          Preenchendo
        </Badge>
      </div>
      <table className="w-full text-xs">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-2 py-1.5 font-medium">Código</th>
            <th className="px-2 py-1.5 font-medium">Descrição do Serviço</th>
            <th className="px-2 py-1.5 font-medium text-center">Un.</th>
            <th className="px-2 py-1.5 font-medium text-right">Qtd. Hoje</th>
            <th className="px-2 py-1.5 font-medium text-right">Acumulado</th>
          </tr>
        </thead>
        <tbody>
          {services.map((s, i) => (
            <tr key={i} className="border-t">
              <td className="px-2 py-1.5 font-mono text-[10px]">{s.code}</td>
              <td className="px-2 py-1.5">{s.desc}</td>
              <td className="px-2 py-1.5 text-center text-muted-foreground">{s.unit}</td>
              <td className="px-2 py-1.5 text-right">
                <Input 
                  value={s.qty > 0 ? s.qty.toFixed(2) : ''} 
                  readOnly 
                  className="h-6 w-16 text-right text-xs ml-auto bg-amber-50 border-amber-200" 
                  placeholder="0,00"
                />
              </td>
              <td className="px-2 py-1.5 text-right font-medium">{s.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 py-2 bg-muted/30 border-t flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">
          <AlertTriangle className="h-3 w-3 inline mr-1 text-amber-500" />
          A <strong>Contratada</strong> preenche os quantitativos executados no dia
        </p>
        <Button size="sm" className="gap-1.5 h-7 text-xs">
          <Save className="h-3 w-3" />
          Salvar
        </Button>
      </div>
    </div>
  );
}

// Simulação de assinaturas e histórico
function MockSignaturesPanel() {
  return (
    <div className="space-y-3">
      {/* Histórico de reprovações */}
      <div className="bg-card border border-amber-200 rounded-lg overflow-hidden">
        <div className="bg-amber-50 px-3 py-2 flex items-center gap-2">
          <History className="h-4 w-4 text-amber-600" />
          <span className="font-semibold text-amber-800 text-sm">Histórico de Reprovações (2)</span>
          <ChevronDown className="h-3 w-3 text-amber-600 ml-auto" />
        </div>
        <div className="p-3 space-y-2">
          <div className="flex gap-2 p-2 bg-red-50 rounded border border-red-100">
            <XCircle className="h-4 w-4 text-red-500 shrink-0" />
            <div className="text-xs">
              <span className="font-medium text-red-700">Reprovação #2</span>
              <span className="text-muted-foreground ml-1">• 08/01/2024</span>
              <p className="mt-0.5">Faltam fotos das fundações</p>
            </div>
          </div>
          <div className="flex gap-2 p-2 bg-red-50 rounded border border-red-100">
            <XCircle className="h-4 w-4 text-red-500 shrink-0" />
            <div className="text-xs">
              <span className="font-medium text-red-700">Reprovação #1</span>
              <span className="text-muted-foreground ml-1">• 08/01/2024</span>
              <p className="mt-0.5">Quantidade incorreta item 01.02.03</p>
            </div>
          </div>
        </div>
      </div>

      {/* Painel de assinaturas */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-green-200">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              Fiscal/Gestor (DPE-MT)
            </div>
            <div className="bg-green-50 p-2 rounded border border-green-200">
              <p className="font-medium text-xs">João da Silva</p>
              <p className="text-[10px] text-muted-foreground">Fiscal • 08/01/2024 16:45</p>
            </div>
            <Badge className="bg-green-100 text-green-800 border-green-300 text-[10px]">
              ✓ Validado
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
              Responsável Técnico
            </div>
            <div className="bg-green-50 p-2 rounded border border-green-200">
              <p className="font-medium text-xs">Maria Oliveira</p>
              <p className="text-[10px] text-muted-foreground">Eng. Civil • 08/01/2024 15:30</p>
            </div>
            <Badge className="bg-green-100 text-green-800 border-green-300 text-[10px]">
              ✓ Validado
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Status final */}
      <div className="flex items-center justify-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
        <Lock className="h-4 w-4 text-green-600" />
        <span className="font-semibold text-green-800 text-sm">RDO Aprovado e Bloqueado</span>
      </div>
    </div>
  );
}

// Simulação de RDO impresso
function MockPrintedRdo() {
  return (
    <div className="bg-white border-2 border-gray-300 rounded shadow-lg p-4 max-w-3xl mx-auto text-black text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-gray-400 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-[8px] text-gray-500">
            LOGO
          </div>
          <div>
            <h1 className="font-bold text-sm">RELATÓRIO DIÁRIO DE OBRA</h1>
            <p className="text-[10px] text-gray-600">Defensoria Pública do Estado de Mato Grosso</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg">RDO #042</p>
          <p className="text-[10px] text-gray-600">08/01/2024</p>
        </div>
      </div>

      {/* Info da Obra */}
      <div className="grid grid-cols-4 gap-2 mb-2 text-[10px]">
        <div>
          <p className="text-gray-500">Obra:</p>
          <p className="font-medium">Reforma DP Cuiabá</p>
        </div>
        <div>
          <p className="text-gray-500">Contrato:</p>
          <p className="font-medium">CT-2024/0123</p>
        </div>
        <div>
          <p className="text-gray-500">Contratada:</p>
          <p className="font-medium">Construtora ABC</p>
        </div>
        <div>
          <p className="text-gray-500">Clima:</p>
          <p className="font-medium">☀️ Ensolarado</p>
        </div>
      </div>

      {/* Tabela de Atividades */}
      <div className="border rounded mb-2">
        <div className="bg-gray-100 px-2 py-1 font-bold text-[10px] border-b">
          ATIVIDADES EXECUTADAS
        </div>
        <table className="w-full text-[10px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-1.5 py-0.5 text-left border-b">Código</th>
              <th className="px-1.5 py-0.5 text-left border-b">Descrição</th>
              <th className="px-1.5 py-0.5 text-center border-b">Un.</th>
              <th className="px-1.5 py-0.5 text-right border-b">Qtd.</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="px-1.5 py-0.5 border-b">01.01.01</td><td className="px-1.5 py-0.5 border-b">Demolição de alvenaria</td><td className="px-1.5 py-0.5 text-center border-b">m³</td><td className="px-1.5 py-0.5 text-right border-b">15,50</td></tr>
            <tr><td className="px-1.5 py-0.5 border-b">01.02.03</td><td className="px-1.5 py-0.5 border-b">Remoção de revestimento cerâmico</td><td className="px-1.5 py-0.5 text-center border-b">m²</td><td className="px-1.5 py-0.5 text-right border-b">28,00</td></tr>
            <tr><td className="px-1.5 py-0.5">02.01.01</td><td className="px-1.5 py-0.5">Alvenaria de tijolo cerâmico</td><td className="px-1.5 py-0.5 text-center">m²</td><td className="px-1.5 py-0.5 text-right">35,00</td></tr>
          </tbody>
        </table>
      </div>

      {/* Mão de Obra e Equipamentos */}
      <div className="grid grid-cols-2 gap-2 mb-2 text-[10px]">
        <div className="border rounded p-1.5">
          <p className="font-bold mb-0.5">MÃO DE OBRA</p>
          <p>Pedreiro: 4 | Servente: 6 | Eletricista: 2</p>
        </div>
        <div className="border rounded p-1.5">
          <p className="font-bold mb-0.5">EQUIPAMENTOS</p>
          <p>Betoneira: 1 | Andaime: 3 conjuntos</p>
        </div>
      </div>

      {/* Assinaturas */}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t-2 border-gray-400">
        <div className="text-center">
          <div className="border-b border-gray-400 h-8 mb-0.5 flex items-end justify-center italic text-gray-400 text-[8px]">
            [Assinatura Digital]
          </div>
          <p className="font-medium text-[10px]">João da Silva</p>
          <p className="text-[9px] text-gray-500">Fiscal - DPE/MT • 08/01/2024</p>
        </div>
        <div className="text-center">
          <div className="border-b border-gray-400 h-8 mb-0.5 flex items-end justify-center italic text-gray-400 text-[8px]">
            [Assinatura Digital]
          </div>
          <p className="font-medium text-[10px]">Maria Oliveira</p>
          <p className="text-[9px] text-gray-500">Eng. Civil • 08/01/2024</p>
        </div>
      </div>

      {/* QR Code */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t text-[9px] text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-[6px]">
            QR
          </div>
          <span className="font-mono">sidif.lovable.app/rdo/verify/abc123</span>
        </div>
        <p>Gerado: 08/01/2024 17:00</p>
      </div>
    </div>
  );
}

// Simulação do gerenciamento de permissões
function MockPermissionsManager() {
  const obras = [
    { nome: 'Reforma DP Cuiabá', role: 'titular', substitutos: ['Ana Paula'] },
    { nome: 'Construção DP Rondonópolis', role: 'titular', substitutos: [] },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
        <div className="bg-muted/50 px-3 py-2 border-b flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Minhas Obras - Acessos</span>
        </div>
        <div className="divide-y">
          {obras.map((obra, i) => (
            <div key={i} className="p-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium text-xs">{obra.nome}</span>
                </div>
                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                  Fiscal Titular
                </Badge>
              </div>
              
              <div className="ml-5 mt-2 p-2 bg-muted/30 rounded text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground text-[10px]">Autorizados:</span>
                  <Button variant="outline" size="sm" className="h-5 gap-1 text-[10px] px-1.5">
                    <UserPlus className="h-2.5 w-2.5" />
                    Adicionar
                  </Button>
                </div>
                {obra.substitutos && obra.substitutos.length > 0 ? (
                  <div className="flex items-center justify-between bg-card p-1.5 rounded border">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px]">{obra.substitutos[0]}</span>
                    </div>
                    <UserMinus className="h-3 w-3 text-red-500" />
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground italic">Nenhum autorizado</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-3">
          <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-1.5 text-sm">
            <Shield className="h-4 w-4" />
            Regras de Permissão
          </h4>
          <ul className="text-xs text-blue-700 space-y-1.5">
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-blue-600 mt-0.5 shrink-0" />
              <span><strong>Fiscal Titular:</strong> Acesso total + pode autorizar servidores</span>
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-blue-600 mt-0.5 shrink-0" />
              <span><strong>Autorizado:</strong> Pode editar obras "Em Andamento"</span>
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-blue-600 mt-0.5 shrink-0" />
              <span><strong>Sem vínculo:</strong> Apenas visualização</span>
            </li>
          </ul>
          <div className="mt-3 p-2 bg-blue-100 rounded border border-blue-200">
            <p className="text-[10px] text-blue-800">
              <strong>💡 Dica:</strong> Use o botão "Adicionar" para autorizar colegas a editar suas obras durante ausências.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Tipos de medição
function MockMedicaoTypes() {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="border-2 border-orange-200 bg-orange-50/50">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-orange-600" />
            <span className="font-semibold text-sm">Medição Manual</span>
          </div>
          <p className="text-xs text-muted-foreground">
            O fiscal insere manualmente os quantitativos executados.
          </p>
          <ul className="text-xs space-y-0.5">
            <li className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-green-600" />
              Flexibilidade total
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-green-600" />
              Útil para ajustes pontuais
            </li>
            <li className="flex items-center gap-1.5 text-muted-foreground">
              <XCircle className="h-3 w-3 text-red-400" />
              Sem rastreabilidade diária
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-2 border-green-300 bg-green-50/50 ring-2 ring-green-400 ring-offset-2">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-green-600" />
              <span className="font-semibold text-sm">Medição por RDO</span>
            </div>
            <Badge className="bg-green-600 text-[10px]">Recomendado</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Importa automaticamente dos RDOs aprovados no período.
          </p>
          <ul className="text-xs space-y-0.5">
            <li className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-green-600" />
              Rastreabilidade completa
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-green-600" />
              Dados validados por assinatura
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-green-600" />
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
    // ============ CAPA INSTITUCIONAL ============
    // SLIDE 1 - Capa da Apresentação
    {
      id: 1,
      title: '',
      content: <CapaApresentacao />,
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
        <div className="border rounded-lg overflow-hidden bg-card shadow-lg">
          {/* Header do mapa */}
          <div className="bg-primary px-3 py-1.5 flex items-center gap-3">
            <div className="flex items-center gap-2 text-primary-foreground">
              <img src={sidifLogo} alt="SiDIF" className="h-5" />
            </div>
          </div>
          
          <div className="flex h-[320px]">
            {/* Sidebar de Filtros */}
            <div className="w-48 border-r bg-card p-3 space-y-3">
              <div>
                <h4 className="font-semibold text-xs mb-1">Mapa de Obras Públicas</h4>
                <p className="text-[10px] text-muted-foreground">Visualize o andamento das obras</p>
              </div>
              
              <div className="border-t pt-2">
                <p className="text-[10px] font-medium mb-1.5 flex items-center gap-1">
                  <Eye className="h-2.5 w-2.5" /> Filtros
                </p>
              </div>
              
              <div>
                <p className="text-[10px] font-medium mb-1.5">Status</p>
                <div className="space-y-1">
                  {[
                    { label: 'Concluída', color: 'bg-green-500', checked: false },
                    { label: 'Em Andamento', color: 'bg-blue-500', checked: true },
                    { label: 'Paralisada', color: 'bg-red-500', checked: false },
                  ].map((status, i) => (
                    <label key={i} className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                      <div className={`w-2.5 h-2.5 rounded border ${status.checked ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                        {status.checked && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                      </div>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.color}`} />
                      <span>{status.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <p className="text-[10px] font-medium mb-1.5">Tipo</p>
                <div className="space-y-1">
                  {['Reforma', 'Construção'].map((tipo, i) => (
                    <label key={i} className="flex items-center gap-1.5 text-[10px] cursor-pointer">
                      <div className="w-2.5 h-2.5 rounded border border-muted-foreground/30" />
                      <span>{tipo}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <p className="text-[10px] font-medium mb-1.5">Município</p>
                <div className="flex items-center gap-1.5 border rounded px-2 py-1 bg-muted/30">
                  <Search className="h-2.5 w-2.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Buscar...</span>
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
        <div className="border rounded-lg overflow-hidden bg-card shadow-lg">
          {/* Simulação do painel lateral */}
          <div className="flex h-[420px]">
            {/* Mapa reduzido */}
            <div className="w-1/3 relative bg-[#e8f0e8] border-r">
              <div className="absolute inset-0 opacity-50" style={{ 
                backgroundImage: 'linear-gradient(rgba(200,220,200,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(200,220,200,0.3) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
              }} />
              {/* Pin selecionado */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="bg-blue-500 text-white text-xs w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-pulse">
                  <MapPin className="h-4 w-4" />
                </div>
              </div>
              <span className="absolute top-1/2 left-1/2 translate-x-3 -translate-y-3 text-[10px] text-muted-foreground bg-white/80 px-1 rounded">Cuiabá</span>
            </div>
            
            {/* Painel de detalhes */}
            <div className="w-2/3 p-2.5 space-y-1.5 overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-sm">Almoxarifado Santa Cruz - Reforma 02</h3>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <MapPin className="h-2.5 w-2.5" />
                    <span>Cuiabá</span>
                  </div>
                </div>
                <button className="text-muted-foreground hover:text-foreground">
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
              
              <div className="flex gap-1.5">
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-[10px] px-1.5 py-0">Em Andamento</Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">Reforma</Badge>
              </div>
              
              {/* Informações Gerais */}
              <div className="border rounded p-1.5 space-y-0.5">
                <div className="flex items-center gap-1.5 font-medium text-[11px]">
                  <Building2 className="h-2.5 w-2.5" />
                  <span>Informações Gerais</span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 text-[10px]">
                  <div>
                    <span className="text-muted-foreground">Contrato:</span>
                    <span className="font-medium ml-1">111/2025</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fiscal:</span>
                    <span className="font-medium ml-1">Adriano Augusto</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Empresa:</span>
                    <span className="font-medium ml-1">A M I CONSTRUÇÕES LTDA</span>
                  </div>
                </div>
              </div>
              
              {/* Prazos */}
              <div className="border rounded p-1.5 space-y-0.5">
                <div className="flex items-center gap-1.5 font-medium text-[11px]">
                  <Calendar className="h-2.5 w-2.5" />
                  <span>Prazos de Execução</span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 text-[10px]">
                  <div>
                    <span className="text-muted-foreground">Início:</span>
                    <span className="font-medium ml-1">28/09/2025</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Término:</span>
                    <span className="font-medium ml-1">13/10/2025</span>
                  </div>
                </div>
              </div>
              
              {/* Financeiro */}
              <div className="border rounded p-1.5 space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-[11px]">
                  <TrendingUp className="h-2.5 w-2.5" />
                  <span>Informações Financeiras</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  <div>
                    <span className="text-muted-foreground block">Valor Inicial:</span>
                    <span className="font-semibold">R$ 73.766,43</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Aditivado:</span>
                    <span className="font-medium">R$ 0,00</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Final:</span>
                    <span className="font-semibold text-primary">R$ 73.766,43</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span>Execução:</span>
                    <span className="font-bold text-green-600">23.31%</span>
                  </div>
                  <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="absolute h-full bg-green-500 rounded-full" style={{ width: '23.31%' }} />
                  </div>
                </div>
              </div>
              
              {/* Álbum de Fotos */}
              <div className="border rounded p-1.5 space-y-0.5">
                <div className="flex items-center gap-1.5 font-medium text-[11px]">
                  <Image className="h-2.5 w-2.5" />
                  <span>Álbum de Fotos (17)</span>
                </div>
                <div className="flex gap-1">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="w-6 h-6 bg-muted rounded flex items-center justify-center">
                      <Camera className="h-2 w-2 text-muted-foreground/50" />
                    </div>
                  ))}
                  <div className="w-6 h-6 bg-muted rounded flex items-center justify-center text-[9px] text-muted-foreground">
                    +13
                  </div>
                </div>
              </div>
              
              {/* Documentação (Anexos) */}
              <div className="border rounded p-1.5 space-y-0.5">
                <div className="flex items-center gap-1.5 font-medium text-[11px]">
                  <FileText className="h-2.5 w-2.5" />
                  <span>Documentação (5)</span>
                </div>
                <div className="space-y-0.5">
                  {[
                    { name: 'Contrato_111_2025.pdf', type: 'PDF' },
                    { name: 'Planilha_Orcamentaria.xlsx', type: 'Excel' },
                    { name: 'ART_Responsavel.pdf', type: 'PDF' },
                  ].map((doc, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[9px] bg-muted/30 rounded px-1.5 py-0.5">
                      <FileUp className="h-2.5 w-2.5 text-muted-foreground" />
                      <span className="truncate flex-1">{doc.name}</span>
                      <Badge variant="outline" className="text-[8px] px-1 py-0">{doc.type}</Badge>
                    </div>
                  ))}
                  <div className="text-[9px] text-muted-foreground pl-1">
                    +2 outros documentos
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // SLIDE 15 - Documentação Obrigatória
    {
      id: 15,
      title: 'Documentação Obrigatória',
      subtitle: 'Documentos que devem ser anexados no sistema',
      content: (
        <div className="space-y-6">
          {/* Alerta principal */}
          <Card className="bg-amber-50 border-amber-300 border-2">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="bg-amber-500 text-white p-3 rounded-full shrink-0">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-800 text-lg mb-2">Atenção: Anexos Obrigatórios</h3>
                  <p className="text-sm text-amber-700">
                    Para cada obra cadastrada no sistema, os seguintes documentos <strong>devem ser anexados</strong> na seção de Documentação:
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de documentos obrigatórios */}
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { 
                icon: FileText, 
                title: 'Contrato', 
                description: 'Contrato original da obra assinado',
                color: 'bg-blue-500'
              },
              { 
                icon: FileSpreadsheet, 
                title: 'Contrato de Aditivos', 
                description: 'Todos os termos aditivos celebrados',
                color: 'bg-purple-500'
              },
              { 
                icon: ClipboardCheck, 
                title: 'Medições Assinadas', 
                description: 'Após cada medição, anexar documento assinado',
                color: 'bg-green-500'
              },
              { 
                icon: Shield, 
                title: 'ARTs', 
                description: 'Anotações de Responsabilidade Técnica',
                color: 'bg-orange-500'
              },
            ].map((doc, i) => (
              <Card key={i} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-start gap-4">
                  <div className={`${doc.color} text-white p-2.5 rounded-lg shrink-0`}>
                    <doc.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-base">{doc.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Nota sobre medições */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />
                <p className="text-sm text-blue-800">
                  <strong>Importante:</strong> Após cada medição aprovada, o documento de medição assinado deve ser anexado ao sistema para manter o histórico completo da obra.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },

    // SLIDE 16 - Gerenciar Obras (Simplificado)
    {
      id: 16,
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

    // SLIDE 17 - Tipos de Medição
    {
      id: 17,
      title: 'Sistema de Medições',
      subtitle: 'Dois modos de trabalho: Manual ou via RDO',
      content: (
        <div className="space-y-3">
          <MockMedicaoTypes />
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-3">
              <p className="text-xs text-amber-800">
                <strong>⚠️ Importante:</strong> A partir dos novos contratos, será obrigatório que a Contratada preencha o RDO diariamente. 
                Isso garantirá rastreabilidade total dos quantitativos executados.
              </p>
            </CardContent>
          </Card>
        </div>
      ),
    },

    // SLIDE 18 - RDO Calendário Visual
    {
      id: 18,
      title: 'Calendário de RDO',
      subtitle: 'Visualização mensal com status e indicadores',
      content: (
        <div className="space-y-3">
          <MockRdoCalendar />
          <MockRdoActions />
        </div>
      ),
    },

    // SLIDE 19 - RDO Lista de Serviços
    {
      id: 19,
      title: 'Preenchimento de Atividades',
      subtitle: 'A Contratada insere os quantitativos executados no dia',
      content: (
        <div>
          <MockServicesList />
        </div>
      ),
    },

    // SLIDE 20 - Assinaturas e Histórico
    {
      id: 20,
      title: 'Assinaturas e Validação',
      subtitle: 'Fluxo de aprovação com histórico de reprovações',
      content: <MockSignaturesPanel />,
    },

    // SLIDE 21 - RDO Impresso
    {
      id: 21,
      title: 'RDO Impresso',
      subtitle: 'Documento gerado automaticamente pelo sistema',
      content: <MockPrintedRdo />,
    },

    // SLIDE 22 - Permissões
    {
      id: 22,
      title: 'Permissões e Segurança',
      subtitle: 'Como o fiscal gerencia suas obras e acessos autorizados',
      content: <MockPermissionsManager />,
    },

    // SLIDE 23 - Encerramento
    {
      id: 23,
      title: '',
      content: (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
          <img src="/images/logo-dif-dpmt.jpg" alt="Logo DIF" className="h-28 object-contain" />
          <div>
            <h1 className="text-4xl font-bold text-primary mb-4">
              Obrigado!
            </h1>
            <p className="text-xl text-muted-foreground">
              Diretoria de Infraestrutura Física
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
            DPE/MT
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
