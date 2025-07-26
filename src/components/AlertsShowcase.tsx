import { AlertCircle, CheckCircle, Info, AlertTriangle, Bell, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AlertsShowcase() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Alertas</h1>
        <p className="text-muted-foreground">
          Componentes de alerta com cores contextuais e ícones
        </p>
      </div>

      {/* Default Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas Padrão</CardTitle>
          <CardDescription>
            Alertas com cores de fundo contextuais.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="info">
            <Info className="h-4 w-4" />
            <AlertTitle>Informação!</AlertTitle>
            <AlertDescription>
              Um alerta simples de informação—confira!
            </AlertDescription>
          </Alert>

          <Alert variant="secondary">
            <Bell className="h-4 w-4" />
            <AlertTitle>Notificação!</AlertTitle>
            <AlertDescription>
              Um alerta secundário simples—confira!
            </AlertDescription>
          </Alert>

          <Alert variant="success">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Sucesso!</AlertTitle>
            <AlertDescription>
              Um alerta de sucesso simples—confira!
            </AlertDescription>
          </Alert>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Perigo!</AlertTitle>
            <AlertDescription>
              Um alerta de perigo simples—confira!
            </AlertDescription>
          </Alert>

          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atenção!</AlertTitle>
            <AlertDescription>
              Um alerta de aviso simples—confira!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Outline Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas com Contorno</CardTitle>
          <CardDescription>
            Alertas com fundo de ícone contextual.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="outline-info">
            <Info className="h-4 w-4" />
            <AlertTitle>Informação!</AlertTitle>
            <AlertDescription>
              Um alerta de informação simples—confira!
            </AlertDescription>
          </Alert>

          <Alert variant="outline">
            <Bell className="h-4 w-4" />
            <AlertTitle>Notificação!</AlertTitle>
            <AlertDescription>
              Um alerta secundário simples—confira!
            </AlertDescription>
          </Alert>

          <Alert variant="outline-success">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Sucesso!</AlertTitle>
            <AlertDescription>
              Um alerta de sucesso simples—confira!
            </AlertDescription>
          </Alert>

          <Alert variant="outline-destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Perigo!</AlertTitle>
            <AlertDescription>
              Um alerta de perigo simples—confira!
            </AlertDescription>
          </Alert>

          <Alert variant="outline-warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atenção!</AlertTitle>
            <AlertDescription>
              Um alerta de aviso simples—confira!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Alerts with Additional Content */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas com Conteúdo Adicional</CardTitle>
          <CardDescription>
            Alertas com conteúdo mais elaborado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="success">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle className="text-lg">Bem feito!</AlertTitle>
            <AlertDescription className="mt-2">
              Perfeito, você leu com sucesso esta mensagem de alerta importante. 
              Este texto de exemplo vai se estender um pouco mais para que você possa 
              ver como o espaçamento dentro de um alerta funciona com este tipo de conteúdo.
              <hr className="my-3 border-green-200" />
              Sempre que precisar, certifique-se de usar utilitários de margem para 
              manter o conteúdo bem organizado e alinhado.
            </AlertDescription>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline">
                Visualizar Detalhes
              </Button>
              <Button size="sm" variant="ghost">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Alert>

          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-lg">Atenção Necessária!</AlertTitle>
            <AlertDescription className="mt-2">
              Este é um alerta de aviso que requer sua atenção imediata. 
              Algumas ações podem ser necessárias para resolver esta situação.
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>Verificar configurações do sistema</li>
                <li>Contatar o administrador se necessário</li>
                <li>Revisar logs de atividade</li>
              </ul>
            </AlertDescription>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline">
                Resolver Agora
              </Button>
              <Button size="sm" variant="ghost">
                Lembrar Mais Tarde
              </Button>
            </div>
          </Alert>
        </CardContent>
      </Card>

      {/* Real-world Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Exemplos de Manutenção</CardTitle>
          <CardDescription>
            Alertas contextuais para o sistema de manutenção.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Equipamento Crítico Fora de Operação</AlertTitle>
            <AlertDescription>
              O sistema de ar condicionado do Auditório Principal está apresentando falhas graves. 
              Intervenção imediata necessária.
            </AlertDescription>
          </Alert>

          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Manutenção Preventiva Atrasada</AlertTitle>
            <AlertDescription>
              3 equipamentos estão com manutenção preventiva em atraso há mais de 30 dias.
            </AlertDescription>
          </Alert>

          <Alert variant="info">
            <Info className="h-4 w-4" />
            <AlertTitle>Nova Solicitação de Serviço</AlertTitle>
            <AlertDescription>
              Chamado #4359 foi criado para reparo elétrico na Sala 105.
            </AlertDescription>
          </Alert>

          <Alert variant="success">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Meta Mensal Atingida</AlertTitle>
            <AlertDescription>
              Parabéns! 98% dos chamados foram resolvidos dentro do prazo este mês.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}