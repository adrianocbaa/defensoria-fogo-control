import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Nucleus } from '@/types/nucleus';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Droplets, 
  DropletsIcon,
  Eye,
  AlertTriangle,
  Clock,
  Shield,
  Trash2
} from 'lucide-react';

interface NucleusCardProps {
  nucleus: Nucleus;
  onViewDetails: (nucleusId: string) => void;
  onDelete?: (nucleusId: string) => void;
}

export function NucleusCard({ nucleus, onViewDetails, onDelete }: NucleusCardProps) {
  const expiredExtinguishers = nucleus.fireExtinguishers.filter(
    ext => ext.status === 'expired'
  ).length;
  
  const expiringSoonExtinguishers = nucleus.fireExtinguishers.filter(
    ext => ext.status === 'expiring-soon'
  ).length;

  const isLicenseExpiringSoon = nucleus.fireDepartmentLicense?.validUntil 
    ? new Date(nucleus.fireDepartmentLicense.validUntil) <= new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    : false;

  const isLicenseExpired = nucleus.fireDepartmentLicense?.validUntil 
    ? new Date(nucleus.fireDepartmentLicense.validUntil) < new Date()
    : false;

  const hasWarnings = expiringSoonExtinguishers > 0 || (isLicenseExpiringSoon && !isLicenseExpired);
  const hasErrors = expiredExtinguishers > 0 || isLicenseExpired;

  return (
    <Card className="h-full transition-all duration-200 hover:shadow-md border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-foreground mb-1">
              {nucleus.name}
            </CardTitle>
            <div className="flex items-center gap-1 text-muted-foreground text-sm mb-2">
              <MapPin className="h-3 w-3" />
              <span>{nucleus.city}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasErrors && (
              <AlertTriangle className="h-5 w-5 text-danger" />
            )}
            {hasWarnings && !hasErrors && (
              <AlertTriangle className="h-5 w-5 text-warning" />
            )}
            {!nucleus.isAgentMode && nucleus.hydrants.length > 0 && (
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                <Droplets className="h-3 w-3 mr-1" />
                Hidrante ({nucleus.hydrants.length})
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">
          <div className="flex items-center gap-1 mb-1">
            <MapPin className="h-3 w-3" />
            <span>{nucleus.address}</span>
          </div>
          {nucleus.contact?.phone && (
            <div className="flex items-center gap-1 mb-1">
              <Phone className="h-3 w-3" />
              <span>{nucleus.contact.phone}</span>
            </div>
          )}
          {nucleus.contact?.email && (
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              <span className="truncate">{nucleus.contact.email}</span>
            </div>
          )}
        </div>

        {/* Status Summary */}
        {!nucleus.isAgentMode ? (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t">
            <div className="text-center">
              <div className="text-lg font-semibold text-foreground">
                {nucleus.fireExtinguishers.length}
              </div>
              <div className="text-xs text-muted-foreground">Extintores</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-foreground">
                {nucleus.documents.length}
              </div>
              <div className="text-xs text-muted-foreground">Documentos</div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 pt-2 border-t">
            <div className="text-center">
              <div className="text-lg font-semibold text-foreground">
                {nucleus.documents.length}
              </div>
              <div className="text-xs text-muted-foreground">Documentos</div>
            </div>
          </div>
        )}

        {/* Alerts */}
        <div className="space-y-1">
          {!nucleus.isAgentMode && expiredExtinguishers > 0 && (
            <div className="flex items-center gap-2 text-xs p-2 rounded bg-danger/10 text-danger border border-danger/20">
              <AlertTriangle className="h-3 w-3" />
              <span>{expiredExtinguishers} extintor(es) vencido(s)</span>
            </div>
          )}
          
          {!nucleus.isAgentMode && expiringSoonExtinguishers > 0 && (
            <div className="flex items-center gap-2 text-xs p-2 rounded bg-warning/10 text-warning-foreground border border-warning/20">
              <Clock className="h-3 w-3" />
              <span>{expiringSoonExtinguishers} extintor(es) vencendo</span>
            </div>
          )}

          {isLicenseExpired && (
            <div className="flex items-center gap-2 text-xs p-2 rounded bg-danger/10 text-danger border border-danger/20">
              <Shield className="h-3 w-3" />
              <span>Alvará vencido</span>
            </div>
          )}

          {isLicenseExpiringSoon && !isLicenseExpired && (
            <div className="flex items-center gap-2 text-xs p-2 rounded bg-warning/10 text-warning-foreground border border-warning/20">
              <Shield className="h-3 w-3" />
              <span>Alvará vencendo</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-3">
        <div className="flex gap-2 w-full">
          <Button 
            onClick={() => onViewDetails(nucleus.id)}
            className="flex-1" 
            variant="outline"
          >
            <Eye className="h-4 w-4 mr-2" />
            Ver Detalhes
          </Button>
          {onDelete && (
            <Button 
              onClick={() => onDelete(nucleus.id)}
              variant="destructive"
              size="icon"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}