import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Calendar
} from 'lucide-react';

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
                <span>O fiscal substituto deverá realizar a <strong>conferência das medições</strong> elaboradas pelo fiscal, atentando-se à conformidade dos serviços executados, bem como assinar a C.I em conjunto com Fiscal</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                <span>A <strong>planilha de medição</strong> será assinada apenas pelo fiscal do contrato</span>
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
              <li>✓ Fiscais e Fiscais Substituto</li>
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
