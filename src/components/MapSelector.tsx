import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MapPin } from 'lucide-react';

interface MapSelectorProps {
  onLocationSelect: (lat: number, lng: number) => void;
  initialCoordinates?: { lat: number; lng: number };
}

export function MapSelector({ onLocationSelect, initialCoordinates }: MapSelectorProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [selectedCoords, setSelectedCoords] = useState(initialCoordinates);
  const [isOpen, setIsOpen] = useState(false);
  const [mapboxToken, setMapboxToken] = useState('');
  const [tokenSubmitted, setTokenSubmitted] = useState(false);

  const handleTokenSubmit = () => {
    if (mapboxToken.trim()) {
      setTokenSubmitted(true);
    }
  };

  useEffect(() => {
    if (!mapContainer.current || !isOpen || !tokenSubmitted || !mapboxToken) return;

    // Initialize map
    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [initialCoordinates?.lng || -56.0979, initialCoordinates?.lat || -15.6014],
      zoom: 12,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add initial marker if coordinates exist
    if (initialCoordinates) {
      marker.current = new mapboxgl.Marker({ draggable: true })
        .setLngLat([initialCoordinates.lng, initialCoordinates.lat])
        .addTo(map.current);

      // Handle marker drag
      marker.current.on('dragend', () => {
        if (marker.current) {
          const lngLat = marker.current.getLngLat();
          setSelectedCoords({ lat: lngLat.lat, lng: lngLat.lng });
        }
      });
    }

    // Handle map clicks
    map.current.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      
      // Remove existing marker
      if (marker.current) {
        marker.current.remove();
      }

      // Add new marker
      marker.current = new mapboxgl.Marker({ draggable: true })
        .setLngLat([lng, lat])
        .addTo(map.current!);

      // Handle marker drag
      marker.current.on('dragend', () => {
        if (marker.current) {
          const lngLat = marker.current.getLngLat();
          setSelectedCoords({ lat: lngLat.lat, lng: lngLat.lng });
        }
      });

      setSelectedCoords({ lat, lng });
    });

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, [isOpen, tokenSubmitted, mapboxToken, initialCoordinates]);

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
        
        {!tokenSubmitted ? (
          <div className="flex items-center justify-center h-full">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Configurar Mapa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="mapbox-token">Token Público do Mapbox</Label>
                  <Input
                    id="mapbox-token"
                    type="text"
                    placeholder="pk.ey..."
                    value={mapboxToken}
                    onChange={(e) => setMapboxToken(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Obtenha seu token em{' '}
                    <a 
                      href="https://mapbox.com/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      mapbox.com
                    </a>
                  </p>
                </div>
                <Button onClick={handleTokenSubmit} className="w-full">
                  Carregar Mapa
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex flex-col gap-4 h-full">
            <div className="text-sm text-muted-foreground">
              Clique no mapa para selecionar a localização do núcleo. Você pode arrastar o marcador para ajustar a posição.
            </div>
            <div ref={mapContainer} className="flex-1 rounded-lg border" />
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
        )}
      </DialogContent>
    </Dialog>
  );
}