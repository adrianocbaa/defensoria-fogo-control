import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { type ObraStatus, type Obra } from '@/data/mockObras';
import { MapLoadingSkeleton } from '@/components/LoadingStates';

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

// Função para calcular porcentagem de execução 
// Fórmula: Valor Pago (valorExecutado) / Valor Final (valor) * 100
const formatExecutionPercentage = (obra: Obra): string => {
  if (!obra.valor || obra.valor === 0) {
    return '0,00%';
  }
  
  const valorPago = obra.valorExecutado || 0;
  const valorFinal = obra.valor;
  const percentage = (valorPago / valorFinal) * 100;
  
  return percentage.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + '%';
};

interface ObrasMapProps {
  className?: string;
  obras?: Obra[];
  onObraClick?: (obra: Obra) => void;
  loading?: boolean;
}

export function ObrasMap({ className, obras = [], onObraClick, loading = false }: ObrasMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Coordenadas do centro de Mato Grosso
  const matogrossoCenter: [number, number] = [-12.64, -55.42];
  const initialZoom = 7;

  useEffect(() => {
    // Simulate map initialization time
    const timer = setTimeout(() => {
      setMapReady(true);
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // Show loading skeleton while data is loading or map is initializing
  if (loading || !mapReady) {
    return (
      <div className={`h-full w-full ${className}`}>
        <MapLoadingSkeleton />
      </div>
    );
  }

  return (
    <div className={`h-full w-full ${className}`}>
      <MapContainer
        center={matogrossoCenter}
        zoom={initialZoom}
        className="h-full w-full rounded-lg transition-all duration-300"
        ref={mapRef}
        zoomControl={false}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Zoom Control positioned for better UX */}
        <div className="leaflet-top leaflet-right">
          <div className="leaflet-control-zoom leaflet-bar leaflet-control">
            <a className="leaflet-control-zoom-in" href="#" title="Zoom in" role="button" aria-label="Zoom in">+</a>
            <a className="leaflet-control-zoom-out" href="#" title="Zoom out" role="button" aria-label="Zoom out">−</a>
          </div>
        </div>

        {/* Marker Cluster Group for better performance */}
        <MarkerClusterGroup
          chunkedLoading
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          zoomToBoundsOnClick={true}
          maxClusterRadius={50}
          iconCreateFunction={(cluster) => {
            const count = cluster.getChildCount();
            let size = 'small';
            
            if (count >= 10) size = 'large';
            else if (count >= 5) size = 'medium';
            
            return L.divIcon({
              html: `<div class="cluster-marker cluster-${size}"><span>${count}</span></div>`,
              className: 'custom-cluster-icon',
              iconSize: size === 'large' ? [50, 50] : size === 'medium' ? [40, 40] : [30, 30]
            });
          }}
        >
        
        {obras.map((obra) => (
          <Marker
            key={obra.id}
            position={obra.coordenadas}
            icon={createStatusIcon(obra.status)}
            eventHandlers={{
              click: () => {
                onObraClick?.(obra);
              }
            }}
          >
            {/* Hover Tooltip */}
            <Tooltip
              permanent={false}
              direction="top"
              offset={[0, -10]}
              opacity={0.95}
              className="obra-tooltip"
            >
              <div className="p-3 min-w-[220px] bg-white border border-gray-200 rounded-lg shadow-lg">
                <h3 className="font-semibold text-sm mb-2 text-gray-900 truncate">
                  {obra.nome}
                </h3>
                
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">🏙️ Município:</span>
                    <span className="font-medium text-gray-900">{obra.municipio}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">🔄 Status:</span>
                    <span className={`font-medium px-2 py-0.5 rounded-full text-white text-xs ${
                      obra.status === 'concluida' ? 'bg-green-500' :
                      obra.status === 'em_andamento' ? 'bg-blue-500' :
                      obra.status === 'planejada' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}>
                      {getStatusLabel(obra.status)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">🏷️ Tipo:</span>
                    <span className="font-medium text-gray-900">{obra.tipo}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">📊 Execução:</span>
                    <span className="font-medium text-gray-900">{formatExecutionPercentage(obra)}</span>
                  </div>
                </div>
                
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-500">Clique para ver detalhes</span>
                </div>
              </div>
            </Tooltip>
          </Marker>
        ))}
        </MarkerClusterGroup>
      </MapContainer>
      
      {/* Custom Cluster Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-cluster-icon {
          background: transparent !important;
          border: none !important;
        }
        
        .cluster-marker {
          background: rgba(59, 130, 246, 0.8);
          border: 3px solid white;
          border-radius: 50%;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          transition: all 0.2s ease;
        }
        
        .cluster-marker:hover {
          background: rgba(59, 130, 246, 1);
          transform: scale(1.1);
        }
        
        .cluster-small { width: 30px; height: 30px; font-size: 12px; }
        .cluster-medium { width: 40px; height: 40px; font-size: 14px; }
        .cluster-large { width: 50px; height: 50px; font-size: 16px; }
        
        .obra-marker {
          transition: all 0.2s ease;
        }
        
        .obra-marker:hover {
          transform: scale(1.1);
          z-index: 1000;
        }
        
        .leaflet-popup {
          animation: fadeInUp 0.3s ease-out;
        }
        
        .obra-tooltip .leaflet-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          z-index: 1000 !important;
        }
        
        .obra-tooltip .leaflet-tooltip:before {
          display: none !important;
        }
        
        .obra-tooltip:hover {
          z-index: 1001 !important;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        `
      }} />
    </div>
  );
}