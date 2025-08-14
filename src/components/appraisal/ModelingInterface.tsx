import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, BarChart3, FileText, Play } from 'lucide-react';
import { StatisticsService, ModelData, OLSResult, TransformConfig } from '@/services/statisticsApi';
import { ChartService, ChartArtifact } from '@/services/chartService';
import { comparablesApi } from '@/services/appraisalApi';
import { useFileUpload } from '@/hooks/useFileUpload';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatters';

interface ModelingInterfaceProps {
  projectId: string;
}

export function ModelingInterface({ projectId }: ModelingInterfaceProps) {
  const [comparables, setComparables] = useState<any[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [targetColumn, setTargetColumn] = useState('price_unit');
  const [transformConfig, setTransformConfig] = useState<TransformConfig>({});
  const [modelResults, setModelResults] = useState<OLSResult | null>(null);
  const [chartArtifacts, setChartArtifacts] = useState<ChartArtifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [estimatedValue, setEstimatedValue] = useState<number | null>(null);

  const { uploadFile } = useFileUpload();

  useEffect(() => {
    loadComparables();
  }, []);

  const loadComparables = async () => {
    try {
      const data = await comparablesApi.list();
      setComparables(data);
    } catch (error) {
      console.error('Error loading comparables:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar comparáveis',
        variant: 'destructive',
      });
    }
  };

  const availableFeatures = [
    { value: 'land_area', label: 'Área do Terreno' },
    { value: 'built_area', label: 'Área Construída' },
    { value: 'age', label: 'Idade' },
    { value: 'quality', label: 'Qualidade' },
    { value: 'condition', label: 'Condição' },
    { value: 'deal_type', label: 'Tipo de Negócio' },
    { value: 'kind', label: 'Tipo de Imóvel' }
  ];

  const categoricalFeatures = ['quality', 'condition', 'deal_type', 'kind'];
  const continuousFeatures = ['land_area', 'built_area', 'age'];

  const runModel = async () => {
    if (selectedFeatures.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos uma variável',
        variant: 'destructive',
      });
      return;
    }

    if (comparables.length < 8) {
      toast({
        title: 'Atenção',
        description: 'Recomenda-se pelo menos 8 comparáveis para análise estatística confiável',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Prepare model data
      const target = comparables.map(c => c[targetColumn]).filter(v => v != null);
      const features: Record<string, number[]> = {};
      
      selectedFeatures.forEach(feature => {
        if (categoricalFeatures.includes(feature)) {
          // Keep categorical for dummy creation
          features[feature] = comparables.map(c => c[feature]);
        } else {
          // Convert to numbers for continuous variables
          features[feature] = comparables.map(c => Number(c[feature]) || 0);
        }
      });

      const modelData: ModelData = {
        target,
        features,
        observations: comparables
      };

      // Run OLS
      const results = StatisticsService.runOLS(modelData, transformConfig);
      setModelResults(results);

      // Generate charts
      const artifacts = await ChartService.generateAllCharts(results, target);
      
      // Upload charts to storage
      const uploadedArtifacts: string[] = [];
      for (const artifact of artifacts) {
        try {
          const blob = await fetch(artifact.url).then(r => r.blob());
          const file = new File([blob], `${artifact.type}.png`, { type: 'image/png' });
          const { url } = await uploadFile(file, 'artifacts', `${projectId}/model/${Date.now()}`);
          if (url) {
            uploadedArtifacts.push(url);
          }
        } catch (error) {
          console.error('Error uploading chart:', error);
        }
      }

      setChartArtifacts(artifacts);

      // Save model run
      await StatisticsService.saveModelRun(
        projectId,
        selectedFeatures,
        targetColumn,
        transformConfig,
        results,
        uploadedArtifacts
      );

      // Calculate estimated value for property (using mean values as example)
      const meanFeatures: Record<string, number> = {};
      selectedFeatures.forEach(feature => {
        if (!categoricalFeatures.includes(feature)) {
          meanFeatures[feature] = features[feature].reduce((sum, val) => sum + val, 0) / features[feature].length;
        }
      });

      let estimate = results.coefficients.intercept;
      Object.keys(meanFeatures).forEach(feature => {
        if (results.coefficients[feature]) {
          estimate += results.coefficients[feature] * meanFeatures[feature];
        }
      });

      setEstimatedValue(estimate);

      toast({
        title: 'Sucesso',
        description: 'Modelo executado com sucesso!',
      });

    } catch (error) {
      console.error('Error running model:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao executar modelo',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveReport = async () => {
    if (!modelResults || !estimatedValue) return;

    try {
      // Calculate confidence interval (simplified)
      const se = Math.sqrt(Object.values(modelResults.standardErrors).reduce((sum, se) => sum + se*se, 0));
      const margin = 1.96 * se; // 95% CI
      
      await StatisticsService.saveResult(
        projectId,
        'temp-model-run-id', // Would be from actual model run
        estimatedValue,
        [estimatedValue - margin, estimatedValue + margin],
        modelResults.elasticities
      );

      toast({
        title: 'Sucesso',
        description: 'Laudo parcial salvo com sucesso!',
      });
    } catch (error) {
      console.error('Error saving report:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar laudo',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Configuração do Modelo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Variável Alvo</Label>
              <Select value={targetColumn} onValueChange={setTargetColumn}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price_unit">Preço Unitário</SelectItem>
                  <SelectItem value="price_total">Preço Total</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Transformação do Alvo</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Checkbox 
                  id="log-target"
                  checked={transformConfig.logTarget || false}
                  onCheckedChange={(checked) => 
                    setTransformConfig(prev => ({ ...prev, logTarget: checked as boolean }))
                  }
                />
                <Label htmlFor="log-target">Log-transformação</Label>
              </div>
            </div>
          </div>

          <div>
            <Label>Variáveis Explicativas</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {availableFeatures.map(feature => (
                <div key={feature.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={feature.value}
                    checked={selectedFeatures.includes(feature.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedFeatures(prev => [...prev, feature.value]);
                      } else {
                        setSelectedFeatures(prev => prev.filter(f => f !== feature.value));
                      }
                    }}
                  />
                  <Label htmlFor={feature.value} className="text-sm">
                    {feature.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label>Transformações Avançadas</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div>
                <Label className="text-sm">Log em variáveis contínuas:</Label>
                <div className="space-y-1 mt-1">
                  {continuousFeatures.filter(f => selectedFeatures.includes(f)).map(feature => (
                    <div key={feature} className="flex items-center space-x-2">
                      <Checkbox
                        id={`log-${feature}`}
                        checked={transformConfig.logFeatures?.includes(feature) || false}
                        onCheckedChange={(checked) => {
                          const logFeatures = transformConfig.logFeatures || [];
                          if (checked) {
                            setTransformConfig(prev => ({ 
                              ...prev, 
                              logFeatures: [...logFeatures, feature] 
                            }));
                          } else {
                            setTransformConfig(prev => ({ 
                              ...prev, 
                              logFeatures: logFeatures.filter(f => f !== feature) 
                            }));
                          }
                        }}
                      />
                      <Label htmlFor={`log-${feature}`} className="text-xs">
                        {availableFeatures.find(f => f.value === feature)?.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm">Variáveis dummy:</Label>
                <div className="space-y-1 mt-1">
                  {categoricalFeatures.filter(f => selectedFeatures.includes(f)).map(feature => (
                    <div key={feature} className="flex items-center space-x-2">
                      <Checkbox
                        id={`dummy-${feature}`}
                        checked={transformConfig.dummyFeatures?.includes(feature) || false}
                        onCheckedChange={(checked) => {
                          const dummyFeatures = transformConfig.dummyFeatures || [];
                          if (checked) {
                            setTransformConfig(prev => ({ 
                              ...prev, 
                              dummyFeatures: [...dummyFeatures, feature] 
                            }));
                          } else {
                            setTransformConfig(prev => ({ 
                              ...prev, 
                              dummyFeatures: dummyFeatures.filter(f => f !== feature) 
                            }));
                          }
                        }}
                      />
                      <Label htmlFor={`dummy-${feature}`} className="text-xs">
                        {availableFeatures.find(f => f.value === feature)?.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {comparables.length} comparáveis disponíveis
            </div>
            <Button onClick={runModel} disabled={loading} className="flex items-center gap-2">
              <Play className="h-4 w-4" />
              {loading ? 'Executando...' : 'Executar Modelo'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Panel */}
      {modelResults && (
        <div className="space-y-6">
          {/* Model Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Métricas do Modelo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">R²</Label>
                  <div className="text-2xl font-bold">{modelResults.rSquared.toFixed(4)}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">R² Ajustado</Label>
                  <div className="text-2xl font-bold">{modelResults.rSquaredAdjusted.toFixed(4)}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">RMSE</Label>
                  <div className="text-2xl font-bold">{modelResults.rmse.toFixed(2)}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">MAE</Label>
                  <div className="text-2xl font-bold">{modelResults.mae.toFixed(2)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Coefficients Table */}
          <Card>
            <CardHeader>
              <CardTitle>Coeficientes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variável</TableHead>
                    <TableHead>Coeficiente</TableHead>
                    <TableHead>Erro Padrão</TableHead>
                    <TableHead>t-stat</TableHead>
                    <TableHead>p-valor</TableHead>
                    <TableHead>IC 95%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.keys(modelResults.coefficients).map(variable => (
                    <TableRow key={variable}>
                      <TableCell className="font-medium">{variable}</TableCell>
                      <TableCell>{modelResults.coefficients[variable].toFixed(4)}</TableCell>
                      <TableCell>{modelResults.standardErrors[variable].toFixed(4)}</TableCell>
                      <TableCell>{modelResults.tStats[variable].toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={modelResults.pValues[variable] < 0.05 ? 'default' : 'secondary'}>
                          {modelResults.pValues[variable].toFixed(4)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        [{modelResults.confidenceIntervals[variable][0].toFixed(4)}, {modelResults.confidenceIntervals[variable][1].toFixed(4)}]
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* VIF Diagnostics */}
          <Card>
            <CardHeader>
              <CardTitle>Diagnósticos</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label className="text-sm font-medium">VIF (Variance Inflation Factor)</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {Object.entries(modelResults.vif).map(([variable, vif]) => (
                    <div key={variable} className="flex justify-between items-center p-2 border rounded">
                      <span className="text-sm">{variable}</span>
                      <Badge variant={vif > 10 ? 'destructive' : vif > 5 ? 'secondary' : 'default'}>
                        {vif.toFixed(2)}
                      </Badge>
                    </div>
                  ))}
                </div>
                {Object.values(modelResults.vif).some(vif => vif > 10) && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-sm text-destructive">
                      Atenção: VIF &gt; 10 indica multicolinearidade severa
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Elasticities */}
          <Card>
            <CardHeader>
              <CardTitle>Elasticidades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(modelResults.elasticities).map(([variable, elasticity]) => (
                  <div key={variable} className="flex justify-between items-center p-2 border rounded">
                    <span className="text-sm">{variable}</span>
                    <span className="font-medium">{elasticity.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          {chartArtifacts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Gráficos de Diagnóstico</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {chartArtifacts.map((artifact, index) => (
                    <div key={index}>
                      <Label className="text-sm font-medium">{artifact.name}</Label>
                      <img 
                        src={artifact.url} 
                        alt={artifact.name}
                        className="w-full border rounded mt-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Estimated Value */}
          {estimatedValue && (
            <Card>
              <CardHeader>
                <CardTitle>Valor Estimado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {formatCurrency(estimatedValue)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Valor unitário estimado
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <Button variant="outline" onClick={saveReport} className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Salvar Laudo Parcial
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
