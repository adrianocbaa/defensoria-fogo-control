import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Waves } from 'lucide-react';

interface Submodulo {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  disabled?: boolean;
}

const submodulos: Submodulo[] = [
  {
    id: 'calhas',
    title: 'Calhas',
    description: 'Dimensionamento de calhas conforme NBR 10844',
    path: '/dimensionamento/calhas',
    icon: Waves,
    color: 'text-rose-600',
    bg: 'bg-rose-50 hover:bg-rose-100 border-rose-200',
  },
];

export default function Dimensionamento() {
  return (
    <SimpleHeader>
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Dimensionamento"
          subtitle="Sistemas de cálculo de dimensionamento para serviços de obra"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {submodulos.map((sub) => {
            const Icon = sub.icon;
            const content = (
              <Card className={`h-44 transition-all duration-200 ${sub.bg} ${sub.disabled ? 'opacity-60' : 'cursor-pointer'}`}>
                <CardContent className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <div className={`${sub.color} mb-3`}>
                    <Icon className="h-12 w-12" />
                  </div>
                  <h3 className={`text-lg font-semibold ${sub.color}`}>{sub.title}</h3>
                  <p className="text-xs text-muted-foreground mt-2">{sub.description}</p>
                  {sub.disabled && (
                    <p className="text-xs text-muted-foreground mt-1">Em desenvolvimento</p>
                  )}
                </CardContent>
              </Card>
            );

            return sub.disabled ? (
              <div key={sub.id}>{content}</div>
            ) : (
              <Link key={sub.id} to={sub.path} className="group">
                {content}
              </Link>
            );
          })}
        </div>
      </div>
    </SimpleHeader>
  );
}
