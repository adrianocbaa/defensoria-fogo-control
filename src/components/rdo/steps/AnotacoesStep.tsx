import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { RdoFormData } from "@/hooks/useRdoForm";

interface AnotacoesStepProps {
  formData: RdoFormData;
  updateField: (field: keyof RdoFormData, value: any) => void;
  onCopyPrevious?: () => void;
}

export function AnotacoesStep({ formData, updateField, onCopyPrevious }: AnotacoesStepProps) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Anotações do Dia</CardTitle>
        {onCopyPrevious && (
          <Button variant="outline" size="sm" onClick={onCopyPrevious}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar do dia anterior
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Data */}
        <div className="space-y-2">
          <Label>Data do Relatório</Label>
          <Input type="date" value={formData.data} readOnly className="bg-muted" />
        </div>

        {/* Condições Climáticas */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Condições Climáticas</h3>
          
          {/* Manhã */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Clima - Manhã</Label>
              <Select value={formData.clima_manha} onValueChange={(v) => updateField('clima_manha', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claro">☀️ Claro</SelectItem>
                  <SelectItem value="nublado">☁️ Nublado</SelectItem>
                  <SelectItem value="chuvoso">🌧️ Chuvoso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Condição - Manhã</Label>
              <Select value={formData.cond_manha} onValueChange={(v) => updateField('cond_manha', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="praticavel">✓ Praticável</SelectItem>
                  <SelectItem value="impraticavel">✗ Impraticável</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tarde */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Clima - Tarde</Label>
              <Select value={formData.clima_tarde} onValueChange={(v) => updateField('clima_tarde', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claro">☀️ Claro</SelectItem>
                  <SelectItem value="nublado">☁️ Nublado</SelectItem>
                  <SelectItem value="chuvoso">🌧️ Chuvoso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Condição - Tarde</Label>
              <Select value={formData.cond_tarde} onValueChange={(v) => updateField('cond_tarde', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="praticavel">✓ Praticável</SelectItem>
                  <SelectItem value="impraticavel">✗ Impraticável</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Noite */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Clima - Noite</Label>
              <Select value={formData.clima_noite} onValueChange={(v) => updateField('clima_noite', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claro">☀️ Claro</SelectItem>
                  <SelectItem value="nublado">☁️ Nublado</SelectItem>
                  <SelectItem value="chuvoso">🌧️ Chuvoso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Condição - Noite</Label>
              <Select value={formData.cond_noite} onValueChange={(v) => updateField('cond_noite', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="praticavel">✓ Praticável</SelectItem>
                  <SelectItem value="impraticavel">✗ Impraticável</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pluviometria */}
          <div className="space-y-2">
            <Label>Pluviometria (mm)</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.pluviometria_mm || ''}
              onChange={(e) => updateField('pluviometria_mm', parseFloat(e.target.value) || undefined)}
            />
          </div>
        </div>

        {/* Observações Gerais */}
        <div className="space-y-2">
          <Label>Observações Gerais</Label>
          <Textarea
            placeholder="Descreva as atividades gerais do dia, eventos importantes, etc..."
            rows={6}
            value={formData.observacoes || ''}
            onChange={(e) => updateField('observacoes', e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
