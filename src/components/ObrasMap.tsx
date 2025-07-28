import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { obrasSimuladas, type ObraStatus } from '@/data/mockObras';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Função para criar ícones coloridos por status
const createStatusIcon = (status: ObraStatus): L.DivIcon => {
  const colors = {
    concluida: '#22c55e',     // Verde
    em_andamento: '#3b82f6',  // Azul
    planejada: '#eab308',     // Amarelo
    paralisada: '#ef4444'     // Vermelho
  };

  const color = colors[status];

  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        position: relative;
      ">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 8px;
          height: 8px;
          background-color: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    className: 'obra-marker',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13]
  });
};

// Função para formatar valor em moeda brasileira
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

// Função para traduzir status
const getStatusLabel = (status: ObraStatus): string => {
  const labels = {
    concluida: 'Concluída',
    em_andamento: 'Em Andamento',
    planejada: 'Planejada',
    paralisada: 'Paralisada'
  };
  return labels[status];
};

interface ObrasMapProps {
  className?: string;
}

export function ObrasMap({ className }: ObrasMapProps) {
  const mapRef = useRef<L.Map | null>(null);

  // Coordenadas do centro de Mato Grosso
  const matogrossoCenter: [number, number] = [-12.64, -55.42];
  const initialZoom = 7;

  useEffect(() => {
    // Garantir que os estilos do Leaflet são aplicados corretamente
    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`h-full w-full ${className}`}>
      <MapContainer
        center={matogrossoCenter}
        zoom={initialZoom}
        className="h-full w-full rounded-lg"
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {obrasSimuladas.map((obra) => (
          <Marker
            key={obra.id}
            position={obra.coordenadas}
            icon={createStatusIcon(obra.status)}
          >
            <Popup className="obra-popup">
              <div className="p-2 min-w-[200px]">
                <h3 className="font-semibold text-sm mb-2 text-gray-900">
                  {obra.nome}
                </h3>
                
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Município:</span>
                    <span className="font-medium text-gray-900">{obra.municipio}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium px-2 py-0.5 rounded-full text-white text-xs ${
                      obra.status === 'concluida' ? 'bg-green-500' :
                      obra.status === 'em_andamento' ? 'bg-blue-500' :
                      obra.status === 'planejada' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}>
                      {getStatusLabel(obra.status)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipo:</span>
                    <span className="font-medium text-gray-900">{obra.tipo}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Valor:</span>
                    <span className="font-medium text-gray-900">{formatCurrency(obra.valor)}</span>
                  </div>
                </div>
                
                <button className="mt-3 w-full bg-blue-600 text-white text-xs py-1.5 px-3 rounded hover:bg-blue-700 transition-colors">
                  Ver Detalhes
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}