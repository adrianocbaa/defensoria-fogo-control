import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { NucleoCentral } from '@/hooks/useNucleosCentral';
import { Button } from './ui/button';
import { X, MapPin, Phone, Mail, Laptop, Calendar, FileText } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface TeletrabalhoData {
  procedimento: string;
  data_inicio: string;
  data_fim: string | null;
  portaria: string | null;
}

interface MapViewCentralProps {
  nucleos: NucleoCentral[];
  onViewDetails: (nucleusId: string) => void;
}

export function MapViewCentral({ nucleos, onViewDetails }: MapViewCentralProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [selectedNucleus, setSelectedNucleus] = useState<NucleoCentral | null>(null);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [teletrabalhoData, setTeletrabalhoData] = useState<Record<string, TeletrabalhoData | null>>({});
  const isMobile = useIsMobile();

  useEffect(() => {
    const initMap = () => {
      if (mapRef.current) return;
      const container = document.getElementById('map-central');
      if (!container) return;

      // Initialize map once the container is available
      const map = L.map(container as HTMLElement, {
        center: [-15.601411, -56.097892], // Centro de MT
        zoom: 7,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      // Ensure Leaflet measures the container after it has a size
      setTimeout(() => {
        map.invalidateSize();
      }, 0);

      mapRef.current = map;
    };

    initMap();
    // Fallback in case the DOM wasn't ready yet
    const t = setTimeout(initMap, 150);

    return () => {
      clearTimeout(t);
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, []);

  // Fetch teletrabalho data for all nucleos (only "Em andamento")
  useEffect(() => {
    const fetchTeletrabalhoData = async () => {
      if (nucleos.length === 0) return;

      const nucleoIds = nucleos.map(n => n.id);

      try {
        // Fetch all teletrabalho records for these nucleos
        const { data, error } = await supabase
          .from('nucleo_teletrabalho')
          .select('nucleo_id, procedimento, data_inicio, data_fim, portaria')
          .in('nucleo_id', nucleoIds);

        if (error) throw error;

        // Normalize today's date to midnight for accurate comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const teletrabalhoMap: Record<string, TeletrabalhoData | null> = {};
        
        nucleoIds.forEach(id => {
          // Find teletrabalho records for this nucleus
          const nucleoTeletrabalhos = data?.filter(t => t.nucleo_id === id) || [];
          
          // Find one that is "Em andamento" (status: In Progress)
          const activeTeletrabalho = nucleoTeletrabalhos.find(t => {
            const dataInicio = new Date(t.data_inicio + 'T00:00:00');
            const dataFim = t.data_fim ? new Date(t.data_fim + 'T23:59:59') : null;
            
            // Em andamento: já começou E (não tem fim OU ainda não terminou)
            // dataInicio <= today AND (no end date OR dataFim >= today)
            return dataInicio <= today && (!dataFim || dataFim >= today);
          });
          
          teletrabalhoMap[id] = activeTeletrabalho ? {
            procedimento: activeTeletrabalho.procedimento,
            data_inicio: activeTeletrabalho.data_inicio,
            data_fim: activeTeletrabalho.data_fim,
            portaria: activeTeletrabalho.portaria,
          } : null;
        });

        setTeletrabalhoData(teletrabalhoMap);
      } catch (error) {
        console.error('Error fetching teletrabalho data:', error);
      }
    };

    fetchTeletrabalhoData();
  }, [nucleos]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Filter nucleos with valid coordinates
    const validNucleos = nucleos.filter((n) => n.lat && n.lng);

    if (validNucleos.length === 0) return;

    // Add new markers
    validNucleos.forEach((nucleus) => {
      const marker = L.marker([nucleus.lat!, nucleus.lng!])
        .addTo(mapRef.current!);

      marker.on('click', () => {
        setSelectedNucleus(nucleus);
        if (isMobile) {
          setShowMobileModal(true);
        }
      });

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (validNucleos.length > 0) {
      const bounds = L.latLngBounds(
        validNucleos.map((n) => [n.lat!, n.lng!])
      );
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [nucleos, isMobile]);

  const NucleusDetailsContent = ({ nucleus }: { nucleus: NucleoCentral }) => {
    const activeTeletrabalho = teletrabalhoData[nucleus.id];
    
    // Só mostra se houver teletrabalho ativo
    if (!activeTeletrabalho) {
      return null;
    }

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
        <div className="border rounded-lg p-3 space-y-2 bg-blue-50">
          <div className="flex items-center gap-2">
            <Laptop className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">
              Em Teletrabalho
            </span>
          </div>

          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">{activeTeletrabalho.procedimento}</span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">
              Início: {format(new Date(activeTeletrabalho.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
            </span>
          </div>

          {activeTeletrabalho.data_fim && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">
                Fim: {format(new Date(activeTeletrabalho.data_fim), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
            </div>
          )}

          {activeTeletrabalho.portaria && (
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Portaria: {activeTeletrabalho.portaria}</span>
            </div>
          )}
        </div>

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
      {/* Map container */}
      <div id="map-central" className="absolute inset-0" />

      {/* Desktop Sidebar - Nucleus info panel */}
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

      {/* Mobile: Modal for nucleus details */}
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
