import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Copy, Download, Mail, Share2 } from 'lucide-react';
import { createAuditLog } from '@/hooks/useRdoAuditLog';

interface RdoShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfUrl: string;
  hashVerificacao: string;
  reportId: string;
  obraId: string;
}

export function RdoShareDialog({ 
  open, 
  onOpenChange, 
  pdfUrl, 
  hashVerificacao,
  reportId,
  obraId,
}: RdoShareDialogProps) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const verifyUrl = `${window.location.origin}/rdo/verify/${hashVerificacao}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      toast.success('Link copiado para a área de transferência');
    } catch (error) {
      toast.error('Erro ao copiar link');
    }
  };

  const handleDownload = async () => {
    toast.info('A geração de PDF está em desenvolvimento. Por enquanto, você pode compartilhar o link de verificação.');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'RDO - Relatório Diário de Obra',
          text: 'Confira o Relatório Diário de Obra',
          url: verifyUrl,
        });
      } catch (error) {
        console.error('Erro ao compartilhar:', error);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleSendEmail = async () => {
    if (!email) {
      toast.error('Informe um endereço de e-mail');
      return;
    }

    setIsSendingEmail(true);
    try {
      // TODO: Implementar envio de e-mail via edge function
      toast.info('Funcionalidade de envio de e-mail em desenvolvimento');
      
      await createAuditLog({
        obraId,
        reportId,
        acao: 'SHARE_EMAIL',
        detalhes: { email, message },
      });
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error);
      toast.error('Erro ao enviar e-mail');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar RDO</DialogTitle>
          <DialogDescription>
            Compartilhe este relatório através dos métodos abaixo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Link público */}
          <div>
            <Label>Link de Verificação</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={verifyUrl}
                readOnly
                className="flex-1"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={handleCopyLink}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={handleShare}
              className="w-full"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Compartilhar Link
            </Button>
            
            <div className="text-xs text-muted-foreground text-center">
              Download de PDF em desenvolvimento
            </div>
          </div>

          {/* Enviar por e-mail */}
          <div className="space-y-3 pt-4 border-t">
            <div>
              <Label htmlFor="email">Enviar por E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="destinatario@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="message">Mensagem (opcional)</Label>
              <Textarea
                id="message"
                placeholder="Adicione uma mensagem..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              onClick={handleSendEmail}
              disabled={isSendingEmail || !email}
              className="w-full"
            >
              <Mail className="h-4 w-4 mr-2" />
              {isSendingEmail ? 'Enviando...' : 'Enviar E-mail'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
