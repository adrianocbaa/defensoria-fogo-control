import { SimpleHeader } from '@/components/SimpleHeader';
import { Building, Hammer, MapPin, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Obras() {
  return (
    <SimpleHeader>
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Building className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Obras</h1>
            <p className="text-muted-foreground">
              Gerenciamento e acompanhamento de obras e projetos
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hammer className="h-5 w-5" />
                Obras em Andamento
              </CardTitle>
              <CardDescription>
                Acompanhe o progresso das obras em execução
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Visualize e monitore todas as obras que estão sendo executadas atualmente.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Localizações
              </CardTitle>
              <CardDescription>
                Mapeamento das obras e projetos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Visualize a localização geográfica de todas as obras e projetos em desenvolvimento.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Cronograma
              </CardTitle>
              <CardDescription>
                Planejamento e prazos das obras
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Gerencie o cronograma, prazos e marcos importantes de cada projeto.
              </p>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </SimpleHeader>
  );
}