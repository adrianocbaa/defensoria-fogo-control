import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Layers,
  FileSpreadsheet,
  TrendingUp,
  Clock,
  CheckCircle2,
  PenLine,
  FileCheck,
  Settings,
  Home
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import sidifLogo from '@/assets/sidif-logo-oficial.png';

interface Slide {
  id: number;
  title: string;
  subtitle?: string;
  content: React.ReactNode;
  background?: string;
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

    // SLIDE 3 - Módulo Obras
    {
      id: 3,
      title: 'Módulo de Obras',
      subtitle: 'Cadastro e acompanhamento completo de obras públicas',
      content: (
        <div className="grid md:grid-cols-2 gap-8 mt-6">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Informações Cadastrais
            </h3>
            <ul className="space-y-3">
              {[
                'Nome e localização da obra',
                'Empresa contratada e contrato',
                'Valores e prazos contratuais',
                'Fiscal responsável e substitutos',
                'Localização geográfica no mapa'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Acompanhamento Visual
            </h3>
            <ul className="space-y-3">
              {[
                'Galeria de fotos por período',
                'Documentos anexados',
                'Status em tempo real',
                'Progresso de execução',
                'Histórico de alterações'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ),
    },

    // SLIDE 4 - Gerenciar Obras
    {
      id: 4,
      title: 'Gerenciar Obras',
      subtitle: 'Visão consolidada de todas as obras sob sua responsabilidade',
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
              <h4 className="font-semibold mb-3">Funcionalidades da Página</h4>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <span>Barra de progresso por obra</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-500" />
                  <span>Gestão de acessos autorizados</span>
                </div>
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-orange-500" />
                  <span>Ações rápidas (RDO, Medição)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },

    // SLIDE 5 - Sistema de Medições
    {
      id: 5,
      title: 'Sistema de Medições',
      subtitle: 'Controle financeiro preciso e transparente',
      content: (
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <Card className="border-2 border-primary/20">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Planilha Orçamentária
              </h3>
              <ul className="space-y-2 text-sm">
                <li>• Importação de planilha Excel</li>
                <li>• Itens organizados hierarquicamente</li>
                <li>• Cálculo automático de totais</li>
                <li>• Aplicação de desconto contratual</li>
                <li>• Visualização por MACROs e itens</li>
              </ul>
            </CardContent>
          </Card>
          <Card className="border-2 border-primary/20">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Sessões de Medição
              </h3>
              <ul className="space-y-2 text-sm">
                <li>• Medições sequenciais numeradas</li>
                <li>• Inserção de quantitativos executados</li>
                <li>• Acumulado automático</li>
                <li>• Bloqueio após finalização</li>
                <li>• Histórico completo de alterações</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      ),
    },

    // SLIDE 6 - Aditivos Contratuais
    {
      id: 6,
      title: 'Aditivos Contratuais',
      subtitle: 'Gestão completa de aditivos de valor e prazo',
      content: (
        <div className="space-y-6 mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-3">Aditivo de Valor</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Inclusão de novos itens ou alteração de quantitativos contratuais
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Valor Original:</span>
                    <span className="font-mono">R$ 1.500.000,00</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-600">
                    <span>+ 1º Aditivo:</span>
                    <span className="font-mono">R$ 250.000,00</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Valor Pós-Aditivo:</span>
                    <span className="font-mono">R$ 1.750.000,00</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-3">Aditivo de Prazo</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Extensão do prazo contratual com atualização automática
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Prazo Original:</span>
                    <span className="font-mono">180 dias</span>
                  </div>
                  <div className="flex justify-between text-sm text-amber-600">
                    <span>+ 1º Aditivo:</span>
                    <span className="font-mono">60 dias</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Prazo Final:</span>
                    <span className="font-mono">240 dias</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ),
    },

    // SLIDE 7 - Cronograma Físico-Financeiro
    {
      id: 7,
      title: 'Cronograma Físico-Financeiro',
      subtitle: 'Acompanhamento visual do planejado vs. executado',
      content: (
        <div className="space-y-6 mt-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Gráfico Comparativo
              </h3>
              <div className="h-48 flex items-end justify-around gap-4 bg-muted/30 rounded-lg p-4">
                {[
                  { plan: 10, exec: 8 },
                  { plan: 25, exec: 22 },
                  { plan: 45, exec: 40 },
                  { plan: 65, exec: 55 },
                  { plan: 80, exec: 68 },
                  { plan: 100, exec: 75 },
                ].map((m, i) => (
                  <div key={i} className="flex gap-1 items-end">
                    <div 
                      className="w-6 bg-blue-500 rounded-t" 
                      style={{ height: `${m.plan * 1.5}px` }} 
                      title={`Previsto: ${m.plan}%`}
                    />
                    <div 
                      className="w-6 bg-green-500 rounded-t" 
                      style={{ height: `${m.exec * 1.5}px` }} 
                      title={`Executado: ${m.exec}%`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded" />
                  <span>Previsto</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded" />
                  <span>Executado</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="grid md:grid-cols-3 gap-4 text-center">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Importação</p>
                <p className="font-semibold">Planilha Excel padrão</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Visualização</p>
                <p className="font-semibold">Mensal ou Acumulado</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Análise</p>
                <p className="font-semibold">Desvio Previsto x Real</p>
              </CardContent>
            </Card>
          </div>
        </div>
      ),
    },

    // SLIDE 8 - RDO Visão Geral
    {
      id: 8,
      title: 'Relatório Diário de Obra (RDO)',
      subtitle: 'Registro diário completo das atividades em campo',
      content: (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {[
            { icon: Calendar, title: 'Calendário', desc: 'Visualização mensal de todos os RDOs' },
            { icon: ClipboardCheck, title: 'Atividades', desc: 'Serviços executados no dia' },
            { icon: Users, title: 'Mão de Obra', desc: 'Equipe presente (direta e indireta)' },
            { icon: Settings, title: 'Equipamentos', desc: 'Máquinas e equipamentos utilizados' },
            { icon: FileText, title: 'Ocorrências', desc: 'Registro de eventos e observações' },
            { icon: PenLine, title: 'Assinaturas', desc: 'Validação por Fiscal e Contratada' },
          ].map((item, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <item.icon className="h-8 w-8 text-primary mb-2" />
                <h4 className="font-semibold">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ),
    },

    // SLIDE 9 - Fluxo de Aprovação RDO
    {
      id: 9,
      title: 'Fluxo de Aprovação do RDO',
      subtitle: 'Processo de validação com assinaturas digitais',
      content: (
        <div className="mt-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            {[
              { step: 1, title: 'Preenchimento', desc: 'Contratada insere dados', color: 'bg-blue-500' },
              { step: 2, title: 'Assinatura Contratada', desc: 'Validação inicial', color: 'bg-amber-500' },
              { step: 3, title: 'Assinatura Fiscal', desc: 'Aprovação final', color: 'bg-green-500' },
              { step: 4, title: 'RDO Aprovado', desc: 'Documento bloqueado', color: 'bg-primary' },
            ].map((item, i) => (
              <div key={i} className="flex items-center">
                <Card className="w-48">
                  <CardContent className="p-4 text-center">
                    <div className={`w-10 h-10 rounded-full ${item.color} text-white flex items-center justify-center mx-auto mb-2 text-lg font-bold`}>
                      {item.step}
                    </div>
                    <h4 className="font-semibold text-sm">{item.title}</h4>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
                {i < 3 && (
                  <ChevronRight className="h-6 w-6 text-muted-foreground mx-2 hidden md:block" />
                )}
              </div>
            ))}
          </div>
          <Card className="mt-8 border-amber-200 bg-amber-50 dark:bg-amber-950">
            <CardContent className="p-4">
              <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
                ⚠️ Importante
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Após ambas as assinaturas serem validadas, o RDO torna-se imutável. 
                Nenhuma alteração pode ser feita após a aprovação final.
              </p>
            </CardContent>
          </Card>
        </div>
      ),
    },

    // SLIDE 10 - Exportações e Relatórios
    {
      id: 10,
      title: 'Exportações e Relatórios',
      subtitle: 'Documentos gerados automaticamente pelo sistema',
      content: (
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-red-500" />
                Relatórios PDF
              </h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  RDO individual ou em lote
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Relatório Técnico de Medição
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Planilha de Medição formatada
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Curva ABC de serviços
                </li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                Planilhas Excel
              </h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Relatório de Atividades do RDO
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Exportação da planilha orçamentária
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Cronograma físico-financeiro
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Dados para análise externa
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      ),
    },

    // SLIDE 11 - Permissões e Segurança
    {
      id: 11,
      title: 'Permissões e Segurança',
      subtitle: 'Controle de acesso granular por obra',
      content: (
        <div className="space-y-6 mt-6">
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
              <CardContent className="p-4 text-center">
                <Shield className="h-10 w-10 mx-auto mb-2 text-blue-600" />
                <h4 className="font-bold">Fiscal Titular</h4>
                <p className="text-sm text-muted-foreground mt-2">
                  Acesso total à obra. Pode autorizar outros servidores.
                </p>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50 dark:bg-green-950">
              <CardContent className="p-4 text-center">
                <Users className="h-10 w-10 mx-auto mb-2 text-green-600" />
                <h4 className="font-bold">Acesso Autorizado</h4>
                <p className="text-sm text-muted-foreground mt-2">
                  Edição permitida apenas em obras "Em Andamento".
                </p>
              </CardContent>
            </Card>
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950">
              <CardContent className="p-4 text-center">
                <Eye className="h-10 w-10 mx-auto mb-2 text-orange-600" />
                <h4 className="font-bold">Visualização</h4>
                <p className="text-sm text-muted-foreground mt-2">
                  Outros fiscais podem visualizar, mas não editar.
                </p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold mb-2">Histórico de Alterações</h4>
              <p className="text-sm text-muted-foreground">
                Todas as ações são registradas: salvamentos, reaberturas, importações, exportações e alterações de status.
                O histórico completo fica disponível na página de medição de cada obra.
              </p>
            </CardContent>
          </Card>
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
      <div className="flex-1 flex items-center justify-center p-6">
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
