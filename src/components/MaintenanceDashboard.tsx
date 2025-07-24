import { AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MaintenanceTimeline } from '@/components/MaintenanceTimeline';
import { MaintenanceMap } from '@/components/MaintenanceMap';
import { KanbanBoard } from '@/components/KanbanBoard';

interface MaintenanceDashboardProps {
  activeSection?: string;
}

export function MaintenanceDashboard({ activeSection = 'overview' }: MaintenanceDashboardProps) {
  if (activeSection === 'tickets') {
    return <KanbanBoard />;
  }
  const stats = [
    {
      title: 'Chamados Abertos',
      value: '12',
      description: 'Aguardando atendimento',
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Chamados Resolvidos',
      value: '24',
      description: 'Concluídos esta semana',
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Em Atraso',
      value: '3',
      description: 'Necessitam atenção',
      icon: Clock,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Taxa de Resolução',
      value: '85%',
      description: 'Últimos 30 dias',
      icon: TrendingUp,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel de Manutenção</h1>
        <p className="text-muted-foreground">
          Visão geral dos chamados e atividades de manutenção
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-md ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Timeline Component */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Planejamento de Viagens</CardTitle>
            <CardDescription>
              Cronograma de visitas técnicas e manutenções
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MaintenanceTimeline />
          </CardContent>
        </Card>

        {/* Map Component */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Mapa de Chamados</CardTitle>
            <CardDescription>
              Visualização geográfica dos chamados por localização
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MaintenanceMap />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Atividades Recentes</CardTitle>
          <CardDescription>
            Últimas atualizações dos chamados de manutenção
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                id: '#4356',
                type: 'Elétrica',
                location: 'Sala 201 - 2º Andar',
                status: 'Em Progresso',
                time: '10 min atrás',
                priority: 'Alta'
              },
              {
                id: '#4357',
                type: 'Hidráulica',
                location: 'Banheiro Masculino - 1º Andar',
                status: 'Novo',
                time: '25 min atrás',
                priority: 'Normal'
              },
              {
                id: '#4358',
                type: 'Ar Condicionado',
                location: 'Auditório Principal',
                status: 'Resolvido',
                time: '1h atrás',
                priority: 'Baixa'
              }
            ].map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <div>
                    <p className="font-medium text-sm">
                      {activity.id} - {activity.type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.location}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium">{activity.status}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}