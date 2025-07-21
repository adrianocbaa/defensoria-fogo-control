import React, { useState } from 'react';
import { Layout } from '@/components/Layout';
import { MapPinOptions, MapPinStyle } from '@/components/MapPinOptions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MapPinSelector() {
  const [selectedStyle, setSelectedStyle] = useState<MapPinStyle>('classic');
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleApplyStyle = () => {
    // Aqui você pode salvar a preferência no localStorage ou contexto global
    localStorage.setItem('mapPinStyle', selectedStyle);
    
    toast({
      title: "Estilo do pin atualizado!",
      description: "O novo estilo será aplicado em todos os mapas.",
    });
    
    // Voltar para a página anterior ou principal
    navigate(-1);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Personalizar Pins do Mapa</h1>
            <p className="text-muted-foreground">Escolha um estilo moderno para os marcadores do mapa</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Opções de Pin */}
          <Card>
            <CardHeader>
              <CardTitle>Estilos Disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <MapPinOptions 
                selectedStyle={selectedStyle}
                onStyleChange={setSelectedStyle}
              />
            </CardContent>
          </Card>

          {/* Preview com descrição detalhada */}
          <Card>
            <CardHeader>
              <CardTitle>Preview e Características</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-2">Estilo Selecionado:</h4>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">
                      {selectedStyle === 'classic' && 'Clássico Redondo'}
                      {selectedStyle === 'modern-gradient' && 'Gradiente Moderno'}
                      {selectedStyle === 'pin-3d' && 'Pin 3D'}
                      {selectedStyle === 'pulsing' && 'Pulsante'}
                      {selectedStyle === 'minimalist' && 'Minimalista'}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      {selectedStyle === 'classic' && 'Pin tradicional com design limpo e simples'}
                      {selectedStyle === 'modern-gradient' && 'Gradiente elegante com destaque visual e sombra suave'}
                      {selectedStyle === 'pin-3d' && 'Formato tradicional de pin com efeito tridimensional'}
                      {selectedStyle === 'pulsing' && 'Animação pulsante para chamar atenção'}
                      {selectedStyle === 'minimalist' && 'Design quadrado moderno e minimalista'}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Cores Utilizadas:</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded"></div>
                      <span className="text-sm">Vermelho - Núcleos com problemas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-orange-500 rounded"></div>
                      <span className="text-sm">Laranja - Núcleos com itens vencendo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <span className="text-sm">Verde - Núcleos em dia</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botão de aplicar */}
          <div className="flex justify-center">
            <Button 
              onClick={handleApplyStyle}
              size="lg"
              className="min-w-48"
            >
              Aplicar Estilo Selecionado
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}