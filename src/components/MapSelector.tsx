import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MapPin } from 'lucide-react';

// Fix for default markers in React Leaflet
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

// Component to handle map clicks
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng);
    },
  });
  
  return null;
}

export function MapSelector({ onLocationSelect, initialCoordinates, address }: MapSelectorProps) {
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

  const handleLocationClick = (lat: number, lng: number) => {
    setSelectedCoords({ lat, lng });
  };

  const handleConfirm = () => {
    if (selectedCoords) {
      onLocationSelect(selectedCoords.lat, selectedCoords.lng);
      setIsOpen(false);
    }
  };

  const mapCenter: [number, number] = selectedCoords 
    ? [selectedCoords.lat, selectedCoords.lng]
    : [-15.6014, -55.6528]; // Centro de Mato Grosso (default)

  const mapZoom = selectedCoords || initialCoordinates ? 16 : 12;

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
            Clique no mapa para selecionar a localização do núcleo.
          </div>
          
          <div className="flex-1 rounded-lg border overflow-hidden">
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              className="leaflet-container"
              key={`${mapCenter[0]}-${mapCenter[1]}-${isOpen}`} // Force re-render when center changes or dialog opens
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapClickHandler onLocationSelect={handleLocationClick} />
              
              {selectedCoords && (
                <Marker
                  position={[selectedCoords.lat, selectedCoords.lng]}
                />
              )}
            </MapContainer>
          </div>
          
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