import { Calendar, MapPin, User } from 'lucide-react';

export function MaintenanceTimeline() {
  const timelineEvents = [
    {
      id: 1,
      title: 'Manutenção Preventiva - Ar Condicionado',
      location: 'Bloco A - Todos os Andares',
      date: '24 Jan 2025',
      status: 'scheduled',
      technician: 'João Silva',
      duration: '4h'
    },
    {
      id: 2,
      title: 'Inspeção Elétrica Geral',
      location: 'Bloco B - Subsolo',
      date: '25 Jan 2025',
      status: 'in-progress',
      technician: 'Maria Santos',
      duration: '6h'
    },
    {
      id: 3,
      title: 'Manutenção Hidráulica',
      location: 'Bloco C - 3º ao 5º Andar',
      date: '27 Jan 2025',
      status: 'scheduled',
      technician: 'Pedro Costa',
      duration: '8h'
    },
    {
      id: 4,
      title: 'Revisão do Sistema de Segurança',
      location: 'Todo o Complexo',
      date: '30 Jan 2025',
      status: 'scheduled',
      technician: 'Ana Oliveira',
      duration: '2 dias'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-500';
      case 'in-progress':
        return 'bg-orange-500';
      case 'completed':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Agendado';
      case 'in-progress':
        return 'Em Andamento';
      case 'completed':
        return 'Concluído';
      default:
        return 'Indefinido';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          Próximas Atividades
        </h3>
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <div className="relative">
        {/* Timeline Line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border"></div>
        
        <div className="space-y-6">
          {timelineEvents.map((event, index) => (
            <div key={event.id} className="relative flex items-start space-x-4">
              {/* Timeline Dot */}
              <div className={`relative z-10 w-3 h-3 rounded-full ${getStatusColor(event.status)}`}>
                <div className={`absolute inset-0 w-3 h-3 rounded-full ${getStatusColor(event.status)} animate-ping opacity-75`}></div>
              </div>
              
              {/* Event Content */}
              <div className="flex-1 min-w-0 pb-6">
                <div className="bg-muted/50 rounded-lg p-4 border">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-medium text-foreground">
                      {event.title}
                    </h4>
                    <span className={`text-xs px-2 py-1 rounded-full text-white ${getStatusColor(event.status)}`}>
                      {getStatusText(event.status)}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 mr-1" />
                      {event.location}
                    </div>
                    
                    <div className="flex items-center text-xs text-muted-foreground">
                      <User className="h-3 w-3 mr-1" />
                      {event.technician} • {event.duration}
                    </div>
                    
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      {event.date}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}