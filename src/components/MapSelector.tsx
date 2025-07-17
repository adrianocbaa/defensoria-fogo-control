import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MapPin } from 'lucide-react';

interface MapSelectorProps {
  onLocationSelect: (lat: number, lng: number) => void;
  initialCoordinates?: { lat: number; lng: number };
  address?: string; // Para geocoding automático
}

export function MapSelector({ onLocationSelect, initialCoordinates, address }: MapSelectorProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [selectedCoords, setSelectedCoords] = useState(initialCoordinates);
  const [isOpen, setIsOpen] = useState(false);
  const mapboxToken = 'pk.eyJ1IjoiYWRyaWFub2NiYSIsImEiOiJjbWQwZzhpeXUxODhoMmpvamZjNjJkaWp4In0.JJXOdRVWf2yKoxlmk_8RNQ';

  // Geocoding automático baseado no endereço
  useEffect(() => {
    if (address && !initialCoordinates) {
      const geocodeAddress = async () => {
        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}&language=pt`
          );
          const data = await response.json();
          
          if (data.features && data.features.length > 0) {
            const [lng, lat] = data.features[0].center;
            setSelectedCoords({ lat, lng });
          }
        } catch (error) {
          console.error('Erro no geocoding:', error);
        }
      };
      
      geocodeAddress();
    }
  }, [address, initialCoordinates, mapboxToken]);

  useEffect(() => {
    if (!isOpen) return;

    const initializeMap = () => {
      if (!mapContainer.current) return;

      // Initialize map
      mapboxgl.accessToken = mapboxToken;
      
      const centerLng = selectedCoords?.lng || initialCoordinates?.lng || -56.0979;
      const centerLat = selectedCoords?.lat || initialCoordinates?.lat || -15.6014;
      const zoomLevel = selectedCoords || initialCoordinates ? 16 : 12; // Zoom máximo quando há endereço
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [centerLng, centerLat],
        zoom: zoomLevel,
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add initial marker if coordinates exist
      const coords = selectedCoords || initialCoordinates;
      if (coords) {
        marker.current = new mapboxgl.Marker({ draggable: true })
          .setLngLat([coords.lng, coords.lat])
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
    };

    // Add a small delay to ensure the container is properly rendered
    const timer = setTimeout(initializeMap, 100);

    // Cleanup
    return () => {
      clearTimeout(timer);
      map.current?.remove();
    };
  }, [isOpen, mapboxToken, initialCoordinates, selectedCoords]);

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