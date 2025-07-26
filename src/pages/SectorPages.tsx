import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SectorPageProps {
  title: string;
  description: string;
}

function SectorPage({ title, description }: SectorPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Painel do {title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {description}
            </p>
            <div className="bg-muted/50 p-6 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                Este painel está em desenvolvimento. 
                Em breve, todas as funcionalidades específicas do setor estarão disponíveis aqui.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Sector-specific pages
export function ManutencaoPage() {
  return (
    <SectorPage 
      title="Manutenção" 
      description="Gerencie solicitações de manutenção, tickets de serviço e acompanhe o status dos equipamentos."
    />
  );
}

export function ObraPage() {
  return (
    <SectorPage 
      title="Obra" 
      description="Controle projetos de construção, cronogramas de obras e acompanhe o progresso das edificações."
    />
  );
}

export function PreventivoPage() {
  return (
    <SectorPage 
      title="Preventivos de Incêndio" 
      description="Monitore extintores, hidrantes e equipamentos de prevenção contra incêndios."
    />
  );
}

export function ArCondicionadoPage() {
  return (
    <SectorPage 
      title="Ar Condicionado" 
      description="Gerencie manutenção de sistemas de climatização, contratos e cronogramas de serviços."
    />
  );
}

export function ProjetosPage() {
  return (
    <SectorPage 
      title="Projetos" 
      description="Acompanhe projetos em andamento, cronogramas e recursos alocados."
    />
  );
}