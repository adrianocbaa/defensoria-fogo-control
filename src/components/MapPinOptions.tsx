import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export type MapPinStyle = 'classic' | 'modern-gradient' | 'pin-3d' | 'pulsing' | 'minimalist' | 'completed' | 'in-progress';

interface MapPinOptionsProps {
  selectedStyle: MapPinStyle;
  onStyleChange: (style: MapPinStyle) => void;
}

interface PinStyleConfig {
  name: string;
  description: string;
  preview: (color: string, imageUrl?: string) => string;
  supportsImage?: boolean;
}

const pinStyles: Record<MapPinStyle, PinStyleConfig> = {
  classic: {
    name: 'Clássico Redondo',
    description: 'Pin redondo com imagem personalizada',
    supportsImage: true,
    preview: (color: string, imageUrl?: string) => `
      <div style="
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background-color: ${color};
        border: 3px solid white;
        box-shadow: 0 3px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      ">
        ${imageUrl ? `
          <img src="${imageUrl}" style="
            width: 16px;
            height: 16px;
            object-fit: contain;
            filter: brightness(0) invert(1);
          " />
        ` : `
          <div style="
            width: 8px;
            height: 8px;
            background: white;
            border-radius: 50%;
          "></div>
        `}
      </div>
    `
  },
  'modern-gradient': {
    name: 'Gradiente Moderno',
    description: 'Pin com gradiente e imagem personalizada',
    supportsImage: true,
    preview: (color: string, imageUrl?: string) => `
      <div style="
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: linear-gradient(135deg, ${color}, ${color}dd);
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      ">
        ${imageUrl ? `
          <img src="${imageUrl}" style="
            width: 16px;
            height: 16px;
            object-fit: contain;
            filter: brightness(0) invert(1);
          " />
        ` : `
          <div style="
            width: 8px;
            height: 8px;
            background: white;
            border-radius: 50%;
            opacity: 0.7;
          "></div>
        `}
      </div>
    `
  },
  'pin-3d': {
    name: 'Pin 3D',
    description: 'Pin tradicional com imagem personalizada',
    supportsImage: true,
    preview: (color: string, imageUrl?: string) => `
      <div style="
        width: 24px;
        height: 32px;
        position: relative;
        display: flex;
        align-items: flex-start;
        justify-content: center;
      ">
        <!-- Pin bottom point -->
        <div style="
          width: 0;
          height: 0;
          border-left: 12px solid transparent;
          border-right: 12px solid transparent;
          border-top: 12px solid ${color};
          position: absolute;
          bottom: 0;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
        "></div>
        <!-- Pin circle -->
        <div style="
          width: 20px;
          height: 20px;
          background: ${color};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          position: absolute;
          top: 0;
          overflow: hidden;
        ">
          ${imageUrl ? `
            <img src="${imageUrl}" style="
              width: 12px;
              height: 12px;
              object-fit: contain;
              filter: brightness(0) invert(1);
            " />
          ` : `
            <div style="
              width: 6px;
              height: 6px;
              background: white;
              border-radius: 50%;
            "></div>
          `}
        </div>
      </div>
    `
  },
  pulsing: {
    name: 'Pulsante',
    description: 'Pin com animação e imagem personalizada',
    supportsImage: true,
    preview: (color: string, imageUrl?: string) => `
      <div style="
        width: 24px;
        height: 24px;
        position: relative;
      ">
        <div style="
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background-color: ${color};
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          position: absolute;
          animation: pulse 2s infinite;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        ">
          ${imageUrl ? `
            <img src="${imageUrl}" style="
              width: 14px;
              height: 14px;
              object-fit: contain;
              filter: brightness(0) invert(1);
            " />
          ` : `
            <div style="
              width: 6px;
              height: 6px;
              background: white;
              border-radius: 50%;
            "></div>
          `}
        </div>
        <div style="
          width: 24px;
          height: 24px;
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
    description: 'Pin quadrado com imagem personalizada',
    supportsImage: true,
    preview: (color: string, imageUrl?: string) => `
      <div style="
        width: 20px;
        height: 20px;
        background-color: ${color};
        border: 2px solid white;
        border-radius: 4px;
        box-shadow: 0 3px 8px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      ">
        ${imageUrl ? `
          <img src="${imageUrl}" style="
            width: 12px;
            height: 12px;
            object-fit: contain;
            filter: brightness(0) invert(1);
          " />
        ` : `
          <div style="
            width: 6px;
            height: 6px;
            background: white;
            border-radius: 2px;
            opacity: 0.9;
          "></div>
        `}
      </div>
    `
  },
  completed: {
    name: 'Concluída',
    description: 'Pin personalizado para obras concluídas',
    supportsImage: true,
    preview: (color: string, imageUrl?: string) => `
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
        <!-- Content -->
        <div style="
          position: absolute;
          top: 6px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1;
        ">
          ${imageUrl ? `
            <img src="${imageUrl}" style="
              width: 12px;
              height: 12px;
              object-fit: contain;
              filter: brightness(0) invert(1);
            " />
          ` : `
            <div style="
              width: 6px;
              height: 6px;
              background: white;
              border-radius: 50%;
            "></div>
          `}
        </div>
      </div>
    `
  },
  'in-progress': {
    name: 'Em Andamento',
    description: 'Pin personalizado para obras em andamento',
    supportsImage: true,
    preview: (color: string, imageUrl?: string) => `
      <div style="
        width: 24px;
        height: 30px;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <!-- Pin teardrop shape -->
        <div style="
          width: 24px;
          height: 24px;
          background-color: ${color || '#3b82f6'};
          border: 2px solid white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 3px 6px rgba(0,0,0,0.3);
          position: absolute;
          top: 0;
        "></div>
        <!-- Content -->
        <div style="
          position: absolute;
          top: 6px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1;
        ">
          ${imageUrl ? `
            <img src="${imageUrl}" style="
              width: 12px;
              height: 12px;
              object-fit: contain;
              filter: brightness(0) invert(1);
            " />
          ` : `
            <div style="
              width: 6px;
              height: 6px;
              background: white;
              border-radius: 50%;
            "></div>
          `}
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
                {/* Preview dos pins com diferentes cores - Safe SVG rendering */}
                <div className="flex space-x-2 justify-center items-end h-12">
                  <div className="w-6 h-6 rounded-full bg-red-500 border-2 border-white shadow-sm" />
                  <div className="w-6 h-6 rounded-full bg-orange-500 border-2 border-white shadow-sm" />
                  <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-white shadow-sm" />
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
export const createCustomIcon = (color: string, style: MapPinStyle = 'classic', imageUrl?: string) => {
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
    html: pinStyles[style].preview(color, imageUrl),
    iconSize: getIconSize(style),
    iconAnchor: getIconAnchor(style),
  });
};