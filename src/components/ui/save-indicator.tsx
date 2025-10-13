import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SaveIndicatorProps {
  isSaving: boolean;
  className?: string;
}

export function SaveIndicator({ isSaving, className }: SaveIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      {isSaving ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Salvando...</span>
        </>
      ) : (
        <>
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-green-600">Salvo</span>
        </>
      )}
    </div>
  );
}
