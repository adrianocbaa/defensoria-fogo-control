import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock } from 'lucide-react';
import logoSidif from '@/assets/sidif-logo-oficial.png';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ForgotPasswordForm } from '@/components/ForgotPasswordForm';
import { VerifyCodeForm } from '@/components/VerifyCodeForm';
import { ResetPasswordForm } from '@/components/ResetPasswordForm';
import { 
  AuthLoginSchema, 
  AuthSignupSchema, 
  sanitizeEmail, 
  sanitizeString, 
  createRateLimiter, 
  type AuthLoginData, 
  type AuthSignupData 
} from '@/lib/validations';
import { useSidifPublicStats, useCountUp } from '@/hooks/useSidifPublicStats';

const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, resetPassword, loading } = useAuth();
  const { toast } = useToast();

  // Live public stats for the left panel
  const { stats } = useSidifPublicStats();
  const obrasCount = useCountUp(stats?.obras_ativas ?? 0);
  const medicoesCount = useCountUp(stats?.medicoes_mes ?? 0);
  const nucleosCount = useCountUp(stats?.nucleos ?? 0);
  const obrasBarPct = stats && stats.obras_ativas > 0
    ? Math.min(100, Math.max(8, (stats.obras_ativas / Math.max(stats.obras_ativas, 20)) * 100))
    : 0;


  // Rate limiters for login attempts
  const loginRateLimiter = createRateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes
  const signupRateLimiter = createRateLimiter(3, 60 * 60 * 1000); // 3 attempts per hour

  const [loginForm, setLoginForm] = useState<AuthLoginData>({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState<AuthSignupData>({ 
    email: '', 
    password: '', 
    confirmPassword: '', 
    displayName: '' 
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // New password reset flow states
  const [resetFlow, setResetFlow] = useState<'login' | 'forgot' | 'verify' | 'reset'>('login');
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetUserId, setResetUserId] = useState("");
  
  // Old password reset states (keeping for backward compatibility)
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    
    // Rate limiting check
    if (!loginRateLimiter('login')) {
      toast({
        title: "Muitas tentativas",
        description: "Aguarde 15 minutos antes de tentar novamente.",
        variant: "destructive",
      });
      return;
    }

    // Validate and sanitize input
    const sanitizedData = {
      email: sanitizeEmail(loginForm.email),
      password: loginForm.password,
    };

    const validation = AuthLoginSchema.safeParse(sanitizedData);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((error) => {
        if (error.path[0]) {
          errors[error.path[0] as string] = error.message;
        }
      });
      setValidationErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signIn(validation.data.email, validation.data.password);
      
      if (error) {
        toast({
          title: "Erro no login",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login realizado com sucesso!",
          description: "Bem-vindo de volta.",
        });
        navigate('/');
      }
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    
    // Rate limiting check
    if (!signupRateLimiter('signup')) {
      toast({
        title: "Muitas tentativas",
        description: "Aguarde 1 hora antes de tentar novamente.",
        variant: "destructive",
      });
      return;
    }

    // Validate and sanitize input
    const sanitizedData = {
      email: sanitizeEmail(signupForm.email),
      password: signupForm.password,
      confirmPassword: signupForm.confirmPassword,
      displayName: sanitizeString(signupForm.displayName),
    };

    const validation = AuthSignupSchema.safeParse(sanitizedData);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((error) => {
        if (error.path[0]) {
          errors[error.path[0] as string] = error.message;
        }
      });
      setValidationErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signUp(
        validation.data.email, 
        validation.data.password, 
        validation.data.displayName
      );
      
      if (error) {
        toast({
          title: "Erro no cadastro",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Cadastro realizado com sucesso!",
          description: "Verifique seu email para confirmar a conta.",
        });
      }
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    
    if (!resetEmail.trim()) {
      setValidationErrors({ resetEmail: 'Email é obrigatório' });
      return;
    }

    const sanitizedEmail = sanitizeEmail(resetEmail);
    
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
      setValidationErrors({ resetEmail: 'Formato de email inválido' });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await resetPassword(sanitizedEmail);
      
      if (error) {
        toast({
          title: "Erro ao enviar email",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email enviado!",
          description: "Verifique sua caixa de entrada para redefinir sua senha.",
        });
        setShowForgotPassword(false);
        setResetEmail('');
      }
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check for password reset parameters and show reset form
  useEffect(() => {
    // Check URL for verify code
    const urlParams = new URLSearchParams(window.location.search);
    const verify = urlParams.get('verify');
    
    if (verify) {
      setResetFlow('verify');
      setResetCode(verify);
      // Clean URL
      window.history.replaceState({}, '', '/auth');
      return;
    }
    
    // Check if we're in recovery mode (tokens stored by AuthContext - old flow)
    const inRecoveryMode = sessionStorage.getItem('in_recovery_mode');
    const hasRecoveryTokens = sessionStorage.getItem('recovery_access_token');
    
    if (inRecoveryMode && hasRecoveryTokens) {
      // Show password reset form
      setShowNewPassword(true);
      
      toast({
        title: "Redefinir senha",
        description: "Por favor, escolha uma nova senha.",
      });
    }
  }, [toast]);

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    
    if (!newPassword.trim()) {
      setValidationErrors({ newPassword: 'Nova senha é obrigatória' });
      return;
    }
    
    if (newPassword.length < 8) {
      setValidationErrors({ newPassword: 'A senha deve ter pelo menos 8 caracteres' });
      return;
    }
    
    if (newPassword !== confirmNewPassword) {
      setValidationErrors({ confirmNewPassword: 'As senhas não coincidem' });
      return;
    }

    setIsLoading(true);

    try {
      // Get tokens from sessionStorage (stored by AuthContext)
      const accessToken = sessionStorage.getItem('recovery_access_token');
      const refreshToken = sessionStorage.getItem('recovery_refresh_token');
      
      if (!accessToken || !refreshToken) {
        toast({
          title: "Erro na recuperação",
          description: "Link de recuperação inválido ou expirado. Solicite um novo link.",
          variant: "destructive",
        });
        setShowNewPassword(false);
        setIsLoading(false);
        return;
      }

      // Set session first
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      
      if (sessionError) {
        toast({
          title: "Erro na recuperação",
          description: "Token de recuperação expirado. Solicite um novo link.",
          variant: "destructive",
        });
        
        // Clear ALL recovery data
        sessionStorage.removeItem('recovery_access_token');
        sessionStorage.removeItem('recovery_refresh_token');
        sessionStorage.removeItem('in_recovery_mode');
        
        setShowNewPassword(false);
        setIsLoading(false);
        return;
      }

      // Now update the password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        toast({
          title: "Erro ao atualizar senha",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Senha atualizada com sucesso!",
          description: "Você já pode fazer login com sua nova senha.",
        });
        
        // Clear ALL recovery data from sessionStorage
        sessionStorage.removeItem('recovery_access_token');
        sessionStorage.removeItem('recovery_refresh_token');
        sessionStorage.removeItem('in_recovery_mode');
        
        // Sign out and reset form
        await supabase.auth.signOut();
        setShowNewPassword(false);
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const serif = { fontFamily: "'Playfair Display', Georgia, serif" };

  const renderFormArea = () => {
    if (resetFlow === 'forgot') {
      return (
        <ForgotPasswordForm
          onCodeSent={(email) => {
            setResetEmail(email);
            setResetFlow('verify');
          }}
          onBack={() => setResetFlow('login')}
        />
      );
    }
    if (resetFlow === 'verify') {
      return (
        <VerifyCodeForm
          email={resetEmail}
          onCodeVerified={(code, userId) => {
            setResetCode(code);
            setResetUserId(userId);
            setResetFlow('reset');
          }}
          onBack={() => setResetFlow('forgot')}
        />
      );
    }
    if (resetFlow === 'reset') {
      return <ResetPasswordForm code={resetCode} userId={resetUserId} />;
    }
    if (showNewPassword) {
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold" style={serif}>Redefinição de senha</h3>
            <p className="text-sm text-muted-foreground">
              Crie uma nova senha para acessar sua conta.
            </p>
          </div>

          <form onSubmit={handleNewPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nova senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`pl-10 h-12 ${validationErrors.newPassword ? 'border-destructive' : ''}`}
                  required
                  minLength={8}
                />
              </div>
              {validationErrors.newPassword && (
                <p className="text-sm text-destructive">{validationErrors.newPassword}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-new-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Confirmar nova senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirm-new-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className={`pl-10 h-12 ${validationErrors.confirmNewPassword ? 'border-destructive' : ''}`}
                  required
                />
              </div>
              {validationErrors.confirmNewPassword && (
                <p className="text-sm text-destructive">{validationErrors.confirmNewPassword}</p>
              )}
            </div>

            <Button type="submit" className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20" disabled={isLoading || loading}>
              {isLoading ? 'Salvando...' : 'Salvar nova senha'}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  sessionStorage.removeItem('recovery_access_token');
                  sessionStorage.removeItem('recovery_refresh_token');
                  sessionStorage.removeItem('in_recovery_mode');
                  setShowNewPassword(false);
                  window.history.replaceState({}, '', '/auth');
                }}
                className="text-muted-foreground hover:text-primary"
              >
                Voltar ao login
              </Button>
            </div>
          </form>
        </div>
      );
    }

    return (
      <form onSubmit={handleLogin} className="space-y-5 animate-fade-in">
        <div className="space-y-2">
          <Label htmlFor="login-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            E-mail corporativo
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="login-email"
              type="email"
              placeholder="usuario@dp.mt.gov.br"
              value={loginForm.email}
              onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
              className={`pl-10 h-12 ${validationErrors.email ? 'border-destructive' : ''}`}
              required
              autoComplete="email"
            />
          </div>
          {validationErrors.email && (
            <p className="text-sm text-destructive">{validationErrors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="login-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Senha
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={loginForm.password}
              onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
              className={`pl-10 h-12 ${validationErrors.password ? 'border-destructive' : ''}`}
              required
              autoComplete="current-password"
            />
          </div>
          {validationErrors.password && (
            <p className="text-sm text-destructive">{validationErrors.password}</p>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 cursor-pointer text-muted-foreground">
            <input type="checkbox" className="w-4 h-4 rounded border-input text-primary focus:ring-primary" />
            <span>Lembrar acesso</span>
          </label>
          <button
            type="button"
            onClick={() => setResetFlow('forgot')}
            className="text-primary font-medium hover:underline"
          >
            Esqueci minha senha
          </button>
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
          disabled={isLoading || loading}
        >
          {isLoading ? 'Entrando...' : 'Entrar no sistema'}
        </Button>
      </form>
    );
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Left Panel: Institutional narrative + live metrics */}
      <aside className="hidden lg:flex lg:w-[45%] bg-primary text-primary-foreground flex-col justify-between p-12 xl:p-16 relative overflow-hidden">
        {/* Grid texture */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="sidif-grid" width="6" height="6" patternUnits="userSpaceOnUse">
                <path d="M 6 0 L 0 0 0 6" fill="none" stroke="currentColor" strokeWidth="0.3" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#sidif-grid)" />
          </svg>
        </div>

        {/* Brand */}
        <div className="relative z-10 animate-fade-in">
          <div className="flex items-center gap-3 mb-14">
            <img src={logoSidif} alt="SiDIF" className="h-10 w-auto object-contain brightness-0 invert" />
            <span className="font-semibold tracking-[0.25em] text-xs uppercase opacity-80">SiDIF</span>
          </div>

          <h1 className="text-4xl xl:text-5xl leading-tight mb-6" style={serif}>
            Infraestrutura que<br />transforma a cidadania.
          </h1>
          <p className="text-primary-foreground/80 max-w-md text-base xl:text-lg leading-relaxed">
            Gestão estratégica de obras e manutenção predial da Defensoria Pública de Mato Grosso.
          </p>
        </div>

        {/* Live metric cards */}
        <div className="relative z-10 grid grid-cols-1 gap-4 animate-fade-in">
          <div className="p-6 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-widest text-primary-foreground/60 mb-2 font-semibold">
              Obras em acompanhamento
            </p>
            <p className="text-4xl" style={serif}>142</p>
            <div className="mt-4 h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-primary-foreground/70 w-3/4" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-widest text-primary-foreground/60 mb-2 font-semibold">
                Medições (mês)
              </p>
              <p className="text-3xl" style={serif}>38</p>
            </div>
            <div className="p-5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-widest text-primary-foreground/60 mb-2 font-semibold">
                Núcleos ativos
              </p>
              <p className="text-3xl" style={serif}>15</p>
            </div>
          </div>
        </div>

        {/* Footer copyright */}
        <div className="relative z-10 text-xs text-primary-foreground/50 tracking-wide">
          Defensoria Pública do Estado de Mato Grosso · © {new Date().getFullYear()}
        </div>
      </aside>

      {/* Right Panel: Form */}
      <section className="w-full lg:w-[55%] flex flex-col relative bg-background">
        <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
          <div className="w-full max-w-md">
            {/* Mobile brand */}
            <div className="lg:hidden text-center mb-8">
              <img src={logoSidif} alt="SiDIF" className="h-14 mx-auto mb-3 object-contain" />
              <p className="text-sm text-muted-foreground">Sistema Integrado da Diretoria de Infraestrutura Física</p>
            </div>

            {/* Header */}
            <div className="mb-8 hidden lg:block">
              <div className="text-primary font-bold text-2xl mb-1" style={serif}>Defensoria Pública</div>
              <p className="text-muted-foreground text-sm">Acesse o sistema com suas credenciais institucionais</p>
            </div>

            {renderFormArea()}

            {/* Footer seal */}
            <div className="mt-10 flex items-center gap-3 pt-6 border-t border-border">
              <div className="w-9 h-9 flex items-center justify-center rounded-md bg-primary/5 text-primary">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div className="text-[10px] leading-tight text-muted-foreground uppercase tracking-[0.2em] font-semibold">
                Ambiente seguro<br />
                Versão 2.0.0 · build stable
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AuthPage;