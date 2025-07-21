import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNuclei } from '@/contexts/NucleiContext';

export default function NucleusDetails() {
  console.log('NucleusDetails: COMPONENT STARTING');
  
  const { id } = useParams<{ id: string }>();
  console.log('NucleusDetails: ID =', id);
  
  const navigate = useNavigate();
  console.log('NucleusDetails: navigate obtained');
  
  const { getNucleusById } = useNuclei();
  console.log('NucleusDetails: getNucleusById obtained');
  
  const nucleus = getNucleusById(id || '');
  console.log('NucleusDetails: nucleus =', nucleus ? 'FOUND' : 'NOT FOUND');
  
  if (!nucleus) {
    console.log('NucleusDetails: Showing not found page');
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Núcleo não encontrado</h1>
            <p className="text-muted-foreground mb-4">O núcleo solicitado não foi encontrado.</p>
            <Button onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao início
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  console.log('NucleusDetails: About to render main content');
  
  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{nucleus.name}</h1>
            <p className="text-muted-foreground">{nucleus.city} - {nucleus.address}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Detalhes do Núcleo</h2>
          <p><strong>Nome:</strong> {nucleus.name}</p>
          <p><strong>Cidade:</strong> {nucleus.city}</p>
          <p><strong>Endereço:</strong> {nucleus.address}</p>
          <p><strong>Extintores:</strong> {nucleus.fireExtinguishers.length}</p>
          <p><strong>Hidrantes:</strong> {nucleus.hydrants.length}</p>
        </div>
      </div>
    </Layout>
  );
}