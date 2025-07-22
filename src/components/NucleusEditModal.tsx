import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Upload } from 'lucide-react';
import { Nucleus, ExtinguisherType, DocumentType, ExtinguisherStatus } from '@/types/nucleus';
import { useToast } from '@/hooks/use-toast';
import { MapSelector } from '@/components/MapSelector';
import { AuditHistory } from '@/components/AuditHistory';
import { DocumentUpload } from '@/components/DocumentUpload';
import { useUserRole } from '@/hooks/useUserRole';
import { PermissionGuard } from '@/components/PermissionGuard';

interface NucleusEditModalProps {
  nucleus: Nucleus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (nucleus: Nucleus) => void;
}

export function NucleusEditModal({ nucleus, open, onOpenChange, onSave }: NucleusEditModalProps) {
  const { toast } = useToast();
  const { canEdit } = useUserRole();
  const [formData, setFormData] = useState<Nucleus>(nucleus);

  useEffect(() => {
    if (open) {
      setFormData(nucleus);
    }
  }, [nucleus, open]);

  if (!canEdit) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Update extinguisher statuses based on expiration dates
    const updatedExtinguishers = formData.fireExtinguishers.map(ext => {
      const expirationDate = new Date(ext.expirationDate);
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      
      let status: ExtinguisherStatus = 'valid';
      if (expirationDate < now) {
        status = 'expired';
      } else if (expirationDate <= threeDaysFromNow) {
        status = 'expiring-soon';
      }
      
      return { ...ext, status };
    });

    const updatedNucleus = {
      ...formData,
      fireExtinguishers: updatedExtinguishers,
      updatedAt: new Date()
    };
    
    onSave(updatedNucleus);
    onOpenChange(false);
    
    toast({
      title: "Núcleo atualizado",
      description: "As informações do núcleo foram atualizadas com sucesso.",
    });
  };

  const addExtinguisher = () => {
    const newExtinguisher = {
      id: Date.now().toString(),
      type: 'ABC' as ExtinguisherType,
      expirationDate: new Date(),
      location: '',
      capacity: '',
      hydrostaticTest: undefined,
      supportType: undefined,
      hasVerticalSignage: false,
      status: 'valid' as ExtinguisherStatus
    };
    
    setFormData(prev => ({
      ...prev,
      fireExtinguishers: [...prev.fireExtinguishers, newExtinguisher]
    }));
  };

  const removeExtinguisher = (id: string) => {
    setFormData(prev => ({
      ...prev,
      fireExtinguishers: prev.fireExtinguishers.filter(ext => ext.id !== id)
    }));
  };

  const updateExtinguisher = (id: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      fireExtinguishers: prev.fireExtinguishers.map(ext => {
        if (ext.id === id) {
          const updated = { ...ext, [field]: value };
          // Auto-set capacity when type changes
          if (field === 'type') {
            if (value === 'H2O') {
              updated.capacity = '10L';
            } else {
              updated.capacity = ''; // Reset for other types
            }
          }
          return updated;
        }
        return ext;
      })
    }));
  };

  const addDocument = (newDocument: any) => {
    setFormData(prev => ({
      ...prev,
      documents: [...prev.documents, newDocument]
    }));
  };

  const removeDocument = (id: string) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter(doc => doc.id !== id)
    }));
  };

  const updateDocument = (id: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.map(doc => 
        doc.id === id ? { ...doc, [field]: value } : doc
      )
    }));
  };

  const addHydrant = () => {
    const newHydrant = {
      id: Date.now().toString(),
      location: '',
      status: 'not_verified' as const,
      hoseExpirationDate: undefined,
      hasRegister: false,
      hasHose: false,
      hasKey: false,
      hasCoupling: false,
      hasAdapter: false,
      hasNozzle: false,
    };
    
    setFormData(prev => ({
      ...prev,
      hydrants: [...prev.hydrants, newHydrant]
    }));
  };

  const removeHydrant = (id: string) => {
    setFormData(prev => ({
      ...prev,
      hydrants: prev.hydrants.filter(hydrant => hydrant.id !== id)
    }));
  };

  const updateHydrant = (id: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      hydrants: prev.hydrants.map(hydrant => 
        hydrant.id === id ? { ...hydrant, [field]: value } : hydrant
      )
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="relative">
          <DialogTitle>Editar Núcleo</DialogTitle>
          
          {/* Toggle Fórum no canto superior direito */}
          <div className="absolute top-0 right-0 flex items-center space-x-2">
            <Label htmlFor="edit-agent-mode" className="text-sm font-medium">
              Fórum
            </Label>
            <Switch
              id="edit-agent-mode"
              checked={formData.isAgentMode || false}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isAgentMode: checked }))}
            />
          </div>
        </DialogHeader>
        
        <Tabs defaultValue="edit" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit">Editar</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>
          
          <TabsContent value="edit" className="mt-4">
            <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome do Núcleo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
              </div>
              <div>
                <Label htmlFor="city">Cidade *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address">Endereço *</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Local de Instalação no Mapa</Label>
                <div className="p-4 bg-muted rounded-md border">
                  <p className="text-sm text-muted-foreground">
                    Localização: {formData.coordinates?.lat?.toFixed(6)}, {formData.coordinates?.lng?.toFixed(6)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    As coordenadas não podem ser alteradas após o cadastro
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações de Contato */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações de Contato</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.contact?.phone || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    contact: { ...prev.contact, phone: e.target.value }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.contact?.email || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    contact: { ...prev.contact, email: e.target.value }
                  }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Alvará do Corpo de Bombeiros */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Alvará do Corpo de Bombeiros (AVCB)</CardTitle>
            </CardHeader>
            <CardContent>
               <div>
                 <Label htmlFor="licenseValidUntil">Data de Validade</Label>
                 <Input
                   id="licenseValidUntil"
                   type="date"
                   value={formData.fireDepartmentLicense?.validUntil 
                     ? new Date(formData.fireDepartmentLicense.validUntil.getTime() + formData.fireDepartmentLicense.validUntil.getTimezoneOffset() * 60000).toISOString().split('T')[0] 
                     : ''
                   }
                   onChange={(e) => {
                     if (e.target.value) {
                       const date = new Date(e.target.value + 'T00:00:00');
                       setFormData(prev => ({ 
                         ...prev, 
                         fireDepartmentLicense: { 
                           ...prev.fireDepartmentLicense,
                           validUntil: date
                         }
                       }));
                     }
                   }}
                 />
               </div>
            </CardContent>
          </Card>

          {/* Extintores de Incêndio */}
          {!formData.isAgentMode && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Extintores de Incêndio</CardTitle>
                  <Button type="button" onClick={addExtinguisher} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Extintor
                  </Button>
                </div>
              </CardHeader>
            <CardContent className="space-y-4">
              {formData.fireExtinguishers.map((extinguisher, index) => (
                <div key={extinguisher.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Extintor {index + 1}</h4>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newExtinguisher = {
                            id: Date.now().toString(),
                            type: extinguisher.type,
                            expirationDate: new Date(),
                            location: extinguisher.location,
                            capacity: extinguisher.capacity,
                            hydrostaticTest: extinguisher.hydrostaticTest,
                            supportType: extinguisher.supportType,
                            hasVerticalSignage: extinguisher.hasVerticalSignage,
                            status: 'valid' as ExtinguisherStatus
                          };
                          setFormData(prev => ({
                            ...prev,
                            fireExtinguishers: [...prev.fireExtinguishers, newExtinguisher]
                          }));
                        }}
                        title="Copiar extintor"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeExtinguisher(extinguisher.id)}
                        title="Excluir extintor"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <Label>Tipo *</Label>
                       <Select
                         value={extinguisher.type}
                         onValueChange={(value) => updateExtinguisher(extinguisher.id, 'type', value)}
                       >
                         <SelectTrigger>
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="H2O">Água</SelectItem>
                           <SelectItem value="PQS">Pó Químico Seco</SelectItem>
                           <SelectItem value="CO2">Gás Carbônico</SelectItem>
                           <SelectItem value="ABC">Multipropósito</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                     
                      <div>
                        <Label>Capacidade</Label>
                        {extinguisher.type === 'H2O' ? (
                          <Input
                            value="10L"
                            readOnly
                            className="bg-muted"
                          />
                        ) : (
                          <Select
                            value={extinguisher.capacity || ''}
                            onValueChange={(value) => updateExtinguisher(extinguisher.id, 'capacity', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a capacidade" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="4kg">4kg</SelectItem>
                              <SelectItem value="6kg">6kg</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                     
                     <div>
                       <Label>Local de Instalação *</Label>
                       <Input
                         value={extinguisher.location}
                         onChange={(e) => updateExtinguisher(extinguisher.id, 'location', e.target.value)}
                         required
                       />
                     </div>
                     
                     <div>
                       <Label>Data de Vencimento *</Label>
                       <Input
                         type="date"
                         value={extinguisher.expirationDate 
                           ? new Date(extinguisher.expirationDate.getTime() + extinguisher.expirationDate.getTimezoneOffset() * 60000).toISOString().split('T')[0]
                           : ''
                         }
                         onChange={(e) => {
                           if (e.target.value) {
                             const date = new Date(e.target.value + 'T00:00:00');
                             updateExtinguisher(extinguisher.id, 'expirationDate', date);
                           }
                         }}
                         required
                       />
                     </div>
                     
                     <div>
                       <Label>Teste Hidrostático</Label>
                       <Input
                         type="date"
                         value={extinguisher.hydrostaticTest 
                           ? new Date(extinguisher.hydrostaticTest.getTime() + extinguisher.hydrostaticTest.getTimezoneOffset() * 60000).toISOString().split('T')[0]
                           : ''
                         }
                         onChange={(e) => {
                           const date = e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined;
                           updateExtinguisher(extinguisher.id, 'hydrostaticTest', date);
                         }}
                       />
                     </div>
                     
                     <div>
                       <Label>Tipo de Suporte</Label>
                       <Select
                         value={extinguisher.supportType || ''}
                         onValueChange={(value) => updateExtinguisher(extinguisher.id, 'supportType', value || undefined)}
                       >
                         <SelectTrigger>
                           <SelectValue placeholder="Selecionar suporte" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="wall">Parede</SelectItem>
                           <SelectItem value="tripod">Tripé</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>
                   </div>
                   
                   <div className="mt-4">
                     <div className="flex items-center space-x-2">
                       <Checkbox
                         checked={extinguisher.hasVerticalSignage || false}
                         onCheckedChange={(checked) => updateExtinguisher(extinguisher.id, 'hasVerticalSignage', checked)}
                       />
                       <Label>Possui Sinalização Vertical</Label>
                     </div>
                  </div>
                </div>
              ))}
            </CardContent>
            </Card>
          )}

          {/* Hidrantes */}
          {!formData.isAgentMode && (
            <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Hidrantes</CardTitle>
                <Button type="button" onClick={addHydrant} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Hidrante
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.hydrants.map((hydrant, index) => (
                <div key={hydrant.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Hidrante {index + 1}</h4>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeHydrant(hydrant.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Local de Instalação *</Label>
                      <Input
                        value={hydrant.location}
                        onChange={(e) => updateHydrant(hydrant.id, 'location', e.target.value)}
                        placeholder="Ex: Hall de entrada, Térreo"
                        required
                      />
                    </div>
                    
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={hydrant.status}
                        onValueChange={(value) => updateHydrant(hydrant.id, 'status', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="verified">Verificado</SelectItem>
                          <SelectItem value="not_verified">Não Verificado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                     <div>
                       <Label>Validade da Mangueira</Label>
                       <Input
                         type="date"
                         value={hydrant.hoseExpirationDate 
                           ? new Date(hydrant.hoseExpirationDate.getTime() + hydrant.hoseExpirationDate.getTimezoneOffset() * 60000).toISOString().split('T')[0]
                           : ''
                         }
                         onChange={(e) => {
                           const date = e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined;
                           updateHydrant(hydrant.id, 'hoseExpirationDate', date);
                         }}
                       />
                     </div>
                  </div>
                  
                  <div className="mt-4">
                    <Label className="text-sm font-medium mb-3 block">Componentes Disponíveis</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={hydrant.hasRegister}
                          onCheckedChange={(checked) => updateHydrant(hydrant.id, 'hasRegister', checked)}
                        />
                        <Label className="text-sm">Registro</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={hydrant.hasHose}
                          onCheckedChange={(checked) => updateHydrant(hydrant.id, 'hasHose', checked)}
                        />
                        <Label className="text-sm">Mangueira</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={hydrant.hasKey}
                          onCheckedChange={(checked) => updateHydrant(hydrant.id, 'hasKey', checked)}
                        />
                        <Label className="text-sm">Chave</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={hydrant.hasCoupling}
                          onCheckedChange={(checked) => updateHydrant(hydrant.id, 'hasCoupling', checked)}
                        />
                        <Label className="text-sm">Engate</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={hydrant.hasAdapter}
                          onCheckedChange={(checked) => updateHydrant(hydrant.id, 'hasAdapter', checked)}
                        />
                        <Label className="text-sm">Adaptador</Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={hydrant.hasNozzle}
                          onCheckedChange={(checked) => updateHydrant(hydrant.id, 'hasNozzle', checked)}
                        />
                        <Label className="text-sm">Esguicho</Label>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
            </Card>
          )}

          {/* Documentos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Documentos</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload Component */}
              <DocumentUpload onDocumentAdd={addDocument} />
              
              {/* Document List */}
              {formData.documents.map((document, index) => (
                <div key={document.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Documento {index + 1}</h4>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeDocument(document.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Nome do Documento *</Label>
                      <Input
                        value={document.name}
                        onChange={(e) => updateDocument(document.id, 'name', e.target.value)}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label>Tipo</Label>
                      <Select
                        value={document.type}
                        onValueChange={(value) => updateDocument(document.id, 'type', value)}
                      >
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
                    
                    {document.url && (
                      <div className="md:col-span-2">
                        <Label>Link do Documento</Label>
                        <div className="flex gap-2">
                          <Input
                            value={document.url}
                            readOnly
                            className="bg-muted"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => window.open(document.url, '_blank')}
                          >
                            Visualizar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Separator />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Salvar Alterações
            </Button>
          </div>
            </form>
          </TabsContent>
          
          <TabsContent value="history" className="mt-4">
            <AuditHistory recordId={nucleus.id} tableName="nuclei" />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}