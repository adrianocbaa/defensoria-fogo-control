import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { NucleoCentral } from '@/hooks/useNucleosCentral';
import { Button } from './ui/button';
import { X, MapPin, Phone, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapViewCentralProps {
  nucleos: NucleoCentral[];
  onViewDetails: (nucleusId: string) => void;
}

export function MapViewCentral({ nucleos, onViewDetails }: MapViewCentralProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [selectedNucleus, setSelectedNucleus] = useState<NucleoCentral | null>(null);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!mapRef.current) {
      // Initialize map
      const map = L.map('map-central', {
        center: [-15.601411, -56.097892], // Centro de MT
        zoom: 7,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      mapRef.current = map;
    }

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, []);

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

      // Popup content
      const popupContent = `
        <div class="p-2 min-w-[200px]">
          <h3 class="font-semibold text-base mb-2">${nucleus.nome}</h3>
          <p class="text-sm text-muted-foreground mb-1"><strong>Cidade:</strong> ${nucleus.cidade}</p>
          <p class="text-sm text-muted-foreground mb-1"><strong>Endereço:</strong> ${nucleus.endereco}</p>
          ${nucleus.telefones ? `<p class="text-sm text-muted-foreground mb-1"><strong>Telefones:</strong> ${nucleus.telefones}</p>` : ''}
          ${nucleus.email ? `<p class="text-sm text-muted-foreground mb-3"><strong>E-mail:</strong> ${nucleus.email}</p>` : ''}
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'custom-popup',
      });

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

  const NucleusDetailsContent = ({ nucleus }: { nucleus: NucleoCentral }) => (
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
        Ver Detalhes Completos
      </Button>
    </div>
  );

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
