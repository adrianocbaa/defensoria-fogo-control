import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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

// Yellow icon for scheduled teletrabalho
const yellowIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
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
  status: 'none' | 'scheduled' | 'active'; // none=blue, scheduled=yellow, active=green
  procedimento?: string;
  dataInicio?: string;
  dataFim?: string;
  portaria?: string;
}

interface MapViewTeletrabalhoProps {
  nucleos: NucleoCentral[];
  onViewDetails: (nucleusId: string) => void;
  filters?: {
    status: ('all' | 'active' | 'scheduled')[];
  };
}

export function MapViewTeletrabalho({ nucleos, onViewDetails, filters }: MapViewTeletrabalhoProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const hasFitBounds = useRef(false);
  const [selectedNucleusId, setSelectedNucleusId] = useState<string | null>(null);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [teletrabalhoData, setTeletrabalhoData] = useState<Record<string, TeletrabalhoData>>({});
  const [isLoadingData, setIsLoadingData] = useState(true);
  const isMobile = useIsMobile();

  // Derive selected nucleus from id to avoid stale object refs
  const selectedNucleus = useMemo(() => {
    return selectedNucleusId ? nucleos.find((n) => n.id === selectedNucleusId) ?? null : null;
  }, [selectedNucleusId, nucleos]);

  // Stable callback for marker click
  const handleMarkerClick = useCallback((nucleus: NucleoCentral) => {
    console.log('handleMarkerClick called for:', nucleus.nome);
    console.log('isMobile:', isMobile);
    setSelectedNucleusId(nucleus.id);
    console.log('selectedNucleusId set to:', nucleus.id);
    if (isMobile) {
      setShowMobileModal(true);
    } else {
      setShowMobileModal(false);
    }
  }, [isMobile]);

  // Fetch teletrabalho data first, before rendering markers
  useEffect(() => {
    const fetchTeletrabalhoData = async () => {
      if (nucleos.length === 0) {
        setIsLoadingData(false);
        return;
      }

      setIsLoadingData(true);
      const dataMap: Record<string, TeletrabalhoData> = {};
      const now = new Date();

      // Fetch all at once for better performance
      const nucleoIds = nucleos.map(n => n.id);
      const { data: allTeletrabalhoRecords } = await supabase
        .from('nucleo_teletrabalho')
        .select('*')
        .in('nucleo_id', nucleoIds)
        .order('data_inicio', { ascending: false });

      // Group by nucleus_id
      const recordsByNucleus = allTeletrabalhoRecords?.reduce((acc, record) => {
        if (!acc[record.nucleo_id]) acc[record.nucleo_id] = [];
        acc[record.nucleo_id].push(record);
        return acc;
      }, {} as Record<string, any[]>) || {};

      for (const nucleus of nucleos) {
        const nucleusRecords = recordsByNucleus[nucleus.id] || [];
        
        // Normalize current date to start of day for comparison
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Find one that is not "Finalizado"
        const activeTeletrabalho = nucleusRecords.find((t) => {
          const dataInicio = new Date(t.data_inicio);
          const dataInicioDay = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), dataInicio.getDate());
          const dataFim = t.data_fim ? new Date(t.data_fim) : null;
          const dataFimDay = dataFim ? new Date(dataFim.getFullYear(), dataFim.getMonth(), dataFim.getDate()) : null;
          
          // Finalizado (histórico): tem data_fim e já passou (antes de hoje)
          if (dataFimDay && dataFimDay < today) {
            return false;
          }
          
          // Em andamento ou Agendado
          return true;
        });

        const hasActive = !!activeTeletrabalho;
        let status: 'none' | 'scheduled' | 'active' = 'none';

        if (activeTeletrabalho) {
          const dataInicio = new Date(activeTeletrabalho.data_inicio);
          const dataInicioDay = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), dataInicio.getDate());
          
          // Agendado: data_inicio no futuro (depois de hoje)
          if (dataInicioDay > today) {
            status = 'scheduled';
          } else {
            // Em andamento: data_inicio é hoje ou já passou
            status = 'active';
          }
        }

        dataMap[nucleus.id] = {
          nucleusId: nucleus.id,
          hasActiveTeletrabalho: hasActive,
          status,
          procedimento: activeTeletrabalho?.procedimento,
          dataInicio: activeTeletrabalho?.data_inicio,
          dataFim: activeTeletrabalho?.data_fim,
          portaria: activeTeletrabalho?.portaria,
        };
      }

      setTeletrabalhoData(dataMap);
      setIsLoadingData(false);
    };

    fetchTeletrabalhoData();
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

      // Debug: map click
      map.on('click', (ev) => {
        console.log('Map clicked at:', ev.latlng);
      });
    };

    initMap();
    const t = setTimeout(initMap, 150);

    return () => {
      clearTimeout(t);
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, []);

  // Render markers only after teletrabalho data is loaded
  useEffect(() => {
    if (!mapRef.current || isLoadingData) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    let validNucleos = nucleos.filter((n) => n.lat && n.lng);

    // Apply filters if provided
    if (filters && !filters.status.includes('all')) {
      validNucleos = validNucleos.filter((nucleus) => {
        const teletrabalhoInfo = teletrabalhoData[nucleus.id];
        const status = teletrabalhoInfo?.status || 'none';
        
        if (filters.status.includes('active') && status === 'active') return true;
        if (filters.status.includes('scheduled') && status === 'scheduled') return true;
        
        return false;
      });
    }

    if (validNucleos.length === 0) return;

    validNucleos.forEach((nucleus) => {
      // Determine icon based on teletrabalho status
      const teletrabalhoInfo = teletrabalhoData[nucleus.id];
      const status = teletrabalhoInfo?.status || 'none';
      
      let icon = blueIcon; // default: sem teletrabalho
      if (status === 'scheduled') {
        icon = yellowIcon; // agendado
      } else if (status === 'active') {
        icon = greenIcon; // em andamento
      }
      
      const marker = L.marker([nucleus.lat!, nucleus.lng!], { icon })
        .addTo(mapRef.current!);

      marker.on('click', (e: any) => {
        try {
          // Fully stop Leaflet and DOM propagation to avoid map-level handlers interfering
          (L as any).DomEvent?.stop(e);
        } catch {
          e.originalEvent?.stopPropagation?.();
          e.originalEvent?.preventDefault?.();
        }
        console.log('Marker clicked:', nucleus.nome);
        // Defer state update to next tick for reliability in Chrome
        setTimeout(() => handleMarkerClick(nucleus), 0);
      });

      markersRef.current.push(marker);
    });

    if (validNucleos.length > 0 && !hasFitBounds.current) {
      const bounds = L.latLngBounds(
        validNucleos.map((n) => [n.lat!, n.lng!])
      );
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      hasFitBounds.current = true;
    }
  }, [nucleos, isMobile, teletrabalhoData, isLoadingData, filters, handleMarkerClick]);

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
              <Laptop className={`h-4 w-4 ${
                data.status === 'active' ? 'text-green-600' : 
                data.status === 'scheduled' ? 'text-yellow-600' : 
                'text-muted-foreground'
              }`} />
              <span className={`text-sm font-medium ${
                data.status === 'active' ? 'text-green-600' : 
                data.status === 'scheduled' ? 'text-yellow-600' : 
                'text-muted-foreground'
              }`}>
                {data.status === 'active' ? 'Em Teletrabalho' : 
                 data.status === 'scheduled' ? 'Teletrabalho Agendado' : 
                 'Sem Teletrabalho Ativo'}
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
        <div className="absolute top-4 left-4 w-80 bg-card rounded-lg shadow-lg border z-[1000]">
          <div className="p-4">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-semibold text-lg text-foreground">{selectedNucleus.nome}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedNucleusId(null)}
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
        <div className="absolute top-4 right-4 w-64 bg-card rounded-lg shadow-lg border max-h-[500px] overflow-y-auto z-[1000]">
          <div className="p-4">
            <h3 className="font-semibold text-sm mb-3 text-foreground">
              Lista de Núcleos ({nucleos.length})
            </h3>
            <div className="space-y-2">
              {nucleos.map((nucleus) => (
                <button
                  key={nucleus.id}
                  onClick={() => setSelectedNucleusId(nucleus.id)}
                  className={`w-full text-left p-2 rounded text-xs hover:bg-muted transition-colors ${
                    selectedNucleusId === nucleus.id ? 'bg-primary/10 border-primary/20 border' : ''
                  }`}
                >
                  <div className="font-medium text-foreground">{nucleus.nome}</div>
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
          <div className="bg-card rounded-t-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-4">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-lg text-foreground">{selectedNucleus.nome}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                onClick={() => {
                  setShowMobileModal(false);
                  setSelectedNucleusId(null);
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
