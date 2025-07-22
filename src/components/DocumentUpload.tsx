import { useState } from 'react';
import { Upload, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DocumentType } from '@/types/nucleus';

interface DocumentUploadProps {
  onDocumentAdd: (document: {
    id: string;
    type: DocumentType;
    name: string;
    url: string;
    uploadedAt: Date;
    size?: number;
    mimeType?: string;
  }) => void;
}

export function DocumentUpload({ onDocumentAdd }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('project');
  const [documentName, setDocumentName] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setDocumentName(file.name);
    }
  };

  const uploadDocument = async () => {
    if (!selectedFile || !documentName) {
      toast({
        title: "Erro",
        description: "Selecione um arquivo e informe o nome do documento.",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // Generate unique filename
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${user.id}/documents/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Add document to the list
      const newDocument = {
        id: Date.now().toString(),
        type: documentType,
        name: documentName,
        url: publicUrl,
        uploadedAt: new Date(),
        size: selectedFile.size,
        mimeType: selectedFile.type
      };

      onDocumentAdd(newDocument);

      // Reset form
      setSelectedFile(null);
      setDocumentName('');
      setDocumentType('project');

      toast({
        title: "Sucesso",
        description: "Documento enviado com sucesso!"
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar o documento. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setDocumentName('');
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Nome do Documento *</Label>
          <Input
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            placeholder="Digite o nome do documento"
          />
        </div>
        
        <div>
          <Label>Tipo</Label>
          <Select value={documentType} onValueChange={(value) => setDocumentType(value as DocumentType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="project">Projeto</SelectItem>
              <SelectItem value="fire-license">Alvará</SelectItem>
              <SelectItem value="photos">Fotos</SelectItem>
              <SelectItem value="report">Relatório</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Arquivo</Label>
        {!selectedFile ? (
          <div className="mt-2">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
            />
            <label
              htmlFor="file-upload"
              className="flex items-center justify-center w-full p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <div className="text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Clique para selecionar um arquivo
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, DOC, DOCX, JPG, PNG (máx. 10MB)
                </p>
              </div>
            </label>
          </div>
        ) : (
          <div className="mt-2 flex items-center gap-2 p-3 bg-background border rounded-lg">
            <File className="w-4 h-4 text-muted-foreground" />
            <span className="flex-1 text-sm truncate">{selectedFile.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={removeSelectedFile}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <Button
        type="button"
        onClick={uploadDocument}
        disabled={uploading || !selectedFile || !documentName}
        className="w-full"
      >
        {uploading ? 'Enviando...' : 'Enviar Documento'}
      </Button>
    </div>
  );
}