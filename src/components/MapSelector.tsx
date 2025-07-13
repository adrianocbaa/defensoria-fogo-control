import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
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
  const mapboxToken = 'pk.eyJ1IjoiYWRyaWFub2NiYSIsImEiOiJjbWQwZzhpeXUxODhoMmpvamZjNjJkaWp4In0.JJXOdRVWf2yKoxlmk_8RNQ';

  useEffect(() => {
    if (!mapContainer.current || !isOpen) return;

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
  }, [isOpen, mapboxToken, initialCoordinates]);

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
      </DialogContent>
    </Dialog>
  );
}