import React, { useState } from 'react';
import { X, Upload, FileText, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFileUpload } from '@/hooks/useFileUpload';
import { toast } from 'sonner';

interface Document {
  name: string;
  type: string;
  url: string;
}

interface DocumentsUploadProps {
  documents: Document[];
  onDocumentsChange: (documents: Document[]) => void;
  maxDocuments?: number;
}

const documentTypes = [
  'Projeto',
  'Licença',
  'Contrato',
  'Cronograma',
  'Termo Aditivo',
  'Relatório',
  'Certidão',
  'Alvará',
  'Outros'
];

export function DocumentsUpload({ documents, onDocumentsChange, maxDocuments = 15 }: DocumentsUploadProps) {
  const { uploadFile, uploading } = useFileUpload();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Check file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de arquivo não permitido. Use PDF, DOC, DOCX, XLS, XLSX ou TXT');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('Arquivo muito grande. Máximo: 10MB');
      return;
    }

    setSelectedFile(file);
    if (!documentName) {
      setDocumentName(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const uploadDocument = async () => {
    if (!selectedFile || !documentName.trim() || !documentType) {
      toast.error('Preencha o nome, tipo e selecione um arquivo');
      return;
    }

    if (documents.length >= maxDocuments) {
      toast.error(`Máximo de ${maxDocuments} documentos permitidos`);
      return;
    }

    const result = await uploadFile(selectedFile, 'documents', 'obras');
    
    if (result.error) {
      toast.error(`Erro ao fazer upload: ${result.error}`);
    } else if (result.url) {
      const newDocument: Document = {
        name: documentName.trim(),
        type: documentType,
        url: result.url
      };
      
      onDocumentsChange([...documents, newDocument]);
      toast.success('Documento enviado com sucesso');
      
      // Reset form
      setSelectedFile(null);
      setDocumentName('');
      setDocumentType('');
    }
  };

  const removeDocument = (index: number) => {
    const newDocuments = documents.filter((_, i) => i !== index);
    onDocumentsChange(newDocuments);
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setDocumentName('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Documentos</label>
        <span className="text-xs text-muted-foreground">
          {documents.length}/{maxDocuments} documentos
        </span>
      </div>

      {/* Upload Area */}
      <Card 
        className={`border-dashed transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-4 space-y-4">
          {!selectedFile ? (
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 rounded-full bg-muted">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Adicionar documento</p>
                <p className="text-xs text-muted-foreground">
                  PDF, DOC, DOCX, XLS, XLSX, TXT (máx. 10MB)
                </p>
              </div>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
                id="document-upload"
                disabled={uploading}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading || documents.length >= maxDocuments}
                onClick={() => document.getElementById('document-upload')?.click()}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Selecionar Arquivo
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeSelectedFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block">Nome do Documento</label>
                  <Input
                    placeholder="Ex: Projeto Executivo"
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block">Tipo</label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="button"
                onClick={uploadDocument}
                disabled={uploading || !documentName.trim() || !documentType}
                className="w-full flex items-center gap-2"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? 'Enviando...' : 'Adicionar Documento'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents List */}
      {documents.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              {documents.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 transition-colors group">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(doc.url, '_blank')}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(index)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}