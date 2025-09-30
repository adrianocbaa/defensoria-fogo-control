import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNucleosCentral } from '@/hooks/useNucleosCentral';
import { useUserRole } from '@/hooks/useUserRole';
import { Pencil, Trash2, MapPin, Phone, Mail } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const NucleoCentralDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getNucleoById, deleteNucleo, loading } = useNucleosCentral();
  const { canEdit } = useUserRole();
  const nucleus = id ? getNucleoById(id) : null;
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!nucleus?.lat || !nucleus?.lng || !mapContainerRef.current) return;

    // Cleanup previous map
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Wait for the container to be fully rendered
    const initMap = () => {
      if (!mapContainerRef.current) return;

      // Initialize map with high zoom
      const map = L.map(mapContainerRef.current).setView([nucleus.lat!, nucleus.lng!], 17);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      // Add marker at nucleus location
      L.marker([nucleus.lat!, nucleus.lng!]).addTo(map);

      // Force map to recalculate size
      setTimeout(() => {
        map.invalidateSize();
      }, 100);

      mapRef.current = map;
    };

    // Use timeout to ensure DOM is ready
    const timer = setTimeout(initMap, 100);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [nucleus?.lat, nucleus?.lng]);

  if (loading) {
    return (
      <SimpleHeader>
        <div className="container mx-auto px-6 lg:px-8 py-8">
          <p>Carregando...</p>
        </div>
      </SimpleHeader>
    );
  }

  if (!nucleus) {
    return (
      <SimpleHeader>
        <div className="container mx-auto px-6 lg:px-8 py-8">
          <p>Núcleo não encontrado</p>
          <Button onClick={() => navigate('/nucleos-central')} className="mt-4">
            Voltar
          </Button>
        </div>
      </SimpleHeader>
    );
  }

  const handleDelete = async () => {
    try {
      await deleteNucleo(nucleus.id);
      navigate('/nucleos-central');
    } catch (error) {
      console.error('Error deleting nucleus:', error);
    }
  };

  return (
    <SimpleHeader>
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 lg:px-8 py-4 lg:py-6">
          <PageHeader
            title={nucleus.nome}
            subtitle={nucleus.cidade}
            actions={
              canEdit && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/nucleos-central/${nucleus.id}/editar`)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir este núcleo? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )
            }
          />
        </div>
      </div>

      <div className="container mx-auto px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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

              {nucleus.lat && nucleus.lng && (
                <div>
                  <p className="text-sm font-medium">Coordenadas</p>
                  <p className="text-sm text-muted-foreground">
                    Lat: {nucleus.lat}, Lng: {nucleus.lng}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mapa */}
          {nucleus.lat && nucleus.lng && (
            <Card>
              <CardHeader>
                <CardTitle>Localização</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  ref={mapContainerRef}
                  className="w-full h-64 rounded-lg border"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </SimpleHeader>
  );
};

export default NucleoCentralDetails;
