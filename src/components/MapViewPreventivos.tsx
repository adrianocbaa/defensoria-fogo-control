import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { NucleoCentral } from '@/hooks/useNucleosCentral';
import { Button } from './ui/button';
import { X, MapPin, Phone, Mail, Droplets, Target, AlertTriangle, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { isBefore, addDays, startOfDay, parseISO } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom pin icons based on status (SVG data URL for reliability)
const createPinIcon = (color: 'green' | 'orange' | 'red'): L.Icon => {
  const colorMap = {
    green: '#22c55e',
    orange: '#f59e0b',
    red: '#ef4444',
  } as const;

  const hex = colorMap[color];
  const svg = encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' width='32' height='48' viewBox='0 0 24 36'>
      <path d='M12 36s9-11.09 9-18A9 9 0 0 0 3 18c0 6.91 9 18 9 18z' fill='${hex}' stroke='white' stroke-width='2'/>
      <circle cx='12' cy='18' r='3.5' fill='white'/>
    </svg>
  `);

  return L.icon({
    iconUrl: `data:image/svg+xml;charset=UTF-8,${svg}`,
    iconSize: [32, 48],
    iconAnchor: [16, 44],
    popupAnchor: [0, -40],
    shadowUrl: undefined,
  });
};

interface NucleusStatus {
  nucleusId: string;
  hasHydrant: boolean;
  totalExtinguishers: number;
  expiredExtinguishers: number;
  expiringSoonExtinguishers: number;
  licenseStatus: 'valid' | 'expired' | 'expiring-soon' | null;
  pinColor: 'green' | 'orange' | 'red';
}

export interface PreventivosStatusSummary {
  regularizados: number;
  atencao: number;
  urgente: number;
}

interface MapViewPreventivosProps {
  nucleos: NucleoCentral[];
  onViewDetails: (nucleusId: string) => void;
  onStatusLoaded?: (summary: PreventivosStatusSummary) => void;
}

export function MapViewPreventivos({ nucleos, onViewDetails, onStatusLoaded }: MapViewPreventivosProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [selectedNucleus, setSelectedNucleus] = useState<NucleoCentral | null>(null);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [nucleusStatus, setNucleusStatus] = useState<Record<string, NucleusStatus>>({});
  const isMobile = useIsMobile();

  // Fetch status data for all nucleos
  useEffect(() => {
    const fetchStatusData = async () => {
      const statusMap: Record<string, NucleusStatus> = {};

      for (const nucleus of nucleos) {
        // Fetch hydrants
        const { data: hydrants } = await supabase
          .from('hydrants')
          .select('id')
          .eq('nucleus_id', nucleus.id);

        // Fetch extinguishers
        const { data: extinguishers } = await supabase
          .from('fire_extinguishers')
          .select('expiration_date')
          .eq('nucleus_id', nucleus.id);

        // Fetch license data from nuclei table
        const { data: nucleiData } = await supabase
          .from('nuclei')
          .select('fire_department_license_valid_until')
          .eq('id', nucleus.id)
          .maybeSingle();

        // Calculate status
        const today = startOfDay(new Date());
        const twoMonthsFromNow = addDays(today, 60);
        
        let licenseStatus: 'valid' | 'expired' | 'expiring-soon' | null = null;
        if (nucleiData?.fire_department_license_valid_until) {
          const validUntil = startOfDay(parseISO(nucleiData.fire_department_license_valid_until));
          if (isBefore(validUntil, today)) {
            licenseStatus = 'expired';
          } else if (isBefore(validUntil, twoMonthsFromNow)) {
            licenseStatus = 'expiring-soon';
          } else {
            licenseStatus = 'valid';
          }
        }

        const expiredCount = (extinguishers || []).filter(ext => 
          isBefore(startOfDay(parseISO(ext.expiration_date)), today)
        ).length;

        const expiringSoonCount = (extinguishers || []).filter(ext => {
          const expDate = startOfDay(parseISO(ext.expiration_date));
          return !isBefore(expDate, today) && isBefore(expDate, twoMonthsFromNow);
        }).length;

        // Determine pin color
        const hasNoExtinguishers = (extinguishers?.length || 0) === 0;
        const hasNoLicense = !nucleiData?.fire_department_license_valid_until;
        let pinColor: 'green' | 'orange' | 'red' = 'green';
        if (expiredCount > 0 || licenseStatus === 'expired' || hasNoExtinguishers || hasNoLicense) {
          pinColor = 'red';
        } else if (expiringSoonCount > 0 || licenseStatus === 'expiring-soon') {
          pinColor = 'orange';
        }

        statusMap[nucleus.id] = {
          nucleusId: nucleus.id,
          hasHydrant: (hydrants?.length || 0) > 0,
          totalExtinguishers: extinguishers?.length || 0,
          expiredExtinguishers: expiredCount,
          expiringSoonExtinguishers: expiringSoonCount,
          licenseStatus,
          pinColor,
        };
      }

      setNucleusStatus(statusMap);

      // Calculate summary
      if (onStatusLoaded) {
        const values = Object.values(statusMap);
        onStatusLoaded({
          regularizados: values.filter(s => s.pinColor === 'green').length,
          atencao: values.filter(s => s.pinColor === 'orange').length,
          urgente: values.filter(s => s.pinColor === 'red').length,
        });
      }
    };

    if (nucleos.length > 0) {
      fetchStatusData();
    }
  }, [nucleos]);

  useEffect(() => {
    const initMap = () => {
      if (mapRef.current) return;
      const container = document.getElementById('map-preventivos');
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
      const status = nucleusStatus[nucleus.id];
      const pinColor = status?.pinColor || 'green';
      const icon = createPinIcon(pinColor);

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
  }, [nucleos, isMobile, nucleusStatus]);

  const NucleusDetailsContent = ({ nucleus }: { nucleus: NucleoCentral }) => {
    const status = nucleusStatus[nucleus.id];

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

        {/* Status Information - Preventivos */}
        {status && (
          <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
            {/* Hidrante */}
            <div className="flex items-center gap-2">
              <Droplets className={`h-4 w-4 ${status.hasHydrant ? 'text-blue-600' : 'text-muted-foreground'}`} />
              <span className={`text-sm ${!status.hasHydrant ? 'text-danger font-medium' : 'text-foreground'}`}>
                {status.hasHydrant ? `Hidrante` : 'Sem hidrante'}
              </span>
            </div>

            {/* Extintores */}
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">
                {status.totalExtinguishers} extintor(es)
              </span>
            </div>

            {/* Extintores Vencidos */}
            {status.expiredExtinguishers > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-danger" />
                <span className="text-sm text-danger font-medium">
                  {status.expiredExtinguishers} extintor(es) vencido(s)
                </span>
              </div>
            )}

            {/* Extintores Vencendo */}
            {status.expiringSoonExtinguishers > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-sm text-warning font-medium">
                  {status.expiringSoonExtinguishers} extintor(es) vencendo em 60 dias
                </span>
              </div>
            )}

            {/* Alvará */}
            <div className="flex items-center gap-2">
              {status.licenseStatus ? (
                <>
                  <Shield className={`h-4 w-4 ${status.licenseStatus === 'expired' ? 'text-danger' : status.licenseStatus === 'expiring-soon' ? 'text-warning' : 'text-success'}`} />
                  <span className={`text-sm font-medium ${status.licenseStatus === 'expired' ? 'text-danger' : status.licenseStatus === 'expiring-soon' ? 'text-warning' : 'text-foreground'}`}>
                    {status.licenseStatus === 'expired' ? 'Alvará vencido' : status.licenseStatus === 'expiring-soon' ? 'Alvará vencendo em breve' : 'Alvará válido'}
                  </span>
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-danger font-medium">
                    Sem Alvará
                  </span>
                </>
              )}
            </div>
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
      <div id="map-preventivos" className="absolute inset-0" />

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
