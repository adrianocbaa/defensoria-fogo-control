import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Upload } from 'lucide-react';
import { Nucleus, ExtinguisherType, DocumentType, ExtinguisherStatus } from '@/types/nucleus';
import { useToast } from '@/hooks/use-toast';
import { MapSelector } from '@/components/MapSelector';
import { AuditHistory } from '@/components/AuditHistory';

interface NucleusEditModalProps {
  nucleus: Nucleus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (nucleus: Nucleus) => void;
}

export function NucleusEditModal({ nucleus, open, onOpenChange, onSave }: NucleusEditModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Nucleus>(nucleus);

  useEffect(() => {
    if (open) {
      setFormData(nucleus);
    }
  }, [nucleus, open]);

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
      serialNumber: '',
      capacity: '',
      lastInspection: new Date(),
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
      fireExtinguishers: prev.fireExtinguishers.map(ext => 
        ext.id === id ? { ...ext, [field]: value } : ext
      )
    }));
  };

  const addDocument = () => {
    const newDocument = {
      id: Date.now().toString(),
      type: 'project' as DocumentType,
      name: '',
      url: '',
      uploadedAt: new Date()
    };
    
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
        <DialogHeader>
          <DialogTitle>Editar Núcleo</DialogTitle>
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
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="city">Cidade *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address">Endereço *</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label>Local de Instalação no Mapa</Label>
                <MapSelector
                  address={formData.address}
                  onLocationSelect={(lat, lng) => {
                    setFormData(prev => ({
                      ...prev,
                      coordinates: { lat, lng }
                    }));
                  }}
                  initialCoordinates={formData.coordinates || { lat: -15.6014, lng: -56.0979 }}
                />
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
                    ? new Date(formData.fireDepartmentLicense.validUntil).toISOString().split('T')[0] 
                    : ''
                  }
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    fireDepartmentLicense: { 
                      ...prev.fireDepartmentLicense,
                      validUntil: new Date(e.target.value)
                    }
                  }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Extintores de Incêndio */}
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
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeExtinguisher(extinguisher.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      <Label>Local de Instalação *</Label>
                      <Input
                        value={extinguisher.location}
                        onChange={(e) => updateExtinguisher(extinguisher.id, 'location', e.target.value)}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label>Capacidade</Label>
                      <Input
                        value={extinguisher.capacity || ''}
                        onChange={(e) => updateExtinguisher(extinguisher.id, 'capacity', e.target.value)}
                        placeholder="Ex: 6kg"
                      />
                    </div>
                    
                    <div>
                      <Label>Número de Série</Label>
                      <Input
                        value={extinguisher.serialNumber || ''}
                        onChange={(e) => updateExtinguisher(extinguisher.id, 'serialNumber', e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label>Data de Vencimento *</Label>
                      <Input
                        type="date"
                        value={new Date(extinguisher.expirationDate).toISOString().split('T')[0]}
                        onChange={(e) => updateExtinguisher(extinguisher.id, 'expirationDate', new Date(e.target.value))}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label>Última Inspeção</Label>
                      <Input
                        type="date"
                        value={extinguisher.lastInspection 
                          ? new Date(extinguisher.lastInspection).toISOString().split('T')[0]
                          : ''
                        }
                        onChange={(e) => updateExtinguisher(extinguisher.id, 'lastInspection', 
                          e.target.value ? new Date(e.target.value) : undefined
                        )}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Hidrantes */}
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
                          ? new Date(hydrant.hoseExpirationDate).toISOString().split('T')[0]
                          : ''
                        }
                        onChange={(e) => updateHydrant(hydrant.id, 'hoseExpirationDate', 
                          e.target.value ? new Date(e.target.value) : undefined
                        )}
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

          {/* Documentos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Documentos</CardTitle>
                <Button type="button" onClick={addDocument} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
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