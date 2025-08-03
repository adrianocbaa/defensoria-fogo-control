import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const UNIT_OPTIONS = [
  { value: 'KG', label: 'Quilograma (KG)' },
  { value: 'M', label: 'Metro (M)' },
  { value: 'LITRO', label: 'Litro (L)' },
  { value: 'PC', label: 'Peça (PC)' },
  { value: 'CX', label: 'Caixa (CX)' }
];

export function MaterialForm() {
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    unit: '',
    minimum_stock: 0
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code || !formData.description || !formData.unit) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('materials')
        .insert({
          code: formData.code,
          description: formData.description,
          unit: formData.unit as 'KG' | 'M' | 'LITRO' | 'PC' | 'CX',
          minimum_stock: formData.minimum_stock,
          current_stock: 0
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Material cadastrado com sucesso"
      });

      // Reset form
      setFormData({
        code: '',
        description: '',
        unit: '',
        minimum_stock: 0
      });
    } catch (error: any) {
      console.error('Error saving material:', error);
      
      if (error.code === '23505') {
        toast({
          title: "Erro",
          description: "Já existe um material com este código",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível salvar o material",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-border/50 px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" className="btn-action">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Novo Material
              </h1>
              <p className="text-muted-foreground mt-1">
                Cadastre um novo material no estoque
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Progress Indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">1</span>
          <span className="text-foreground font-medium">Informações Básicas</span>
          <div className="w-8 h-px bg-border"></div>
          <span className="w-6 h-6 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-xs">2</span>
          <span>Configurações</span>
        </div>

        {/* Form Card */}
        <Card className="card-enhanced">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Informações do Material
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Preencha os dados básicos do material. Campos marcados com * são obrigatórios.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information Section */}
              <div className="form-section">
                <h3 className="text-lg font-semibold text-foreground mb-4">Identificação</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="code" className="text-sm font-medium text-foreground">
                      Código do Material *
                    </Label>
                    <Input
                      id="code"
                      placeholder="Ex: MAT001, EQ-2024-001"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="h-11"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Código único para identificação do material
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unit" className="text-sm font-medium text-foreground">
                      Unidade de Medida *
                    </Label>
                    <Select
                      value={formData.unit}
                      onValueChange={(value) => setFormData({ ...formData, unit: value })}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Selecione a unidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-foreground">
                    Descrição Completa *
                  </Label>
                  <Input
                    id="description"
                    placeholder="Ex: Parafuso sextavado M6x20mm - Aço inox"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="h-11"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Descrição detalhada incluindo especificações técnicas
                  </p>
                </div>
              </div>

              {/* Stock Configuration */}
              <div className="form-section">
                <h3 className="text-lg font-semibold text-foreground mb-4">Configuração de Estoque</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="minimum_stock" className="text-sm font-medium text-foreground">
                      Estoque Mínimo
                    </Label>
                    <Input
                      id="minimum_stock"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={formData.minimum_stock}
                      onChange={(e) => setFormData({ ...formData, minimum_stock: parseFloat(e.target.value) || 0 })}
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      Quantidade mínima para alertas de reposição
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                      Estoque Inicial
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      className="h-11"
                      disabled
                    />
                    <p className="text-xs text-muted-foreground">
                      Será definido na primeira movimentação
                    </p>
                  </div>
                </div>

                {/* Preview Card */}
                <div className="bg-muted/30 border border-border/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-foreground mb-3">Prévia do Material</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Código:</span>
                      <p className="font-medium">{formData.code || '---'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Unidade:</span>
                      <p className="font-medium">{formData.unit || '---'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Estoque Mín:</span>
                      <p className="font-medium">{formData.minimum_stock || 0}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className="text-muted-foreground">Descrição:</span>
                    <p className="font-medium">{formData.description || '---'}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-border/50">
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="btn-primary flex-1 sm:flex-none sm:min-w-32 h-11"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Salvando...' : 'Salvar Material'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="btn-action flex-1 sm:flex-none sm:min-w-32 h-11"
                >
                  Cancelar
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="btn-action flex-1 sm:flex-none sm:min-w-40 h-11 ml-auto"
                >
                  Salvar e Adicionar Outro
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="bg-blue-50/50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-600 text-xs font-bold">?</span>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-blue-900">Dicas para cadastro</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Use códigos padronizados para facilitar a busca</li>
                  <li>• Inclua especificações técnicas na descrição</li>
                  <li>• Defina estoque mínimo baseado no consumo histórico</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}