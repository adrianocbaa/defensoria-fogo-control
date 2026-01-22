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
      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-8 rounded-full">
        <Calendar className="h-24 w-24 text-white" />
      </div>
      <div>
        <Badge variant="outline" className="mb-4 text-sm px-4 py-1">
          NOVAS DIRETRIZES
        </Badge>
        <h1 className="text-5xl font-bold text-primary mb-4">
          Calendário DIF
        </h1>
        <p className="text-2xl text-muted-foreground">
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

// Mock do Google Calendar
export function MockGoogleCalendar() {
  const viagens = [
    { dia: 10, servidor: 'João Silva', destino: 'Rondonópolis', cor: 'bg-blue-500' },
    { dia: 15, servidor: 'Maria Santos', destino: 'Sinop', cor: 'bg-green-500' },
    { dia: 15, servidor: 'Pedro Lima', destino: 'Cuiabá', cor: 'bg-purple-500' },
    { dia: 22, servidor: 'Ana Costa', destino: 'Cáceres', cor: 'bg-orange-500' },
  ];

  return (
    <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
      <div className="bg-white px-4 py-3 border-b flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-lg">Google Calendar</span>
        </div>
        <Badge variant="secondary">Viagens DIF</Badge>
      </div>
      
      <div className="p-4 bg-gray-50">
        <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs font-medium text-muted-foreground">
          <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {[...Array(35)].map((_, i) => {
            const day = i - 2; // Começa no dia 1 na quarta-feira
            const isValidDay = day >= 1 && day <= 31;
            const viagemDoDia = viagens.filter(v => v.dia === day);
            
            return (
              <div 
                key={i} 
                className={`min-h-[60px] border rounded p-1 ${
                  isValidDay ? 'bg-white' : 'bg-gray-100'
                }`}
              >
                {isValidDay && (
                  <>
                    <span className="text-xs font-medium">{day}</span>
                    <div className="space-y-0.5 mt-1">
                      {viagemDoDia.map((v, j) => (
                        <div 
                          key={j} 
                          className={`${v.cor} text-white text-[8px] px-1 py-0.5 rounded truncate`}
                        >
                          {v.destino}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-4 border-t bg-white">
        <h4 className="font-semibold text-sm mb-3">Viagens Agendadas:</h4>
        <div className="grid grid-cols-2 gap-2">
          {viagens.map((v, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className={`w-3 h-3 rounded ${v.cor}`} />
              <span className="text-muted-foreground">Dia {v.dia}:</span>
              <span className="font-medium">{v.servidor}</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <span>{v.destino}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Modelo de preenchimento
export function ModeloPreenchimento() {
  return (
    <div className="space-y-6">
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50 pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-blue-600" />
            Modelo de Preenchimento do Evento
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground font-medium">Título do Evento</p>
                <p className="font-medium">VIAGEM - João Silva - Rondonópolis</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground font-medium">Data/Hora</p>
                <p className="font-medium">15/01/2024 - 07:00 às 18:00</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground font-medium">Local</p>
                <p className="font-medium flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Rondonópolis - MT
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground font-medium">Descrição</p>
                <p className="text-sm">Vistoria na obra da Defensoria Pública</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}
