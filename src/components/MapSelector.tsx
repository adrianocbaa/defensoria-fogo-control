import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MapPin, Navigation, Search, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const { toast } = useToast();

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

  // Função para buscar endereço
  const handleAddressSearch = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Campo vazio",
        description: "Digite um endereço ou CEP para buscar.",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}&limit=1&countrycodes=BR`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const newCoords = { lat: parseFloat(lat), lng: parseFloat(lon) };
        setSelectedCoords(newCoords);
        
        // Centralizar o mapa na nova localização
        if (map.current) {
          map.current.setView([newCoords.lat, newCoords.lng], 16);
          
          // Remove marcador existente
          if (marker.current) {
            marker.current.remove();
          }
          
          // Adiciona novo marcador
          marker.current = L.marker([newCoords.lat, newCoords.lng], { draggable: true })
            .addTo(map.current);
            
          marker.current.on('dragend', () => {
            if (marker.current) {
              const { lat, lng } = marker.current.getLatLng();
              setSelectedCoords({ lat, lng });
            }
          });
        }
        
        toast({
          title: "Localização encontrada",
          description: "A localização foi encontrada no mapa.",
        });
      } else {
        toast({
          title: "Localização não encontrada",
          description: "Não foi possível encontrar a localização. Tente um endereço mais específico.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erro na busca:', error);
      toast({
        title: "Erro na busca",
        description: "Ocorreu um erro ao buscar a localização. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Função para usar localização atual
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocalização não suportada",
        description: "Seu navegador não suporta geolocalização.",
        variant: "destructive",
      });
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newCoords = { lat: latitude, lng: longitude };
        setSelectedCoords(newCoords);
        
        // Centralizar o mapa na localização atual
        if (map.current) {
          map.current.setView([latitude, longitude], 16);
          
          // Remove marcador existente
          if (marker.current) {
            marker.current.remove();
          }
          
          // Adiciona novo marcador
          marker.current = L.marker([latitude, longitude], { draggable: true })
            .addTo(map.current);
            
          marker.current.on('dragend', () => {
            if (marker.current) {
              const { lat, lng } = marker.current.getLatLng();
              setSelectedCoords({ lat, lng });
            }
          });
        }
        
        setIsGettingLocation(false);
        toast({
          title: "Localização obtida",
          description: "Sua localização atual foi marcada no mapa.",
        });
      },
      (error) => {
        setIsGettingLocation(false);
        let message = "Não foi possível obter sua localização.";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = "Acesso à localização negado. Verifique as permissões do navegador.";
            break;
          case error.POSITION_UNAVAILABLE:
            message = "Localização indisponível.";
            break;
          case error.TIMEOUT:
            message = "Tempo limite para obter localização excedido.";
            break;
        }
        
        toast({
          title: "Erro de geolocalização",
          description: message,
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    if (!isOpen) return;

    // Wait for the modal to be fully rendered and accessible
    const initializeMap = () => {
      if (!mapContainer.current) {
        // If container is not ready, try again in next frame
        requestAnimationFrame(initializeMap);
        return;
      }

      // Clean up any existing map instance
      if (map.current) {
        map.current.remove();
        map.current = null;
      }

      const mapCenter: [number, number] = selectedCoords 
        ? [selectedCoords.lat, selectedCoords.lng]
        : [-15.6014, -55.6528]; // Centro de Mato Grosso (default)

      const mapZoom = selectedCoords || initialCoordinates ? 16 : 12;

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

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
          detectRetina: true
        }).addTo(map.current);

        // Force map resize after initialization
        setTimeout(() => {
          if (map.current) {
            map.current.invalidateSize();
          }
        }, 100);

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
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    // Start initialization with a delay to ensure modal is rendered
    const timeout = setTimeout(initializeMap, 500);

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
  }, [isOpen, selectedCoords, initialCoordinates]);

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
          {/* Controles de busca */}
          <div className="flex flex-col gap-3">
            <div className="text-sm text-muted-foreground">
              Use os controles abaixo para encontrar uma localização, ou clique diretamente no mapa.
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="Digite um endereço, CEP ou ponto de referência..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddressSearch()}
                  className="flex-1"
                />
                <Button 
                  type="button"
                  onClick={handleAddressSearch}
                  disabled={isSearching}
                  size="sm"
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleUseCurrentLocation}
                disabled={isGettingLocation}
                size="sm"
                className="whitespace-nowrap"
              >
                {isGettingLocation ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Navigation className="h-4 w-4 mr-2" />
                )}
                Minha Localização
              </Button>
            </div>
          </div>
          
          <div 
            ref={mapContainer} 
            className="flex-1 rounded-lg border min-h-[350px] w-full relative"
            style={{ 
              height: '350px',
              minHeight: '350px',
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