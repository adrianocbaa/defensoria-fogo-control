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
  ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import sidifLogo from '@/assets/sidif-logo-oficial.png';

interface Slide {
  id: number;
  title: string;
  subtitle?: string;
  content: React.ReactNode;
}

// Componente simulando o formulário de cadastro de obras
function MockObraForm() {
  return (
    <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
      <div className="bg-muted/50 px-4 py-3 border-b flex items-center gap-2">
        <Building2 className="h-5 w-5 text-primary" />
        <span className="font-semibold">Cadastro de Obra</span>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Nome da Obra *</label>
            <Input value="Reforma da Defensoria Pública de Cuiabá" readOnly className="h-8 text-sm bg-muted/30" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Município *</label>
            <Input value="Cuiabá" readOnly className="h-8 text-sm bg-muted/30" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Nº do Contrato</label>
            <Input value="CT-2024/0123" readOnly className="h-8 text-sm bg-muted/30" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Status</label>
            <div className="h-8 px-3 flex items-center bg-blue-100 text-blue-800 rounded-md text-sm font-medium">
              Em Andamento
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Tipo</label>
            <div className="h-8 px-3 flex items-center bg-muted/30 rounded-md text-sm">
              Reforma
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Valor do Contrato</label>
            <Input value="R$ 1.250.000,00" readOnly className="h-8 text-sm bg-muted/30" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Data de Início</label>
            <Input value="15/01/2024" readOnly className="h-8 text-sm bg-muted/30" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Prazo (dias)</label>
            <Input value="180" readOnly className="h-8 text-sm bg-muted/30" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Empresa Responsável</label>
            <Input value="Construtora ABC Ltda" readOnly className="h-8 text-sm bg-muted/30" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Fiscal do Contrato</label>
            <Input value="João da Silva" readOnly className="h-8 text-sm bg-muted/30" />
          </div>
        </div>
        <div className="flex gap-4 pt-2">
          <Button variant="outline" size="sm" className="gap-2">
            <MapPin className="h-4 w-4" />
            Selecionar Localização
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Image className="h-4 w-4" />
            Galeria de Fotos
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <FileUp className="h-4 w-4" />
            Documentos
          </Button>
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
    // SLIDE 1 - Capa
    {
      id: 1,
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

    // SLIDE 2 - Visão Geral
    {
      id: 2,
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

    // SLIDE 3 - Cadastro de Obras (VISUAL)
    {
      id: 3,
      title: 'Cadastro de Obras',
      subtitle: 'Formulário completo com todas as informações contratuais',
      content: (
        <div className="mt-4">
          <MockObraForm />
        </div>
      ),
    },

    // SLIDE 4 - Acompanhamento Visual
    {
      id: 4,
      title: 'Acompanhamento Visual',
      subtitle: 'Fotos, documentos e progresso em tempo real',
      content: (
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Image className="h-4 w-4 text-primary" />
                Galeria de Fotos por Período
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                    <Camera className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Fotos organizadas por mês de execução</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Progresso de Execução
              </h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Execução Física</span>
                    <span className="font-bold">68%</span>
                  </div>
                  <Progress value={68} className="h-3" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Execução Financeira</span>
                    <span className="font-bold">62%</span>
                  </div>
                  <Progress value={62} className="h-3" />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
                  <span>Valor Executado: R$ 850.000,00</span>
                  <span>Total: R$ 1.250.000,00</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="md:col-span-2">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <FileUp className="h-4 w-4 text-primary" />
                Documentos Anexados
              </h4>
              <div className="grid grid-cols-4 gap-3">
                {['Contrato.pdf', 'ART.pdf', 'Projeto.dwg', 'Planilha.xlsx'].map((doc, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <FileText className="h-4 w-4 text-red-500" />
                    <span className="text-sm truncate">{doc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },

    // SLIDE 5 - Gerenciar Obras (Simplificado)
    {
      id: 5,
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

    // SLIDE 6 - Tipos de Medição
    {
      id: 6,
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

    // SLIDE 7 - RDO Calendário Visual
    {
      id: 7,
      title: 'Calendário de RDO',
      subtitle: 'Visualização mensal com status e indicadores',
      content: (
        <div className="mt-4 space-y-4">
          <MockRdoCalendar />
          <MockRdoActions />
        </div>
      ),
    },

    // SLIDE 8 - RDO Lista de Serviços
    {
      id: 8,
      title: 'Preenchimento de Atividades',
      subtitle: 'A Contratada insere os quantitativos executados no dia',
      content: (
        <div className="mt-4">
          <MockServicesList />
        </div>
      ),
    },

    // SLIDE 9 - Assinaturas e Histórico
    {
      id: 9,
      title: 'Assinaturas e Validação',
      subtitle: 'Fluxo de aprovação com histórico de reprovações',
      content: (
        <div className="mt-4">
          <MockSignaturesPanel />
        </div>
      ),
    },

    // SLIDE 10 - RDO Impresso
    {
      id: 10,
      title: 'RDO Impresso',
      subtitle: 'Documento gerado automaticamente pelo sistema',
      content: (
        <div className="mt-4 overflow-auto max-h-[500px]">
          <MockPrintedRdo />
        </div>
      ),
    },

    // SLIDE 11 - Permissões
    {
      id: 11,
      title: 'Permissões e Segurança',
      subtitle: 'Como o fiscal gerencia suas obras e acessos autorizados',
      content: (
        <div className="mt-4">
          <MockPermissionsManager />
        </div>
      ),
    },

    // SLIDE 12 - Encerramento
    {
      id: 12,
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
