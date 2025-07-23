import { Layout } from '@/components/Layout';
import { Settings, Wrench, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Maintenance() {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Wrench className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manutenção</h1>
            <p className="text-muted-foreground">
              Ferramentas e configurações de manutenção do sistema
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações do Sistema
              </CardTitle>
              <CardDescription>
                Ajustes gerais e configurações do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Acesse as configurações gerais do sistema para ajustar parâmetros e comportamentos.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Status do Sistema
              </CardTitle>
              <CardDescription>
                Monitoramento e status dos serviços
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Monitore o status dos serviços e componentes do sistema em tempo real.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}