import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eraser, Save, Upload } from 'lucide-react';

interface SignatureCanvasProps {
  onSave: (signatureData: {
    dataUrl: string;
    nome: string;
    cargo: string;
    documento: string;
  }) => Promise<void>;
  title: string;
  existingSignature?: {
    url: string;
    nome: string;
    cargo: string;
    documento: string;
    datetime: string;
  } | null;
  disabled?: boolean;
}

export function SignatureCanvas({ onSave, title, existingSignature, disabled }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [nome, setNome] = useState(existingSignature?.nome || '');
  const [cargo, setCargo] = useState(existingSignature?.cargo || '');
  const [documento, setDocumento] = useState(existingSignature?.documento || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = 200;

    // Set drawing styles
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled || existingSignature) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled || existingSignature) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = async () => {
    if (!nome || !cargo || !documento) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check if canvas has content
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasContent = imageData.data.some((channel) => channel !== 0);

    if (!hasContent) {
      toast.error('Desenhe sua assinatura antes de salvar');
      return;
    }

    setIsSaving(true);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      await onSave({ dataUrl, nome, cargo, documento });
    } catch (error) {
      console.error('Erro ao salvar assinatura:', error);
      toast.error('Erro ao salvar assinatura');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, envie uma imagem');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (existingSignature) {
    return (
      <Card className="p-4">
        <h3 className="font-semibold mb-4">{title}</h3>
        <div className="space-y-3">
          <div className="border rounded-lg p-2 bg-background">
            <img 
              src={existingSignature.url} 
              alt="Assinatura" 
              className="w-full h-32 object-contain"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Nome:</span>
              <p className="font-medium">{existingSignature.nome}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Cargo:</span>
              <p className="font-medium">{existingSignature.cargo}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Documento:</span>
              <p className="font-medium">{existingSignature.documento}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Assinado em:</span>
              <p className="font-medium">
                {new Date(existingSignature.datetime).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">{title}</h3>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor={`nome-${title}`}>Nome *</Label>
            <Input
              id={`nome-${title}`}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome completo"
              disabled={disabled}
            />
          </div>
          <div>
            <Label htmlFor={`cargo-${title}`}>Cargo *</Label>
            <Input
              id={`cargo-${title}`}
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              placeholder="Cargo/Função"
              disabled={disabled}
            />
          </div>
          <div>
            <Label htmlFor={`documento-${title}`}>CREA/CPF/ID *</Label>
            <Input
              id={`documento-${title}`}
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              placeholder="Documento"
              disabled={disabled}
            />
          </div>
        </div>

        <div>
          <Label>Assinatura *</Label>
          <div className="border-2 border-dashed rounded-lg bg-background">
            <canvas
              ref={canvasRef}
              className="w-full touch-none cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Desenhe sua assinatura acima usando o mouse ou touch
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearCanvas}
            disabled={disabled}
          >
            <Eraser className="w-4 h-4 mr-2" />
            Limpar
          </Button>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => document.getElementById(`file-upload-${title}`)?.click()}
            disabled={disabled}
          >
            <Upload className="w-4 h-4 mr-2" />
            Enviar Imagem
          </Button>
          <input
            id={`file-upload-${title}`}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={handleFileUpload}
          />

          <Button
            type="button"
            onClick={handleSave}
            disabled={disabled || isSaving}
            className="ml-auto"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar Assinatura'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
