import { MapPin, Zap, Droplets, Wind, Shield } from 'lucide-react';
import { useState } from 'react';

export function MaintenanceMap() {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  const maintenancePoints = [
    {
      id: '1',
      type: 'electrical',
      location: 'Sala 201 - 2º Andar',
      status: 'urgent',
      description: 'Problema na rede elétrica',
      x: 25,
      y: 30
    },
    {
      id: '2',
      type: 'plumbing',
      location: 'Banheiro 1º Andar',
      status: 'normal',
      description: 'Vazamento na torneira',
      x: 65,
      y: 45
    },
    {
      id: '3',
      type: 'hvac',
      location: 'Auditório Principal',
      status: 'scheduled',
      description: 'Manutenção preventiva AC',
      x: 45,
      y: 60
    },
    {
      id: '4',
      type: 'security',
      location: 'Entrada Principal',
      status: 'normal',
      description: 'Revisão sistema segurança',
      x: 35,
      y: 20
    },
    {
      id: '5',
      type: 'electrical',
      location: 'Subsolo - Gerador',
      status: 'urgent',
      description: 'Falha no gerador backup',
      x: 75,
      y: 75
    }
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'electrical':
        return Zap;
      case 'plumbing':
        return Droplets;
      case 'hvac':
        return Wind;
      case 'security':
        return Shield;
      default:
        return MapPin;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'urgent':
        return 'text-red-500 bg-red-100 border-red-200';
      case 'normal':
        return 'text-blue-500 bg-blue-100 border-blue-200';
      case 'scheduled':
        return 'text-green-500 bg-green-100 border-green-200';
      default:
        return 'text-gray-500 bg-gray-100 border-gray-200';
    }
  };

  return (
    <div className="relative">
      {/* Mini Map Container */}
      <div className="relative w-full h-64 bg-muted/30 rounded-lg border overflow-hidden">
        {/* Building Layout - Simplified representation */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          {/* Building outline */}
          <rect x="10" y="15" width="80" height="70" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-muted-foreground" />
          
          {/* Floor divisions */}
          <line x1="10" y1="35" x2="90" y2="35" stroke="currentColor" strokeWidth="0.3" className="text-muted-foreground" />
          <line x1="10" y1="55" x2="90" y2="55" stroke="currentColor" strokeWidth="0.3" className="text-muted-foreground" />
          <line x1="10" y1="75" x2="90" y2="75" stroke="currentColor" strokeWidth="0.3" className="text-muted-foreground" />
          
          {/* Vertical divisions */}
          <line x1="30" y1="15" x2="30" y2="85" stroke="currentColor" strokeWidth="0.3" className="text-muted-foreground" />
          <line x1="50" y1="15" x2="50" y2="85" stroke="currentColor" strokeWidth="0.3" className="text-muted-foreground" />
          <line x1="70" y1="15" x2="70" y2="85" stroke="currentColor" strokeWidth="0.3" className="text-muted-foreground" />
        </svg>

        {/* Maintenance Points */}
        {maintenancePoints.map((point) => {
          const Icon = getIcon(point.type);
          return (
            <div
              key={point.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all hover:scale-110 ${
                selectedLocation === point.id ? 'scale-125 z-10' : ''
              }`}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              onClick={() => setSelectedLocation(selectedLocation === point.id ? null : point.id)}
            >
              <div className={`p-2 rounded-full border-2 shadow-sm ${getStatusColor(point.status)}`}>
                <Icon className="h-3 w-3" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <span>Urgente</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <span>Normal</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span>Agendado</span>
        </div>
      </div>

      {/* Selected Point Details */}
      {selectedLocation && (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
          {(() => {
            const point = maintenancePoints.find(p => p.id === selectedLocation);
            if (!point) return null;
            const Icon = getIcon(point.type);
            return (
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${getStatusColor(point.status)}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium">{point.location}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {point.description}
                  </p>
                  <div className="mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(point.status)}`}>
                      {point.status === 'urgent' ? 'Urgente' : 
                       point.status === 'normal' ? 'Normal' : 'Agendado'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}