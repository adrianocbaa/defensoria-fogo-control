import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SectorPageProps {
  title: string;
  description: string;
}

function SectorPage({ title, description }: SectorPageProps) {
  return (
    <SimpleHeader>
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title={title}
        />
        
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
    </SimpleHeader>
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