import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Copy, Sun, Cloud, CloudRain, Check, X } from "lucide-react";
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
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Condições Climáticas</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Coluna Clima */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Clima</h4>
              
              {/* Manhã */}
              <div className="space-y-3">
                <Label className="text-sm">Manhã:</Label>
                <RadioGroup value={formData.clima_manha} onValueChange={(v) => v && updateField('clima_manha', v)}>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="claro" id="clima-manha-claro" />
                      <Label htmlFor="clima-manha-claro" className="font-normal cursor-pointer flex items-center gap-1">
                        <Sun className="h-4 w-4 text-yellow-500" />
                        Claro
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="nublado" id="clima-manha-nublado" />
                      <Label htmlFor="clima-manha-nublado" className="font-normal cursor-pointer flex items-center gap-1">
                        <Cloud className="h-4 w-4 text-gray-500" />
                        Nublado
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="chuvoso" id="clima-manha-chuvoso" />
                      <Label htmlFor="clima-manha-chuvoso" className="font-normal cursor-pointer flex items-center gap-1">
                        <CloudRain className="h-4 w-4 text-blue-500" />
                        Chuvoso
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Tarde */}
              <div className="space-y-3">
                <Label className="text-sm">Tarde:</Label>
                <RadioGroup value={formData.clima_tarde} onValueChange={(v) => v && updateField('clima_tarde', v)}>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="claro" id="clima-tarde-claro" />
                      <Label htmlFor="clima-tarde-claro" className="font-normal cursor-pointer flex items-center gap-1">
                        <Sun className="h-4 w-4 text-yellow-500" />
                        Claro
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="nublado" id="clima-tarde-nublado" />
                      <Label htmlFor="clima-tarde-nublado" className="font-normal cursor-pointer flex items-center gap-1">
                        <Cloud className="h-4 w-4 text-gray-500" />
                        Nublado
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="chuvoso" id="clima-tarde-chuvoso" />
                      <Label htmlFor="clima-tarde-chuvoso" className="font-normal cursor-pointer flex items-center gap-1">
                        <CloudRain className="h-4 w-4 text-blue-500" />
                        Chuvoso
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Noite */}
              <div className="space-y-3">
                <Label className="text-sm">Noite:</Label>
                <RadioGroup value={formData.clima_noite} onValueChange={(v) => v && updateField('clima_noite', v)}>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="claro" id="clima-noite-claro" />
                      <Label htmlFor="clima-noite-claro" className="font-normal cursor-pointer flex items-center gap-1">
                        <Sun className="h-4 w-4 text-yellow-500" />
                        Claro
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="nublado" id="clima-noite-nublado" />
                      <Label htmlFor="clima-noite-nublado" className="font-normal cursor-pointer flex items-center gap-1">
                        <Cloud className="h-4 w-4 text-gray-500" />
                        Nublado
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="chuvoso" id="clima-noite-chuvoso" />
                      <Label htmlFor="clima-noite-chuvoso" className="font-normal cursor-pointer flex items-center gap-1">
                        <CloudRain className="h-4 w-4 text-blue-500" />
                        Chuvoso
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* Coluna Condições */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Condições</h4>
              
              {/* Manhã */}
              <div className="space-y-3">
                <Label className="text-sm">Manhã:</Label>
                <RadioGroup value={formData.cond_manha} onValueChange={(v) => v && updateField('cond_manha', v)}>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="praticavel" id="cond-manha-praticavel" />
                      <Label htmlFor="cond-manha-praticavel" className="font-normal cursor-pointer flex items-center gap-1">
                        <Check className="h-4 w-4 text-green-500" />
                        Praticável
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="impraticavel" id="cond-manha-impraticavel" />
                      <Label htmlFor="cond-manha-impraticavel" className="font-normal cursor-pointer flex items-center gap-1">
                        <X className="h-4 w-4 text-red-500" />
                        Impraticável
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Tarde */}
              <div className="space-y-3">
                <Label className="text-sm">Tarde:</Label>
                <RadioGroup value={formData.cond_tarde} onValueChange={(v) => v && updateField('cond_tarde', v)}>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="praticavel" id="cond-tarde-praticavel" />
                      <Label htmlFor="cond-tarde-praticavel" className="font-normal cursor-pointer flex items-center gap-1">
                        <Check className="h-4 w-4 text-green-500" />
                        Praticável
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="impraticavel" id="cond-tarde-impraticavel" />
                      <Label htmlFor="cond-tarde-impraticavel" className="font-normal cursor-pointer flex items-center gap-1">
                        <X className="h-4 w-4 text-red-500" />
                        Impraticável
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Noite */}
              <div className="space-y-3">
                <Label className="text-sm">Noite:</Label>
                <RadioGroup value={formData.cond_noite} onValueChange={(v) => v && updateField('cond_noite', v)}>
                  <div className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="praticavel" id="cond-noite-praticavel" />
                      <Label htmlFor="cond-noite-praticavel" className="font-normal cursor-pointer flex items-center gap-1">
                        <Check className="h-4 w-4 text-green-500" />
                        Praticável
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="impraticavel" id="cond-noite-impraticavel" />
                      <Label htmlFor="cond-noite-impraticavel" className="font-normal cursor-pointer flex items-center gap-1">
                        <X className="h-4 w-4 text-red-500" />
                        Impraticável
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>
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
