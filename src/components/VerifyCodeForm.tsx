import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface VerifyCodeFormProps {
  email: string;
  onCodeVerified: (code: string, userId: string) => void;
  onBack: () => void;
}

export function VerifyCodeForm({ email, onCodeVerified, onBack }: VerifyCodeFormProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      toast.error("Digite o código de 6 dígitos");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("verify-reset-code", {
        body: { code },
      });

      if (error) throw error;

      if (data?.valid) {
        toast.success("Código verificado com sucesso!");
        onCodeVerified(code, data.user_id);
      } else {
        toast.error("Código inválido ou expirado");
      }
    } catch (error: any) {
      console.error("Error verifying code:", error);
      toast.error(error.message || "Código inválido ou expirado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-center">Verificar Código</h2>
        <p className="text-center text-muted-foreground">
          Digite o código de 6 dígitos enviado para <strong>{email}</strong>
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="code">Código de Verificação</Label>
        <Input
          id="code"
          type="text"
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          disabled={loading}
          required
          maxLength={6}
          className="text-center text-2xl tracking-widest"
        />
      </div>

      <div className="space-y-2">
        <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verificando...
            </>
          ) : (
            "Verificar Código"
          )}
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={onBack}
          disabled={loading}
        >
          Voltar
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        O código expira em 15 minutos
      </p>
    </form>
  );
}
