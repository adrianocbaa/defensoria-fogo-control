import { useParams, useNavigate } from 'react-router-dom';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNucleosCentral, useModuleVisibility, useModules } from '@/hooks/useNucleosCentral';
import { useUserRole } from '@/hooks/useUserRole';
import { Pencil, Trash2, MapPin, Phone, Mail, Eye } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

const NucleoCentralDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getNucleoById, deleteNucleo, loading } = useNucleosCentral();
  const { canEdit, isAdmin } = useUserRole();
  const nucleus = id ? getNucleoById(id) : null;
  const { modules } = useModules();
  const { isVisibleIn, toggleVisibility } = useModuleVisibility(id || '');

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
                  id="map-detail"
                  className="w-full h-64 rounded-lg border"
                  style={{
                    backgroundImage: `url(https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${nucleus.lng},${nucleus.lat},14,0/400x300@2x?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw)`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Visibilidade em Módulos (Admin apenas) */}
        {isAdmin && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Visibilidade em Módulos
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Controle em quais módulos este núcleo aparecerá nos mapas
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modules.map((module) => (
                  <div key={module.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`module-${module.key}`}
                      checked={isVisibleIn(module.key)}
                      onCheckedChange={() => toggleVisibility(module.key)}
                    />
                    <Label
                      htmlFor={`module-${module.key}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {module.name}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SimpleHeader>
  );
};

export default NucleoCentralDetails;
