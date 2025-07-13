import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Nucleus } from '@/types/nucleus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

interface MapViewProps {
  nuclei: Nucleus[];
  onViewDetails: (nucleusId: string) => void;
}

export function MapView({ nuclei, onViewDetails }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [selectedNucleus, setSelectedNucleus] = useState<Nucleus | null>(null);
  const [mapboxToken, setMapboxToken] = useState('pk.eyJ1IjoiYWRyaWFub2NiYSIsImEiOiJjbWQwZzhpeXUxODhoMmpvamZjNjJkaWp4In0.JJXOdRVWf2yKoxlmk_8RNQ');
  const [tokenSubmitted, setTokenSubmitted] = useState(true);

  useEffect(() => {
    if (!mapContainer.current || !tokenSubmitted || !mapboxToken) return;

    // Initialize map
    console.log('Initializing map with token:', mapboxToken.substring(0, 20) + '...');
    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-55.6528, -15.6014], // Centro de Mato Grosso
      zoom: 6,
      attributionControl: false
    });

    // Add error handling
    map.current.on('error', (e) => {
      console.error('Mapbox error:', e);
    });

    map.current.on('load', () => {
      console.log('Map loaded successfully');
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Add markers for each nucleus
    nuclei.forEach((nucleus) => {
      // Validate coordinates before creating marker
      if (!nucleus.coordinates || 
          typeof nucleus.coordinates.lat !== 'number' || 
          typeof nucleus.coordinates.lng !== 'number' ||
          nucleus.coordinates.lat < -90 || 
          nucleus.coordinates.lat > 90 ||
          nucleus.coordinates.lng < -180 || 
          nucleus.coordinates.lng > 180) {
        console.warn(`Invalid coordinates for nucleus ${nucleus.name}:`, nucleus.coordinates);
        return; // Skip this marker
      }

      // Create marker element
      const markerElement = document.createElement('div');
      markerElement.className = 'marker';
      markerElement.style.backgroundColor = '#22c55e';
      markerElement.style.width = '20px';
      markerElement.style.height = '20px';
      markerElement.style.borderRadius = '50%';
      markerElement.style.border = '2px solid white';
      markerElement.style.cursor = 'pointer';
      markerElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

      // Add marker to map
      new mapboxgl.Marker(markerElement)
        .setLngLat([nucleus.coordinates.lng, nucleus.coordinates.lat])
        .addTo(map.current!);

      // Add click event
      markerElement.addEventListener('click', () => {
        setSelectedNucleus(nucleus);
      });
    });

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, [nuclei, tokenSubmitted, mapboxToken]);

  const handleTokenSubmit = () => {
    if (mapboxToken.trim()) {
      setTokenSubmitted(true);
    }
  };


  return (
    <div className="relative w-full h-[600px] border rounded-lg overflow-hidden">
      {/* Map container */}
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Nucleus info panel */}
      {selectedNucleus && (
        <div className="absolute top-4 left-4 w-80 bg-white rounded-lg shadow-lg border">
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
                <Droplets className={`h-4 w-4 ${selectedNucleus.hasHydrant ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="text-sm">
                  {selectedNucleus.hasHydrant ? 'Possui hidrante' : 'Sem hidrante'}
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
      <div className="absolute top-4 right-4 w-64 bg-white rounded-lg shadow-lg border max-h-[500px] overflow-y-auto">
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
                  {nucleus.hasHydrant && (
                    <Badge variant="secondary" className="text-xs px-1 py-0">
                      Hidrante
                    </Badge>
                  )}
                  {nucleus.fireExtinguishers.some(ext => ext.status === 'expired') && (
                    <Badge variant="destructive" className="text-xs px-1 py-0">
                      Vencido
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