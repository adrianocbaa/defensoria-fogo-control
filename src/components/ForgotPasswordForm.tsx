import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ForgotPasswordFormProps {
  onCodeSent: (email: string) => void;
  onBack: () => void;
}

export function ForgotPasswordForm({ onCodeSent, onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Digite seu e-mail");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("request-password-reset", {
        body: { email },
      });

      if (error) throw error;

      toast.success("Código enviado! Verifique seu e-mail");
      onCodeSent(email);
    } catch (error: any) {
      console.error("Error requesting password reset:", error);
      toast.error(error.message || "Erro ao solicitar redefinição de senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-center">Esqueceu sua senha?</h2>
        <p className="text-center text-muted-foreground">
          Digite seu e-mail e enviaremos um código de verificação
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />
      </div>

      <div className="space-y-2">
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            "Enviar Código"
          )}
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={onBack}
          disabled={loading}
        >
          Voltar ao Login
        </Button>
      </div>
    </form>
  );
}
