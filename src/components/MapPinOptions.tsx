import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export type MapPinStyle = 'classic' | 'modern-gradient' | 'pin-3d' | 'pulsing' | 'minimalist' | 'completed' | 'in-progress';

interface MapPinOptionsProps {
  selectedStyle: MapPinStyle;
  onStyleChange: (style: MapPinStyle) => void;
}

const pinStyles = {
  classic: {
    name: 'Clássico Redondo',
    description: 'Pin redondo simples e limpo',
    preview: (color: string) => `
      <div style="
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background-color: ${color};
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>
    `
  },
  'modern-gradient': {
    name: 'Gradiente Moderno',
    description: 'Pin com gradiente e sombra suave',
    preview: (color: string) => `
      <div style="
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: linear-gradient(135deg, ${color}, ${color}dd);
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1);
        position: relative;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 4px;
          left: 4px;
          opacity: 0.7;
        "></div>
      </div>
    `
  },
  'pin-3d': {
    name: 'Pin 3D',
    description: 'Pin tradicional com efeito 3D',
    preview: (color: string) => `
      <div style="
        width: 0;
        height: 0;
        border-left: 12px solid transparent;
        border-right: 12px solid transparent;
        border-top: 20px solid ${color};
        position: relative;
        filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));
      ">
        <div style="
          width: 14px;
          height: 14px;
          background: ${color};
          border: 2px solid white;
          border-radius: 50%;
          position: absolute;
          top: -26px;
          left: -9px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.15);
        "></div>
      </div>
    `
  },
  pulsing: {
    name: 'Pulsante',
    description: 'Pin com animação pulsante',
    preview: (color: string) => `
      <div style="
        width: 20px;
        height: 20px;
        position: relative;
      ">
        <div style="
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: ${color};
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          position: absolute;
          animation: pulse 2s infinite;
        "></div>
        <div style="
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: ${color}40;
          position: absolute;
          animation: pulse-ring 2s infinite;
        "></div>
      </div>
      <style>
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.3; }
          100% { transform: scale(2); opacity: 0; }
        }
      </style>
    `
  },
  minimalist: {
    name: 'Minimalista',
    description: 'Pin quadrado moderno e minimalista',
    preview: (color: string) => `
      <div style="
        width: 18px;
        height: 18px;
        background-color: ${color};
        border: 2px solid white;
        border-radius: 4px;
        box-shadow: 0 3px 8px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08);
        position: relative;
        transform: rotate(45deg);
      ">
        <div style="
          width: 6px;
          height: 6px;
          background: white;
          border-radius: 2px;
          position: absolute;
          top: 4px;
          left: 4px;
          opacity: 0.9;
        "></div>
      </div>
    `
  },
  completed: {
    name: 'Concluída',
    description: 'Pin personalizado para obras concluídas',
    preview: (color: string) => `
      <div style="
        width: 24px;
        height: 30px;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <!-- Pin shape -->
        <div style="
          width: 24px;
          height: 24px;
          background-color: ${color || '#22c55e'};
          border: 2px solid white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          position: absolute;
          top: 0;
        "></div>
        <!-- Check icon -->
        <div style="
          position: absolute;
          top: 6px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1;
        ">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9,11 12,14 22,4"></polyline>
          </svg>
        </div>
      </div>
    `
  },
  'in-progress': {
    name: 'Em Andamento',
    description: 'Pin personalizado para obras em andamento',
    preview: (color: string) => `
      <div style="
        width: 24px;
        height: 30px;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <!-- Pin shape -->
        <div style="
          width: 24px;
          height: 24px;
          background-color: ${color || '#3b82f6'};
          border: 2px solid white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          position: absolute;
          top: 0;
        "></div>
        <!-- Progress icon (Triangle play/work icon) -->
        <div style="
          position: absolute;
          top: 6px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1;
        ">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
            <polygon points="5,3 19,12 5,21"></polygon>
          </svg>
        </div>
      </div>
    `
  }
};

export function MapPinOptions({ selectedStyle, onStyleChange }: MapPinOptionsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Escolha o estilo do pin do mapa:</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(pinStyles).map(([key, style]) => (
          <Card 
            key={key}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedStyle === key ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => onStyleChange(key as MapPinStyle)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{style.name}</CardTitle>
                {selectedStyle === key && (
                  <Badge variant="default" className="text-xs">Selecionado</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-3">
                {/* Preview dos pins com diferentes cores */}
                <div className="flex space-x-2 justify-center items-end h-12">
                  <div dangerouslySetInnerHTML={{ 
                    __html: style.preview('#ef4444') 
                  }} />
                  <div dangerouslySetInnerHTML={{ 
                    __html: style.preview('#f97316') 
                  }} />
                  <div dangerouslySetInnerHTML={{ 
                    __html: style.preview('#22c55e') 
                  }} />
                </div>
                
                <p className="text-xs text-muted-foreground text-center">
                  {style.description}
                </p>
                
                <Button 
                  size="sm" 
                  variant={selectedStyle === key ? "default" : "outline"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStyleChange(key as MapPinStyle);
                  }}
                  className="w-full"
                >
                  {selectedStyle === key ? 'Selecionado' : 'Escolher'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Função para gerar o ícone customizado baseado no estilo escolhido
export const createCustomIcon = (color: string, style: MapPinStyle = 'classic') => {
  const L = (window as any).L;
  
  const getIconSize = (style: MapPinStyle) => {
    if (style === 'pin-3d') return [24, 32];
    if (style === 'completed' || style === 'in-progress') return [24, 30];
    return [24, 24];
  };
  
  const getIconAnchor = (style: MapPinStyle) => {
    if (style === 'pin-3d') return [12, 32];
    if (style === 'completed' || style === 'in-progress') return [12, 30];
    return [12, 12];
  };
  
  return L.divIcon({
    className: 'custom-marker',
    html: pinStyles[style].preview(color),
    iconSize: getIconSize(style),
    iconAnchor: getIconAnchor(style),
  });
};