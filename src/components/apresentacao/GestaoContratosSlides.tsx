import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  FileCheck,
  Users,
  Shield,
  AlertCircle,
  CheckCircle2,
  UserCog,
  Building2,
  ClipboardList,
  ArrowRight,
  Briefcase,
  LayoutDashboard,
  Calendar,
  ChevronDown,
  Info,
  MapPin,
  FileUp
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Capa da seção Gestão de Contratos
export function GestaoContratosCapa() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-8">
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 rounded-full">
        <FileCheck className="h-24 w-24 text-white" />
      </div>
      <div>
        <Badge variant="outline" className="mb-4 text-sm px-4 py-1">
          NOVAS DIRETRIZES
        </Badge>
        <h1 className="text-5xl font-bold text-primary mb-4">
          Gestão e Fiscalização
        </h1>
        <p className="text-2xl text-muted-foreground">
          de Contratos
        </p>
      </div>
    </div>
  );
}

// Diretrizes Internas - Fiscalização e Gestão de Contratos
export function DiretrizesInternasFiscalizacao() {
  return (
    <div className="space-y-6">
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Diretrizes Internas - Fiscalização e Gestão de Contratos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-900">
              Foram estabelecidas novas diretrizes para a atuação do Gestor de Contratos no âmbito da Defensoria Pública do Estado de Mato Grosso no procedimento SEI n° <strong>2025.0.000019210-4</strong>
            </p>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-900 mb-3">
              No âmbito da Diretoria de Infraestrutura Física, por determinação do Diretor de Infraestrutura Física, fica estabelecido que:
            </p>
            <ul className="space-y-2 text-sm text-green-800">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                <span>Todos os contratos deverão contar com <strong>fiscal, fiscal substituto e gestor do contrato</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                <span>Nas comunicações internas inaugurais dos procedimentos que venham a gerar contratos (obras, projetos e aquisições), deverão ser expressamente indicados os fiscais e o gestor do contrato</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                <span>Para as obras e reformas, preferencialmente, será indicado como <strong>Gestor do Contrato o Arquiteto responsável</strong> pela elaboração dos projetos executivos</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                <span>O gestor de contratos será responsável pelo <strong>recebimento definitivo</strong> do objeto contratual</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                <span>O fiscal substituto deverá realizar a <strong>conferência das medições</strong> realizadas pelo fiscal, atentando-se à conformidade dos serviços executados, bem como assinando, em conjunto, o respectivo procedimento de medição</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Atribuições do Gestor de Contratos (detalhado)
export function AtribuicoesGestorContratos() {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-blue-50 pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCog className="h-5 w-5 text-blue-600" />
              Função do Gestor
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              Responsável pela <strong>gestão global do contrato</strong>, assegurando a articulação entre a fiscalização, 
              a instrução processual e os procedimentos administrativos ao longo da execução contratual.
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200">
          <CardHeader className="bg-green-50 pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5 text-green-600" />
              Atribuições
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <span>Coordenar e acompanhar as atividades de fiscalização contratual</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <span>Analisar relatórios, medições e documentação técnica e administrativa</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-amber-200">
        <CardHeader className="bg-amber-50 pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Briefcase className="h-5 w-5 text-amber-600" />
            Instruir e Encaminhar Processos de:
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid md:grid-cols-2 gap-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Prorrogação, alteração e reequilíbrio</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Pagamento</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Extinção contratual</span>
              </li>
            </ul>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Promover processo administrativo de responsabilização e aplicação de sanções</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Realizar o recebimento definitivo do objeto</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span>Encaminhar documentação para liquidação da despesa e pagamento</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-xs text-blue-800 text-center">
            <strong>Fonte:</strong> TCU – Gestão do Contrato e Recebimento Definitivo (Lei nº 14.133/2021)
            <br />
            <a href="https://licitacoesecontratos.tcu.gov.br/6-1-6-gestao-do-contrato-e-recebimento-definitivo-2/" 
               target="_blank" 
               className="underline">
              https://licitacoesecontratos.tcu.gov.br/6-1-6-gestao-do-contrato-e-recebimento-definitivo-2/
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Determinação sobre Gestor de Contratos (mantido para compatibilidade)
export function GestorContratosRegras() {
  return (
    <div className="space-y-6">
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Determinação do 1° Subdefensor Público-Geral
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <UserCog className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 mb-2">Função de Gestor de Contratos</p>
                <p className="text-sm text-amber-900">
                  Será exercida, <strong>preferencialmente</strong>, por servidores ocupantes de cargos até o nível de 
                  <strong> Coordenador</strong>, ou cargo equivalente, vinculados às áreas técnicas relacionadas 
                  ao objeto contratual.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-3">
              <ClipboardList className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-800 mb-2">Atribuições de Fiscalização Contratual</p>
                <p className="text-sm text-green-900">
                  Permanecem adequadas aos cargos de <strong>gerente, assessor técnico, técnico administrativo, 
                  analista ou ajudante geral</strong>, observadas as exigências de capacitação, compatibilidade 
                  técnica e ausência de impedimentos legais.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Exceções e Continuidade
export function GestorContratosExcecoes() {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-2 border-orange-200">
          <CardHeader className="bg-orange-50 pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Situações Excepcionais
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-4">
              A acumulação da função de Gestor de Contratos pelo <strong>Diretor da unidade</strong> somente 
              deverá ocorrer em:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                <span>Situações excepcionais, devidamente justificadas</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                <span>Unidades de <strong>pequeno porte</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                <span>Quadro de pessoal reduzido que inviabilize a segregação de funções</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200">
          <CardHeader className="bg-green-50 pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Continuidade Administrativa
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-4">
              A designação da função de Gestor de Contratos recairá sobre o <strong>cargo</strong>, 
              e não sobre a pessoa:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <span>Férias do titular <strong>não</strong> demandam nova portaria</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <span>Licenças ou afastamentos temporários mantêm a designação</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <span>Assegura continuidade e simplifica fluxos internos</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm text-blue-800 text-center">
            <strong>💡 Objetivo:</strong> Segregação adequada de funções, garantindo transparência e 
            eficiência na gestão dos contratos administrativos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Hierarquia de Funções
export function HierarquiaFuncoes() {
  const funcoes = [
    {
      cargo: 'Gestor de Contratos',
      nivel: 'Coordenador ou equivalente',
      responsabilidades: [
        'Coordenar a execução do contrato',
        'Acompanhar prazos e entregas',
        'Autorizar pagamentos',
        'Interface com a contratada'
      ],
      cor: 'border-blue-300 bg-blue-50'
    },
    {
      cargo: 'Fiscal de Contrato',
      nivel: 'Gerente, Assessor, Técnico, Analista',
      responsabilidades: [
        'Fiscalizar execução diária',
        'Atestar serviços/produtos',
        'Registrar ocorrências',
        'Elaborar relatórios técnicos'
      ],
      cor: 'border-green-300 bg-green-50'
    }
  ];

  return (
    <div className="grid md:grid-cols-2 gap-6 mt-6">
      {funcoes.map((f, i) => (
        <Card key={i} className={`border-2 ${f.cor}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-full shadow-sm">
                {i === 0 ? (
                  <Briefcase className="h-6 w-6 text-blue-600" />
                ) : (
                  <ClipboardList className="h-6 w-6 text-green-600" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg">{f.cargo}</CardTitle>
                <p className="text-sm text-muted-foreground">{f.nivel}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <p className="text-xs font-semibold text-muted-foreground mb-2">RESPONSABILIDADES:</p>
            <ul className="space-y-1.5">
              {f.responsabilidades.map((r, j) => (
                <li key={j} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Resumo das Novas Diretrizes
export function ResumoNovasDiretrizes() {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold text-primary">Resumo das Novas Diretrizes</h3>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="h-8 w-8 text-blue-600" />
              <h4 className="font-bold text-blue-800">Calendário DIF</h4>
            </div>
            <ul className="text-sm space-y-2 text-blue-900">
              <li>✓ Registrar viagens no Google Agenda</li>
              <li>✓ Prazo mínimo de 8 dias úteis</li>
              <li>✓ Máximo 3 viagens por data</li>
              <li>✓ Formato: VIAGEM - Nome - Destino</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <FileCheck className="h-8 w-8 text-emerald-600" />
              <h4 className="font-bold text-emerald-800">Gestão de Contratos</h4>
            </div>
            <ul className="text-sm space-y-2 text-emerald-900">
              <li>✓ Gestor: nível Coordenador</li>
              <li>✓ Fiscal: técnicos capacitados</li>
              <li>✓ Designação por cargo, não pessoa</li>
              <li>✓ Continuidade em afastamentos</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <LayoutDashboard className="h-8 w-8 text-orange-600" />
              <h4 className="font-bold text-orange-800">Sistema SiDIF</h4>
            </div>
            <ul className="text-sm space-y-2 text-orange-900">
              <li>✓ Cadastro e acompanhamento de obras</li>
              <li>✓ Medições e aditivos contratuais</li>
              <li>✓ RDO com assinaturas digitais</li>
              <li>✓ Controle de permissões por obra</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4 flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>Atenção:</strong> Estas diretrizes devem ser observadas por todas as unidades 
            da Defensoria Pública do Estado de Mato Grosso a partir desta data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Slide: Cadastro de Obras - Mock com balões indicativos
export function CadastroObrasSlide() {
  return (
    <div className="space-y-4">
      {/* Aviso de padronização */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 mb-2">Padronização do Nome da Obra</p>
              <p className="text-sm text-amber-700 mb-2">
                O nome da obra deve seguir o padrão: <strong>"Unidade - Tipo de Serviço"</strong>
              </p>
              <div className="space-y-1 text-sm text-amber-900">
                <p>✓ <code className="bg-amber-100 px-1.5 py-0.5 rounded">Núcleo Criminal de Rondonópolis - Cobertura</code></p>
                <p>✓ <code className="bg-amber-100 px-1.5 py-0.5 rounded">Núcleo de Sinop - Ampliação</code></p>
                <p>✓ <code className="bg-amber-100 px-1.5 py-0.5 rounded">Núcleo de Barra do Garças - Sala de Estagiários</code></p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mock do formulário */}
      <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
        <div className="bg-muted/50 px-4 py-3 border-b flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <span className="font-semibold">Nova Obra</span>
        </div>
        
        <TooltipProvider delayDuration={0}>
          <div className="p-4 space-y-4">
            {/* Linha 1: Nome e Município */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Nome da Obra *</label>
                <Input 
                  value="Núcleo Criminal de Rondonópolis - Cobertura" 
                  readOnly 
                  className="h-9 text-sm bg-green-50 border-green-300" 
                />
              </div>
              <div className="space-y-1 relative">
                <label className="text-xs text-muted-foreground font-medium">Município *</label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      <Input value="Rondonópolis" readOnly className="h-9 text-sm bg-muted/30 pr-8" />
                      <Info className="h-4 w-4 text-blue-500 absolute right-2 top-1/2 -translate-y-1/2 cursor-help" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">Lista de municípios do Mato Grosso</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Linha 2: Contrato e Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Número do Contrato *</label>
                <Input value="CT-2024/0456" readOnly className="h-9 text-sm bg-muted/30" />
              </div>
              <div className="space-y-1 relative">
                <label className="text-xs text-muted-foreground font-medium">Status *</label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      <div className="h-9 px-3 flex items-center justify-between bg-blue-100 text-blue-800 rounded-md text-sm font-medium border border-blue-200">
                        Planejamento
                        <ChevronDown className="h-4 w-4" />
                      </div>
                      <div className="absolute -right-2 -top-2">
                        <Badge className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5">Lista</Badge>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="text-xs font-semibold mb-1">Opções disponíveis:</p>
                    <ul className="text-xs space-y-0.5">
                      <li>• Planejamento</li>
                      <li>• Em andamento</li>
                      <li>• Paralisado</li>
                      <li>• Concluído</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Linha 3: Tipo e Valor */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 relative">
                <label className="text-xs text-muted-foreground font-medium">Tipo *</label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      <div className="h-9 px-3 flex items-center justify-between bg-muted/30 rounded-md text-sm border">
                        Reforma
                        <ChevronDown className="h-4 w-4" />
                      </div>
                      <div className="absolute -right-2 -top-2">
                        <Badge className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5">Lista</Badge>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="text-xs font-semibold mb-1">Opções disponíveis:</p>
                    <ul className="text-xs space-y-0.5">
                      <li>• Reforma</li>
                      <li>• Construção</li>
                      <li>• Adequações</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Valor Inicial do Contrato (R$) *</label>
                <Input value="450.000,00" readOnly className="h-9 text-sm bg-muted/30" />
              </div>
            </div>

            {/* Linha 4: Datas e Prazo */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Data de Início</label>
                <Input value="15/01/2025" readOnly className="h-9 text-sm bg-muted/30" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Tempo de Obra (dias)</label>
                <Input value="120" readOnly className="h-9 text-sm bg-muted/30" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Previsão de Término</label>
                <div className="h-9 px-3 flex items-center bg-slate-100 rounded-md text-sm text-muted-foreground border">
                  15/05/2025 <span className="text-xs ml-1">(calculado)</span>
                </div>
              </div>
            </div>

            {/* Linha 5: Empresa e Região */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 relative">
                <label className="text-xs text-muted-foreground font-medium">Empresa Responsável</label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      <div className="h-9 px-3 flex items-center justify-between bg-muted/30 rounded-md text-sm border">
                        Construtora ABC Ltda
                        <ChevronDown className="h-4 w-4" />
                      </div>
                      <div className="absolute -right-2 -top-2">
                        <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0.5">Cadastro</Badge>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="text-xs">Empresas cadastradas no sistema (ATAs e Contratos de Licitação)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="space-y-1 relative">
                <label className="text-xs text-muted-foreground font-medium">Região</label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      <div className="h-9 px-3 flex items-center justify-between bg-muted/30 rounded-md text-sm border">
                        Polo Sul
                        <ChevronDown className="h-4 w-4" />
                      </div>
                      <div className="absolute -right-2 -top-2">
                        <Badge className="bg-purple-500 text-white text-[10px] px-1.5 py-0.5">Filtrado</Badge>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p className="text-xs">Regiões disponíveis para a empresa selecionada (baseado nas ATAs)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Linha 6: Fiscal e Responsável */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 relative">
                <label className="text-xs text-muted-foreground font-medium">Fiscal do Contrato</label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      <div className="h-9 px-3 flex items-center justify-between bg-muted/30 rounded-md text-sm border">
                        João da Silva
                        <ChevronDown className="h-4 w-4" />
                      </div>
                      <div className="absolute -right-2 -top-2">
                        <Badge className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5">Usuários</Badge>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="text-xs">Usuários com perfil de Engenheiro ou Técnico cadastrados no sistema</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="space-y-1 relative">
                <label className="text-xs text-muted-foreground font-medium">Responsável pelo Projeto</label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      <div className="h-9 px-3 flex items-center justify-between bg-muted/30 rounded-md text-sm border">
                        Maria Arquiteta
                        <ChevronDown className="h-4 w-4" />
                      </div>
                      <div className="absolute -right-2 -top-2">
                        <Badge className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5">Usuários</Badge>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p className="text-xs">Usuários com perfil de Arquiteto cadastrados no sistema (será o Gestor do Contrato)</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex gap-3 pt-2 border-t">
              <div className="h-8 px-3 flex items-center gap-2 bg-muted/30 rounded-md text-sm border cursor-pointer hover:bg-muted/50">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Selecionar no Mapa
              </div>
              <div className="h-8 px-3 flex items-center gap-2 bg-muted/30 rounded-md text-sm border cursor-pointer hover:bg-muted/50">
                <FileUp className="h-4 w-4 text-muted-foreground" />
                Documentos
              </div>
            </div>
          </div>
        </TooltipProvider>
      </div>

      {/* Legenda dos badges */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <Badge className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5">Lista</Badge>
          <span className="text-muted-foreground">Opções fixas do sistema</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0.5">Cadastro</Badge>
          <span className="text-muted-foreground">Dados cadastrados (Empresas)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge className="bg-purple-500 text-white text-[10px] px-1.5 py-0.5">Filtrado</Badge>
          <span className="text-muted-foreground">Depende de outro campo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5">Usuários</Badge>
          <span className="text-muted-foreground">Usuários do sistema</span>
        </div>
      </div>
    </div>
  );
}
