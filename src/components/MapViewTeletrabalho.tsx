import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { NucleoCentral } from '@/hooks/useNucleosCentral';
import { Button } from './ui/button';
import { X, MapPin, Phone, Mail, Laptop, Calendar, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom green icon for active teletrabalho
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Default blue icon
const blueIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface TeletrabalhoData {
  nucleusId: string;
  hasActiveTeletrabalho: boolean;
  procedimento?: string;
  dataInicio?: string;
  dataFim?: string;
  portaria?: string;
}

interface MapViewTeletrabalhoProps {
  nucleos: NucleoCentral[];
  onViewDetails: (nucleusId: string) => void;
}

export function MapViewTeletrabalho({ nucleos, onViewDetails }: MapViewTeletrabalhoProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [selectedNucleus, setSelectedNucleus] = useState<NucleoCentral | null>(null);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [teletrabalhoData, setTeletrabalhoData] = useState<Record<string, TeletrabalhoData>>({});
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchTeletrabalhoData = async () => {
      const dataMap: Record<string, TeletrabalhoData> = {};
      const now = new Date();

      for (const nucleus of nucleos) {
        // Fetch all teletrabalho records
        const { data: teletrabalhoRecords } = await supabase
          .from('nucleo_teletrabalho')
          .select('*')
          .eq('nucleo_id', nucleus.id)
          .order('data_inicio', { ascending: false });

        // Find one that is "Em andamento" or "Agendado" (not Finalizado)
        const activeTeletrabalho = teletrabalhoRecords?.find((t) => {
          const dataInicio = new Date(t.data_inicio);
          const dataFim = t.data_fim ? new Date(t.data_fim) : null;
          
          // Finalizado (histórico): tem data_fim e já passou
          if (dataFim && dataFim < now) {
            return false;
          }
          
          // Em andamento ou Agendado
          return true;
        });

        const hasActive = !!activeTeletrabalho;

        dataMap[nucleus.id] = {
          nucleusId: nucleus.id,
          hasActiveTeletrabalho: hasActive,
          procedimento: activeTeletrabalho?.procedimento,
          dataInicio: activeTeletrabalho?.data_inicio,
          dataFim: activeTeletrabalho?.data_fim,
          portaria: activeTeletrabalho?.portaria,
        };
      }

      setTeletrabalhoData(dataMap);
    };

    if (nucleos.length > 0) {
      fetchTeletrabalhoData();
    }
  }, [nucleos]);

  useEffect(() => {
    const initMap = () => {
      if (mapRef.current) return;
      const container = document.getElementById('map-teletrabalho');
      if (!container) return;

      const map = L.map(container as HTMLElement, {
        center: [-15.601411, -56.097892],
        zoom: 7,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      setTimeout(() => {
        map.invalidateSize();
      }, 0);

      mapRef.current = map;
    };

    initMap();
    const t = setTimeout(initMap, 150);

    return () => {
      clearTimeout(t);
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const validNucleos = nucleos.filter((n) => n.lat && n.lng);

    if (validNucleos.length === 0) return;

    validNucleos.forEach((nucleus) => {
      // Determine icon based on teletrabalho status
      const teletrabalhoInfo = teletrabalhoData[nucleus.id];
      const hasActiveTeletrabalho = teletrabalhoInfo?.hasActiveTeletrabalho || false;
      const icon = hasActiveTeletrabalho ? greenIcon : blueIcon;
      
      const marker = L.marker([nucleus.lat!, nucleus.lng!], { icon })
        .addTo(mapRef.current!);

      marker.on('click', () => {
        setSelectedNucleus(nucleus);
        if (isMobile) {
          setShowMobileModal(true);
        }
      });

      markersRef.current.push(marker);
    });

    if (validNucleos.length > 0) {
      const bounds = L.latLngBounds(
        validNucleos.map((n) => [n.lat!, n.lng!])
      );
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [nucleos, isMobile, teletrabalhoData]);

  const NucleusDetailsContent = ({ nucleus }: { nucleus: NucleoCentral }) => {
    const data = teletrabalhoData[nucleus.id];

    return (
      <div className="space-y-4">
        <div>
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
            <div>
              <p className="text-sm font-medium">Endereço</p>
              <p className="text-sm text-muted-foreground">{nucleus.endereco}</p>
              <p className="text-sm text-muted-foreground">{nucleus.cidade}</p>
            </div>
          </div>
        </div>

        {/* Teletrabalho Information */}
        {data && (
          <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
            <div className="flex items-center gap-2">
              <Laptop className={`h-4 w-4 ${data.hasActiveTeletrabalho ? 'text-blue-600' : 'text-muted-foreground'}`} />
              <span className={`text-sm font-medium ${data.hasActiveTeletrabalho ? 'text-blue-600' : 'text-muted-foreground'}`}>
                {data.hasActiveTeletrabalho ? 'Em Teletrabalho' : 'Sem Teletrabalho Ativo'}
              </span>
            </div>

            {data.hasActiveTeletrabalho && (
              <>
                {data.procedimento && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      {data.procedimento}
                    </span>
                  </div>
                )}

                {data.dataInicio && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      Início: {format(new Date(data.dataInicio), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  </div>
                )}

                {data.dataFim && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      Fim: {format(new Date(data.dataFim), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  </div>
                )}

                {data.portaria && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      Portaria: {data.portaria}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {nucleus.telefones && (
          <div>
            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium">Telefones</p>
                <p className="text-sm text-muted-foreground">{nucleus.telefones}</p>
              </div>
            </div>
          </div>
        )}

        {nucleus.email && (
          <div>
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium">E-mail</p>
                <p className="text-sm text-muted-foreground">{nucleus.email}</p>
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={() => onViewDetails(nucleus.id)}
          className="w-full"
        >
          Ver Detalhes
        </Button>
      </div>
    );
  };

  return (
    <div className="relative w-full h-[600px] border rounded-lg overflow-hidden z-0">
      <div id="map-teletrabalho" className="absolute inset-0" />

      {/* Desktop Sidebar */}
      {!isMobile && selectedNucleus && (
        <div className="absolute top-4 left-4 w-80 bg-white rounded-lg shadow-lg border z-[1000]">
          <div className="p-4">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-semibold text-lg">{selectedNucleus.nome}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedNucleus(null)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <NucleusDetailsContent nucleus={selectedNucleus} />
          </div>
        </div>
      )}

      {/* Desktop: Nucleus list sidebar */}
      {!isMobile && (
        <div className="absolute top-4 right-4 w-64 bg-white rounded-lg shadow-lg border max-h-[500px] overflow-y-auto z-[1000]">
          <div className="p-4">
            <h3 className="font-semibold text-sm mb-3">
              Lista de Núcleos ({nucleos.length})
            </h3>
            <div className="space-y-2">
              {nucleos.map((nucleus) => (
                <button
                  key={nucleus.id}
                  onClick={() => setSelectedNucleus(nucleus)}
                  className={`w-full text-left p-2 rounded text-xs hover:bg-muted transition-colors ${
                    selectedNucleus?.id === nucleus.id ? 'bg-primary/10 border-primary/20 border' : ''
                  }`}
                >
                  <div className="font-medium">{nucleus.nome}</div>
                  <div className="text-muted-foreground">{nucleus.cidade}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Modal */}
      {isMobile && selectedNucleus && showMobileModal && (
        <div className="fixed inset-0 bg-black/50 z-[1001] flex items-end justify-center p-4">
          <div className="bg-white rounded-t-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-4">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-lg">{selectedNucleus.nome}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowMobileModal(false);
                    setSelectedNucleus(null);
                  }}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <NucleusDetailsContent nucleus={selectedNucleus} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
