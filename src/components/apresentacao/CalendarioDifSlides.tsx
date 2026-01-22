import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  CalendarCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  User,
  FileText,
  Target,
  List,
  ChevronRight
} from 'lucide-react';

// Capa da seção Calendário DIF
export function CalendarioDifCapa() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-8">
      <div className="bg-white/20 backdrop-blur-md p-10 rounded-full shadow-2xl">
        <Calendar className="h-28 w-28 text-white" />
      </div>
      <div>
        <Badge variant="outline" className="mb-6 text-lg px-6 py-2 bg-white/10 border-white/30 text-white">
          NOVAS DIRETRIZES
        </Badge>
        <h1 className="text-6xl font-bold text-white mb-4 drop-shadow-lg">
          Calendário DIF
        </h1>
        <p className="text-3xl text-white/80">
          Google Agenda - Viagens Institucionais
        </p>
      </div>
    </div>
  );
}

// Objetivos do Calendário DIF
export function CalendarioDifObjetivos() {
  const objetivos = [
    {
      icon: FileText,
      title: 'Padronização',
      description: 'Explicar como devem ser registradas as viagens institucionais na plataforma Google Agenda',
      color: 'text-blue-600 bg-blue-100'
    },
    {
      icon: CheckCircle2,
      title: 'Uniformidade',
      description: 'Padronizar o preenchimento das informações',
      color: 'text-green-600 bg-green-100'
    },
    {
      icon: AlertTriangle,
      title: 'Prevenção',
      description: 'Evitar inconsistências e retrabalhos na solicitação de diárias',
      color: 'text-amber-600 bg-amber-100'
    }
  ];

  return (
    <div className="grid md:grid-cols-3 gap-6 mt-8">
      {objetivos.map((obj, i) => (
        <Card key={i} className="text-center">
          <CardContent className="p-6">
            <div className={`inline-flex p-4 rounded-full ${obj.color} mb-4`}>
              <obj.icon className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">{obj.title}</h3>
            <p className="text-muted-foreground text-sm">{obj.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Diretrizes de preenchimento
export function CalendarioDifDiretrizes() {
  const diretrizes = [
    {
      icon: Calendar,
      text: 'O solicitante deverá estar inscrito à agenda "Viagens DIF"',
      tipo: 'obrigatorio'
    },
    {
      icon: CalendarCheck,
      text: 'Todas as viagens institucionais deverão obrigatoriamente ser registradas no Google Agenda',
      tipo: 'obrigatorio'
    },
    {
      icon: Clock,
      text: 'O lançamento deve ser feito antes do deslocamento',
      tipo: 'importante'
    },
    {
      icon: AlertTriangle,
      text: 'Observar prazo mínimo de 8 (oito) dias úteis para solicitação de diárias, excluídos finais de semana e feriados',
      tipo: 'critico'
    },
    {
      icon: Target,
      text: 'Verificar se na data da viagem não há mais de 3 (três) viagens agendadas',
      tipo: 'importante'
    }
  ];

  return (
    <div className="space-y-4 mt-6">
      {diretrizes.map((d, i) => (
        <div 
          key={i} 
          className={`flex items-start gap-4 p-4 rounded-lg border ${
            d.tipo === 'critico' 
              ? 'bg-red-50 border-red-200' 
              : d.tipo === 'obrigatorio'
              ? 'bg-blue-50 border-blue-200'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className={`p-2 rounded-full ${
            d.tipo === 'critico' 
              ? 'bg-red-100' 
              : d.tipo === 'obrigatorio'
              ? 'bg-blue-100'
              : 'bg-amber-100'
          }`}>
            <d.icon className={`h-5 w-5 ${
              d.tipo === 'critico' 
                ? 'text-red-600' 
                : d.tipo === 'obrigatorio'
                ? 'text-blue-600'
                : 'text-amber-600'
            }`} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{d.text}</p>
          </div>
          <Badge variant={
            d.tipo === 'critico' ? 'destructive' : 
            d.tipo === 'obrigatorio' ? 'default' : 
            'secondary'
          }>
            {d.tipo === 'critico' ? 'Crítico' : 
             d.tipo === 'obrigatorio' ? 'Obrigatório' : 
             'Importante'}
          </Badge>
        </div>
      ))}
    </div>
  );
}

// Imagens do Google Calendar
import googleCalendarImage from '@/assets/apresentacao/google-calendar-viagens.png';
import googleCalendarPasso1 from '@/assets/apresentacao/google-calendar-passo1.png';
import googleCalendarPasso2 from '@/assets/apresentacao/google-calendar-passo2.png';

export function GoogleCalendarReal() {
  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-lg shadow-lg overflow-hidden">
        <img 
          src={googleCalendarImage} 
          alt="Google Calendar - Viagens DIF" 
          className="w-full h-auto"
        />
      </div>
      <div className="grid md:grid-cols-3 gap-3 text-sm">
        <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="w-4 h-4 rounded bg-orange-500" />
          <span>Viagens Institucionais</span>
        </div>
        <div className="flex items-center gap-2 p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
          <div className="w-4 h-4 rounded bg-cyan-500" />
          <span>Férias e Compensatórias</span>
        </div>
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="w-4 h-4 rounded bg-red-500" />
          <span>Cursos e Eventos</span>
        </div>
      </div>
    </div>
  );
}

// Modelo de preenchimento com imagens reais
export function ModeloPreenchimento() {
  return (
    <div className="space-y-6">
      {/* 3 Cards de regras */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="font-medium text-green-800">Formato Correto</p>
            <p className="text-xs text-green-700 mt-1">VIAGEM - [Nome] - [Destino]</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 text-amber-600 mx-auto mb-2" />
            <p className="font-medium text-amber-800">Prazo Mínimo</p>
            <p className="text-xs text-amber-700 mt-1">8 dias úteis de antecedência</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <User className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="font-medium text-blue-800">Limite Diário</p>
            <p className="text-xs text-blue-700 mt-1">Máximo 3 viagens por data</p>
          </CardContent>
        </Card>
      </div>

      {/* Imagens reais de preenchimento */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="overflow-hidden">
          <CardHeader className="bg-blue-50 py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
              Adicionar ao calendário "VIAGENS - DIF"
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <img 
              src={googleCalendarPasso1} 
              alt="Passo 1 - Selecionar calendário VIAGENS DIF" 
              className="w-full h-auto"
            />
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="bg-blue-50 py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
              Confirmar agenda pessoal vinculada
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <img 
              src={googleCalendarPasso2} 
              alt="Passo 2 - Confirmar agenda pessoal" 
              className="w-full h-auto"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
