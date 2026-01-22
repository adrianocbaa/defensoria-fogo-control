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
  Briefcase
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

// Determinação sobre Gestor de Contratos
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

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <Building2 className="h-8 w-8 text-blue-600" />
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
