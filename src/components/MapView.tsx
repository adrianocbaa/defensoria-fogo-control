import React, { useState, useMemo, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Nucleus } from '@/types/nucleus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Building2, 
  Droplets, 
  AlertTriangle, 
  Clock, 
  Phone,
  Mail,
  ExternalLink
} from 'lucide-react';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapViewProps {
  nuclei: Nucleus[];
  onViewDetails: (nucleusId: string) => void;
}

const getMarkerColor = (nucleus: Nucleus) => {
  const now = new Date();
  const twoMonthsFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days
  
  // Check for expired items
  const hasExpiredExtinguishers = nucleus.fireExtinguishers.some(ext => ext.status === 'expired');
  const hasExpiredLicense = nucleus.fireDepartmentLicense?.validUntil 
    ? new Date(nucleus.fireDepartmentLicense.validUntil) < now
    : false;
  
  if (hasExpiredExtinguishers || hasExpiredLicense) {
    return '#ef4444'; // Red for expired items
  }
  
  // Check for items expiring soon
  const hasExpiringSoonExtinguishers = nucleus.fireExtinguishers.some(ext => ext.status === 'expiring-soon');
  const hasExpiringSoonLicense = nucleus.fireDepartmentLicense?.validUntil 
    ? new Date(nucleus.fireDepartmentLicense.validUntil) <= twoMonthsFromNow && new Date(nucleus.fireDepartmentLicense.validUntil) >= now
    : false;
  
  if (hasExpiringSoonExtinguishers || hasExpiringSoonLicense) {
    return '#f97316'; // Orange for expiring soon
  }
  
  return '#22c55e'; // Green for normal status
};

// Create custom icon function
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background-color: ${color};
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

export function MapView({ nuclei, onViewDetails }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const [selectedNucleus, setSelectedNucleus] = useState<Nucleus | null>(null);

  // Filter nuclei with valid coordinates
  const validNuclei = useMemo(() => {
    return nuclei.filter(nucleus => {
      return nucleus.coordinates && 
             typeof nucleus.coordinates.lat === 'number' && 
             typeof nucleus.coordinates.lng === 'number' &&
             nucleus.coordinates.lat >= -90 && 
             nucleus.coordinates.lat <= 90 &&
             nucleus.coordinates.lng >= -180 && 
             nucleus.coordinates.lng <= 180;
    });
  }, [nuclei]);

  // Calculate map center based on nuclei
  const mapCenter = useMemo(() => {
    if (validNuclei.length === 0) {
      return [-15.6014, -55.6528]; // Centro de Mato Grosso (default)
    }

    const avgLat = validNuclei.reduce((sum, nucleus) => sum + nucleus.coordinates!.lat, 0) / validNuclei.length;
    const avgLng = validNuclei.reduce((sum, nucleus) => sum + nucleus.coordinates!.lng, 0) / validNuclei.length;
    
    return [avgLat, avgLng];
  }, [validNuclei]);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = L.map(mapContainer.current).setView(mapCenter as [number, number], 6);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map.current);

    // Add markers for each nucleus
    validNuclei.forEach((nucleus) => {
      const marker = L.marker(
        [nucleus.coordinates!.lat, nucleus.coordinates!.lng],
        { icon: createCustomIcon(getMarkerColor(nucleus)) }
      ).addTo(map.current!);

      // Add click event
      marker.on('click', () => {
        setSelectedNucleus(nucleus);
      });

      // Add popup
      const popupContent = `
        <div style="min-width: 200px;">
          <h3 style="font-weight: 600; font-size: 14px; margin-bottom: 8px;">${nucleus.name}</h3>
          <p style="font-size: 12px; color: #666; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
            📍 ${nucleus.city}
          </p>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: ${nucleus.hydrants.length > 0 ? '#2563eb' : '#9ca3af'};">💧</span>
              <span style="font-size: 12px;">
                ${nucleus.hydrants.length > 0 ? `${nucleus.hydrants.length} hidrante(s)` : 'Sem hidrante'}
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="color: #dc2626;">🧯</span>
              <span style="font-size: 12px;">
                ${nucleus.fireExtinguishers.length} extintor(es)
              </span>
            </div>
          </div>
        </div>
      `;
      
      marker.bindPopup(popupContent);
    });

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [validNuclei, mapCenter]);

  return (
    <div className="relative w-full h-[600px] border rounded-lg overflow-hidden">
      {/* Map container */}
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Nucleus info panel */}
      {selectedNucleus && (
        <div className="absolute top-4 left-4 w-80 bg-white rounded-lg shadow-lg border z-[1000]">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{selectedNucleus.name}</CardTitle>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {selectedNucleus.city}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedNucleus(null)}
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {/* Address */}
              <div>
                <p className="text-sm font-medium mb-1">Endereço:</p>
                <p className="text-sm text-muted-foreground">{selectedNucleus.address}</p>
              </div>

              {/* Hydrant status */}
              <div className="flex items-center gap-2">
                <Droplets className={`h-4 w-4 ${selectedNucleus.hydrants.length > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="text-sm">
                  {selectedNucleus.hydrants.length > 0 ? `${selectedNucleus.hydrants.length} hidrante(s)` : 'Sem hidrante'}
                </span>
              </div>

              {/* Fire extinguishers summary */}
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  {selectedNucleus.fireExtinguishers.length} extintor(es)
                </span>
              </div>

              {/* Expired items */}
              {selectedNucleus.fireExtinguishers.some(ext => ext.status === 'expired') && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-danger" />
                  <span className="text-sm text-danger">
                    {selectedNucleus.fireExtinguishers.filter(ext => ext.status === 'expired').length} extintor(es) vencido(s)
                  </span>
                </div>
              )}

              {/* Contact info */}
              {selectedNucleus.contact && (
                <div className="space-y-2 pt-2 border-t">
                  {selectedNucleus.contact.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs">{selectedNucleus.contact.phone}</span>
                    </div>
                  )}
                  {selectedNucleus.contact.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs">{selectedNucleus.contact.email}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  onClick={() => onViewDetails(selectedNucleus.id)}
                  className="flex-1"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Ver Detalhes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Nucleus list sidebar */}
      <div className="absolute top-4 right-4 w-64 bg-white rounded-lg shadow-lg border max-h-[500px] overflow-y-auto z-[1000]">
        <div className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Núcleos ({nuclei.length})
          </h3>
          <div className="space-y-2">
            {nuclei.map((nucleus) => (
              <button
                key={nucleus.id}
                onClick={() => setSelectedNucleus(nucleus)}
                className={`w-full text-left p-2 rounded text-xs hover:bg-muted transition-colors ${
                  selectedNucleus?.id === nucleus.id ? 'bg-primary/10 border-primary/20 border' : ''
                }`}
              >
                <div className="font-medium">{nucleus.name}</div>
                <div className="text-muted-foreground">{nucleus.city}</div>
                <div className="flex items-center gap-1 mt-1">
                  {nucleus.hydrants.length > 0 && (
                    <Badge variant="secondary" className="text-xs px-1 py-0">
                      Hidrante ({nucleus.hydrants.length})
                    </Badge>
                  )}
                  {nucleus.fireExtinguishers.some(ext => ext.status === 'expired') && (
                    <Badge variant="destructive" className="text-xs px-1 py-0">
                      Vencido
                    </Badge>
                  )}
                  {nucleus.fireExtinguishers.some(ext => ext.status === 'expiring-soon') && (
                    <Badge variant="outline" className="text-xs px-1 py-0 border-orange-500 text-orange-600">
                      Vencendo
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}