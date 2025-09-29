import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ResetPasswordFormProps {
  code: string;
  userId: string;
}

export function ResetPasswordForm({ code, userId }: ResetPasswordFormProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const passwordValidations = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    number: /\d/.test(newPassword),
    match: newPassword === confirmPassword && newPassword.length > 0,
  };

  const isPasswordValid = Object.values(passwordValidations).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isPasswordValid) {
      toast.error("A senha não atende aos requisitos");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("reset-password", {
        body: { code, newPassword },
      });

      if (error) throw error;

      toast.success("Senha redefinida com sucesso!");
      
      // Clear recovery mode
      sessionStorage.removeItem("in_recovery_mode");
      sessionStorage.removeItem("recovery_access_token");
      sessionStorage.removeItem("recovery_refresh_token");
      
      // Redirect to login
      setTimeout(() => {
        navigate("/auth");
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(error.message || "Erro ao redefinir senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-center">Nova Senha</h2>
        <p className="text-center text-muted-foreground">
          Crie uma senha forte para sua conta
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">Nova Senha</Label>
        <div className="relative">
          <Input
            id="newPassword"
            type={showPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar Senha</Label>
        <Input
          id="confirmPassword"
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
          required
        />
      </div>

      <div className="space-y-1 text-sm">
        <p className="font-medium">Requisitos da senha:</p>
        <div className="space-y-1">
          <div className={`flex items-center gap-2 ${passwordValidations.length ? "text-green-600" : "text-muted-foreground"}`}>
            {passwordValidations.length ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            <span>Mínimo 8 caracteres</span>
          </div>
          <div className={`flex items-center gap-2 ${passwordValidations.uppercase ? "text-green-600" : "text-muted-foreground"}`}>
            {passwordValidations.uppercase ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            <span>1 letra maiúscula</span>
          </div>
          <div className={`flex items-center gap-2 ${passwordValidations.number ? "text-green-600" : "text-muted-foreground"}`}>
            {passwordValidations.number ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            <span>1 número</span>
          </div>
          <div className={`flex items-center gap-2 ${passwordValidations.match ? "text-green-600" : "text-muted-foreground"}`}>
            {passwordValidations.match ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            <span>Senhas coincidem</span>
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading || !isPasswordValid}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Redefinindo...
          </>
        ) : (
          "Redefinir Senha"
        )}
      </Button>
    </form>
  );
}
