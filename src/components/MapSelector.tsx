import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MapPin } from 'lucide-react';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapSelectorProps {
  onLocationSelect: (lat: number, lng: number) => void;
  initialCoordinates?: { lat: number; lng: number };
  address?: string; // Para geocoding automático
}

export function MapSelector({ onLocationSelect, initialCoordinates, address }: MapSelectorProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(
    initialCoordinates || null
  );

  // Geocoding automático baseado no endereço usando Nominatim (OpenStreetMap)
  useEffect(() => {
    if (address && !initialCoordinates) {
      const geocodeAddress = async () => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
          );
          const data = await response.json();
          
          if (data && data.length > 0) {
            const { lat, lon } = data[0];
            setSelectedCoords({ lat: parseFloat(lat), lng: parseFloat(lon) });
          }
        } catch (error) {
          console.error('Erro no geocoding:', error);
        }
      };
      
      geocodeAddress();
    }
  }, [address, initialCoordinates]);

  useEffect(() => {
    console.log('MapSelector useEffect triggered:', { isOpen, hasContainer: !!mapContainer.current });
    
    if (!isOpen || !mapContainer.current) {
      console.log('Early return - isOpen:', isOpen, 'hasContainer:', !!mapContainer.current);
      return;
    }

    // Add a small delay to ensure the modal is fully rendered
    const timeout = setTimeout(() => {
      console.log('Timeout executed, container check:', !!mapContainer.current);
      
      if (!mapContainer.current) {
        console.log('No container available after timeout');
        return;
      }

      // Check container dimensions
      const rect = mapContainer.current.getBoundingClientRect();
      console.log('Container dimensions:', rect);

      // Clean up any existing map instance
      if (map.current) {
        console.log('Removing existing map');
        map.current.remove();
        map.current = null;
      }

      const mapCenter: [number, number] = selectedCoords 
        ? [selectedCoords.lat, selectedCoords.lng]
        : [-15.6014, -55.6528]; // Centro de Mato Grosso (default)

      const mapZoom = selectedCoords || initialCoordinates ? 16 : 12;

      console.log('Initializing Leaflet map:', { mapCenter, mapZoom });

      try {
        // Initialize map
        map.current = L.map(mapContainer.current, {
          preferCanvas: true,
          zoomControl: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          boxZoom: true,
          keyboard: true,
          attributionControl: true
        }).setView(mapCenter, mapZoom);

        console.log('Map instance created:', !!map.current);

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
          detectRetina: true
        }).addTo(map.current);

        console.log('Tile layer added');

        // Force map resize after initialization with multiple attempts
        setTimeout(() => {
          if (map.current) {
            console.log('First invalidateSize call');
            map.current.invalidateSize();
            map.current.getContainer().style.height = '400px';
          }
        }, 100);

        setTimeout(() => {
          if (map.current) {
            console.log('Second invalidateSize call');
            map.current.invalidateSize();
          }
        }, 500);
      } catch (error) {
        console.error('Error initializing map:', error);
      }

      // Add initial marker if coordinates exist
      if (selectedCoords) {
        marker.current = L.marker([selectedCoords.lat, selectedCoords.lng], { draggable: true })
          .addTo(map.current);

        // Handle marker drag
        marker.current.on('dragend', () => {
          if (marker.current) {
            const { lat, lng } = marker.current.getLatLng();
            setSelectedCoords({ lat, lng });
          }
        });
      }

      // Handle map clicks
      map.current.on('click', (e) => {
        const { lat, lng } = e.latlng;
        
        // Remove existing marker
        if (marker.current) {
          marker.current.remove();
        }

        // Add new marker
        marker.current = L.marker([lat, lng], { draggable: true })
          .addTo(map.current!);

        // Handle marker drag
        marker.current.on('dragend', () => {
          if (marker.current) {
            const { lat, lng } = marker.current.getLatLng();
            setSelectedCoords({ lat, lng });
          }
        });

        setSelectedCoords({ lat, lng });
      });
    }, 500); // Longer delay to ensure modal is fully rendered

    // Cleanup
    return () => {
      clearTimeout(timeout);
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      if (marker.current) {
        marker.current = null;
      }
    };
  }, [isOpen]);

  const handleConfirm = () => {
    if (selectedCoords) {
      onLocationSelect(selectedCoords.lat, selectedCoords.lng);
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="w-full">
          <MapPin className="h-4 w-4 mr-2" />
          {selectedCoords 
            ? `Localização: ${selectedCoords.lat.toFixed(6)}, ${selectedCoords.lng.toFixed(6)}`
            : 'Selecionar no Mapa'
          }
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl h-[600px]">
        <DialogHeader>
          <DialogTitle>Selecionar Localização no Mapa</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 h-full">
          <div className="text-sm text-muted-foreground">
            Clique no mapa para selecionar a localização do núcleo. Você pode arrastar o marcador para ajustar a posição.
          </div>
          
          <div 
            ref={mapContainer} 
            className="flex-1 rounded-lg border min-h-[400px] w-full relative"
            style={{ 
              height: '400px',
              minHeight: '400px',
              width: '100%',
              zIndex: 1
            }}
          />
          
          {selectedCoords && (
            <div className="text-sm">
              <strong>Coordenadas selecionadas:</strong><br />
              Latitude: {selectedCoords.lat.toFixed(6)}<br />
              Longitude: {selectedCoords.lng.toFixed(6)}
            </div>
          )}
          
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={!selectedCoords}>
              Confirmar Localização
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}