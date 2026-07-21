import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Copy, Sun, Cloud, CloudRain } from "lucide-react";
import { cn } from "@/lib/utils";
import { RdoFormData } from "@/hooks/useRdoForm";

interface AnotacoesStepProps {
  formData: RdoFormData;
  updateField: (field: keyof RdoFormData, value: any) => void;
  onCopyPrevious?: () => void;
  disabled?: boolean;
}

const CLIMA_OPTS = [
  { value: "claro", label: "Claro", icon: Sun, emoji: "☀️" },
  { value: "nublado", label: "Nublado", icon: Cloud, emoji: "☁️" },
  { value: "chuvoso", label: "Chuvoso", icon: CloudRain, emoji: "🌧️" },
] as const;

const COND_OPTS = [
  { value: "praticavel", label: "Praticável" },
  { value: "impraticavel", label: "Impraticável" },
] as const;

function ClimaSegmented({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {CLIMA_OPTS.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm transition-all",
              "hover:border-primary/50",
              active
                ? "border-primary bg-primary/5 text-foreground font-medium"
                : "border-border bg-background text-muted-foreground",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <Icon className="h-4 w-4" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function CondSegmented({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {COND_OPTS.map((opt) => {
        const active = value === opt.value;
        const isPraticavel = opt.value === "praticavel";
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-4 py-1.5 rounded-md border text-sm transition-all",
              active
                ? isPraticavel
                  ? "border-green-600 bg-green-50 text-green-700 font-medium dark:bg-green-950/30 dark:text-green-400"
                  : "border-red-600 bg-red-50 text-red-700 font-medium dark:bg-red-950/30 dark:text-red-400"
                : "border-border bg-background text-muted-foreground hover:border-primary/50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function climaEmoji(v: string) {
  return CLIMA_OPTS.find((o) => o.value === v)?.emoji ?? "";
}

function condLabel(v: string) {
  return COND_OPTS.find((o) => o.value === v)?.label ?? "—";
}

export function AnotacoesStep({ formData, updateField, onCopyPrevious, disabled }: AnotacoesStepProps) {
  const periodos = [
    { key: "manha", label: "Manhã", climaField: "clima_manha", condField: "cond_manha" },
    { key: "tarde", label: "Tarde", climaField: "clima_tarde", condField: "cond_tarde" },
    { key: "noite", label: "Noite", climaField: "clima_noite", condField: "cond_noite" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Anotações do Dia</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Registre as condições climáticas e observações gerais que impactaram o canteiro de obras.
          </p>
        </div>
        {onCopyPrevious && !disabled && (
          <Button variant="outline" size="sm" onClick={onCopyPrevious}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar do dia anterior
          </Button>
        )}
      </div>

      {/* Data + Pluviometria */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Data do Diário</Label>
          <Input type="date" value={formData.data} readOnly className="bg-muted" />
        </div>
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Pluviometria Registrada (mm)</Label>
          <div className="relative">
            <Input
              type="number"
              step="0.01"
              placeholder="0"
              value={formData.pluviometria_mm ?? ''}
              onChange={(e) =>
                updateField('pluviometria_mm', e.target.value === '' ? undefined : parseFloat(e.target.value))
              }
              disabled={disabled}
              className="pr-12"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              mm
            </span>
          </div>
        </div>
      </div>

      {/* Condições Climáticas */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6 space-y-5">
          <div>
            <h3 className="text-base font-semibold">Condições Climáticas</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Defina as condições e a viabilidade dos trabalhos para cada período do dia.
            </p>
          </div>

          <div className="border rounded-xl overflow-hidden">
            {/* Header row */}
            <div className="hidden md:grid grid-cols-[110px_1fr_1fr] gap-4 px-4 py-3 bg-muted/40 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <div>Período</div>
              <div>Clima predominante</div>
              <div>Condição de Trabalho</div>
            </div>

            {periodos.map((p, idx) => (
              <div
                key={p.key}
                className={cn(
                  "grid grid-cols-1 md:grid-cols-[110px_1fr_1fr] gap-3 md:gap-4 px-4 py-4",
                  idx < periodos.length - 1 && "border-b"
                )}
              >
                <div className="font-medium text-sm flex items-center">{p.label}</div>
                <ClimaSegmented
                  value={(formData as any)[p.climaField] ?? ''}
                  onChange={(v) => updateField(p.climaField as keyof RdoFormData, v)}
                  disabled={disabled}
                />
                <CondSegmented
                  value={(formData as any)[p.condField] ?? ''}
                  onChange={(v) => updateField(p.condField as keyof RdoFormData, v)}
                  disabled={disabled}
                />
              </div>
            ))}
          </div>

          {/* Resumo visual */}
          <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm">
            <span className="font-medium">Resumo Visual: </span>
            <span className="text-muted-foreground">
              Manhã: {climaEmoji(formData.clima_manha || '')} {condLabel(formData.cond_manha || '')}
              {' · '}
              Tarde: {climaEmoji(formData.clima_tarde || '')} {condLabel(formData.cond_tarde || '')}
              {' · '}
              Noite: {climaEmoji(formData.clima_noite || '')} {condLabel(formData.cond_noite || '')}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Observações Gerais */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6 space-y-3">
          <div>
            <h3 className="text-base font-semibold">Observações Gerais</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Registre eventos significativos, condições operacionais ou notas para a fiscalização estadual.
            </p>
          </div>
          <Textarea
            placeholder="Descreva as atividades gerais do dia, eventos importantes, etc..."
            rows={6}
            value={formData.observacoes || ''}
            onChange={(e) => updateField('observacoes', e.target.value)}
            disabled={disabled}
          />
        </CardContent>
      </Card>
    </div>
  );
}
