import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  LogIn,
  Building2,
  ClipboardCheck,
  HardHat,
  UserRound,
} from 'lucide-react';
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
  type AuthSignupData,
} from '@/lib/validations';

const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, resetPassword, loading } = useAuth();
  const { toast } = useToast();

  // Rate limiters
  const loginRateLimiter = createRateLimiter(5, 15 * 60 * 1000);
  const signupRateLimiter = createRateLimiter(3, 60 * 60 * 1000);

  const [loginForm, setLoginForm] = useState<AuthLoginData>({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState<AuthSignupData>({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [resetFlow, setResetFlow] = useState<'login' | 'forgot' | 'verify' | 'reset'>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetUserId, setResetUserId] = useState('');

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});

    if (!loginRateLimiter('login')) {
      toast({
        title: 'Muitas tentativas',
        description: 'Aguarde 15 minutos antes de tentar novamente.',
        variant: 'destructive',
      });
      return;
    }

    const sanitizedData = {
      email: sanitizeEmail(loginForm.email),
      password: loginForm.password,
    };

    const validation = AuthLoginSchema.safeParse(sanitizedData);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((error) => {
        if (error.path[0]) errors[error.path[0] as string] = error.message;
      });
      setValidationErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signIn(validation.data.email, validation.data.password);
      if (error) {
        toast({ title: 'Erro no login', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Login realizado com sucesso!', description: 'Bem-vindo de volta.' });
        navigate('/');
      }
    } catch {
      toast({
        title: 'Erro inesperado',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
      setValidationErrors({ resetEmail: 'Formato de email inválido' });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await resetPassword(sanitizedEmail);
      if (error) {
        toast({ title: 'Erro ao enviar email', description: error.message, variant: 'destructive' });
      } else {
        toast({
          title: 'Email enviado!',
          description: 'Verifique sua caixa de entrada para redefinir sua senha.',
        });
        setResetEmail('');
        setResetFlow('login');
      }
    } catch {
      toast({
        title: 'Erro inesperado',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password-reset recovery flow
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const verify = urlParams.get('verify');
    if (verify) {
      setResetFlow('verify');
      setResetCode(verify);
      window.history.replaceState({}, '', '/auth');
      return;
    }
    const inRecoveryMode = sessionStorage.getItem('in_recovery_mode');
    const hasRecoveryTokens = sessionStorage.getItem('recovery_access_token');
    if (inRecoveryMode && hasRecoveryTokens) {
      setShowNewPassword(true);
      toast({ title: 'Redefinir senha', description: 'Por favor, escolha uma nova senha.' });
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
      const accessToken = sessionStorage.getItem('recovery_access_token');
      const refreshToken = sessionStorage.getItem('recovery_refresh_token');
      if (!accessToken || !refreshToken) {
        toast({
          title: 'Erro na recuperação',
          description: 'Link de recuperação inválido ou expirado. Solicite um novo link.',
          variant: 'destructive',
        });
        setShowNewPassword(false);
        setIsLoading(false);
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) {
        toast({
          title: 'Erro na recuperação',
          description: 'Token de recuperação expirado. Solicite um novo link.',
          variant: 'destructive',
        });
        sessionStorage.removeItem('recovery_access_token');
        sessionStorage.removeItem('recovery_refresh_token');
        sessionStorage.removeItem('in_recovery_mode');
        setShowNewPassword(false);
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast({
          title: 'Erro ao atualizar senha',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Senha atualizada com sucesso!',
          description: 'Você já pode fazer login com sua nova senha.',
        });
        sessionStorage.removeItem('recovery_access_token');
        sessionStorage.removeItem('recovery_refresh_token');
        sessionStorage.removeItem('in_recovery_mode');
        await supabase.auth.signOut();
        setShowNewPassword(false);
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch {
      toast({
        title: 'Erro inesperado',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fontStack = { fontFamily: "'Inter', 'Manrope', system-ui, -apple-system, sans-serif" };

  const inputBaseCls =
    'h-[52px] rounded-[10px] pl-11 pr-4 text-[15px] border-input bg-white ' +
    'focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]/25 focus-visible:border-[hsl(var(--primary))] ' +
    'transition-colors';

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
          <div className="space-y-1.5">
            <h3 className="text-[26px] font-semibold text-foreground tracking-tight">
              Redefinição de senha
            </h3>
            <p className="text-[15px] text-muted-foreground">
              Crie uma nova senha para acessar sua conta.
            </p>
          </div>

          <form onSubmit={handleNewPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-[13px] font-medium text-foreground">
                Nova senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Mínimo de 8 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`${inputBaseCls} ${validationErrors.newPassword ? 'border-destructive' : ''}`}
                  required
                  minLength={8}
                />
              </div>
              {validationErrors.newPassword && (
                <p className="text-[13px] text-destructive">{validationErrors.newPassword}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-new-password" className="text-[13px] font-medium text-foreground">
                Confirmar nova senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirm-new-password"
                  type="password"
                  placeholder="Repita a nova senha"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className={`${inputBaseCls} ${validationErrors.confirmNewPassword ? 'border-destructive' : ''}`}
                  required
                />
              </div>
              {validationErrors.confirmNewPassword && (
                <p className="text-[13px] text-destructive">{validationErrors.confirmNewPassword}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-[52px] rounded-[10px] text-[15px] font-semibold shadow-md shadow-primary/20"
              disabled={isLoading || loading}
            >
              {isLoading ? 'Salvando...' : 'Salvar nova senha'}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  sessionStorage.removeItem('recovery_access_token');
                  sessionStorage.removeItem('recovery_refresh_token');
                  sessionStorage.removeItem('in_recovery_mode');
                  setShowNewPassword(false);
                  window.history.replaceState({}, '', '/auth');
                }}
                className="text-[13px] text-muted-foreground hover:text-primary transition-colors"
              >
                Voltar ao login
              </button>
            </div>
          </form>
        </div>
      );
    }

    return (
      <form onSubmit={handleLogin} className="space-y-5 animate-fade-in">
        <div className="space-y-2">
          <Label htmlFor="login-email" className="text-[13px] font-medium text-foreground">
            E-mail institucional
          </Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
            <Input
              id="login-email"
              type="email"
              placeholder="usuario@dp.mt.gov.br"
              value={loginForm.email}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
              className={`${inputBaseCls} ${validationErrors.email ? 'border-destructive' : ''}`}
              required
              autoComplete="email"
            />
          </div>
          {validationErrors.email && (
            <p className="text-[13px] text-destructive">{validationErrors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="login-password" className="text-[13px] font-medium text-foreground">
            Senha
          </Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
            <Input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Digite sua senha"
              value={loginForm.password}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
              className={`${inputBaseCls} pr-11 ${validationErrors.password ? 'border-destructive' : ''}`}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground rounded-md transition-colors"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </div>
          {validationErrors.password && (
            <p className="text-[13px] text-destructive">{validationErrors.password}</p>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-input text-primary focus:ring-2 focus:ring-primary/30 accent-[hsl(var(--primary))]"
            />
            <span className="text-[13px] text-muted-foreground">Lembrar meu acesso</span>
          </label>
          <button
            type="button"
            onClick={() => setResetFlow('forgot')}
            className="text-[13px] font-medium text-primary hover:underline"
          >
            Esqueci minha senha
          </button>
        </div>

        <Button
          type="submit"
          className="w-full h-[52px] rounded-[10px] text-[15px] font-semibold shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-[0.99] gap-2"
          disabled={isLoading || loading}
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Autenticando...
            </>
          ) : (
            <>
              <LogIn className="h-[18px] w-[18px]" />
              Entrar no sistema
            </>
          )}
        </Button>
      </form>
    );
  };

  return (
    <div
      className="flex min-h-screen w-full text-foreground"
      style={{ ...fontStack, background: '#F6F8F7' }}
    >
      {/* =================== LEFT — Institutional panel =================== */}
      <aside
        className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col justify-between px-14 py-14 xl:px-20 xl:py-16 text-white"
        style={{
          background:
            'linear-gradient(155deg, #073D28 0%, #0F5132 45%, #0F5132 65%, #0a4429 100%)',
        }}
      >
        {/* Blueprint / architectural line overlay */}
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          viewBox="0 0 800 900"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="bp-fade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D9F2E3" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#D9F2E3" stopOpacity="0.02" />
            </linearGradient>
            <pattern id="bp-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#D9F2E3" strokeOpacity="0.05" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="800" height="900" fill="url(#bp-grid)" />

          {/* Building elevation outline */}
          <g stroke="url(#bp-fade)" strokeWidth="1.1" fill="none" opacity="0.55">
            <rect x="120" y="520" width="560" height="260" />
            <line x1="120" y1="600" x2="680" y2="600" />
            <line x1="120" y1="680" x2="680" y2="680" />
            {/* window mullions */}
            {Array.from({ length: 11 }).map((_, i) => (
              <line
                key={`mul-${i}`}
                x1={120 + (i + 1) * (560 / 12)}
                y1="520"
                x2={120 + (i + 1) * (560 / 12)}
                y2="780"
              />
            ))}
            {/* roof triangle */}
            <polyline points="120,520 400,430 680,520" />
            {/* entrance */}
            <rect x="370" y="700" width="60" height="80" />
            <line x1="400" y1="700" x2="400" y2="780" />
          </g>

          {/* Floor-plan fragment */}
          <g stroke="#D9F2E3" strokeOpacity="0.12" strokeWidth="0.9" fill="none">
            <rect x="60" y="80" width="300" height="200" />
            <line x1="60" y1="180" x2="360" y2="180" />
            <line x1="200" y1="80" x2="200" y2="280" />
            <line x1="280" y1="180" x2="280" y2="280" />
            <circle cx="200" cy="180" r="18" />
            <path d="M 60 130 L 100 130" strokeDasharray="3 3" />
            <path d="M 200 220 L 200 260" strokeDasharray="3 3" />
          </g>

          {/* Section arc / curve */}
          <g stroke="#D9F2E3" strokeOpacity="0.09" strokeWidth="0.8" fill="none">
            <path d="M 500 100 Q 720 260 500 420" />
            <path d="M 520 130 Q 700 260 520 390" />
            <path d="M 540 160 Q 680 260 540 360" />
          </g>

          {/* Dimension line */}
          <g stroke="#D9F2E3" strokeOpacity="0.18" strokeWidth="0.6" fill="none">
            <line x1="80" y1="830" x2="720" y2="830" />
            <line x1="80" y1="825" x2="80" y2="835" />
            <line x1="720" y1="825" x2="720" y2="835" />
            <line x1="400" y1="825" x2="400" y2="835" />
          </g>
        </svg>

        {/* Soft radial vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 20% 15%, rgba(217,242,227,0.10) 0%, transparent 55%)',
          }}
        />

        {/* --- Top: logo --- */}
        <div className="relative z-10">
          <img
            src={logoSidif}
            alt="SiDIF — Sistema Integrado da Diretoria de Infraestrutura Física"
            className="h-14 xl:h-16 w-auto object-contain brightness-0 invert"
          />
        </div>

        {/* --- Middle: headline + institutional blocks --- */}
        <div className="relative z-10 space-y-12 max-w-[560px]">
          <div className="space-y-5">
            <h1
              className="text-[44px] xl:text-[52px] leading-[1.08] font-semibold tracking-tight"
              style={fontStack}
            >
              Infraestrutura pública gerida com{' '}
              <span className="text-[#D9F2E3] font-bold">mais controle</span>.
            </h1>
            <p className="text-[16px] xl:text-[17px] text-white/75 leading-relaxed max-w-[500px]">
              Obras, contratos, medições, fiscalizações e manutenção em um único ambiente
              institucional.
            </p>
          </div>

          {/* Three institutional blocks */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Building2, title: 'Gestão de obras' },
              { icon: ClipboardCheck, title: 'Controle de medições' },
              { icon: HardHat, title: 'Acompanhamento técnico' },
            ].map(({ icon: Icon, title }) => (
              <div
                key={title}
                className="rounded-xl border border-white/15 bg-white/[0.06] backdrop-blur-[2px] px-4 py-5 flex flex-col items-start gap-3 hover:bg-white/[0.09] transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center">
                  <Icon className="h-[18px] w-[18px] text-[#D9F2E3]" strokeWidth={1.75} />
                </div>
                <p className="text-[13px] font-medium leading-snug text-white/90">{title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* --- Bottom: institutional signature --- */}
        <div className="relative z-10 text-[12px] leading-relaxed text-white/60">
          <p className="font-medium text-white/80">Defensoria Pública do Estado de Mato Grosso</p>
          <p>Diretoria de Infraestrutura Física</p>
        </div>
      </aside>

      {/* =================== RIGHT — Authentication =================== */}
      <section
        className="w-full lg:w-[48%] flex flex-col relative"
        style={{ background: '#F6F8F7' }}
      >
        {/* Mobile top strip */}
        <div
          className="lg:hidden px-5 py-6 flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #073D28 0%, #0F5132 100%)',
          }}
        >
          <img
            src={logoSidif}
            alt="SiDIF"
            className="h-10 w-auto object-contain brightness-0 invert"
          />
        </div>

        <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-10 sm:py-14">
          <div className="w-full max-w-[440px]">
            {/* Card */}
            <div
              className="rounded-2xl bg-white border border-black/[0.06] p-9 sm:p-10 shadow-[0_10px_40px_-12px_rgba(15,81,50,0.15),0_2px_6px_-2px_rgba(15,23,15,0.06)] animate-fade-in"
            >
              {/* Header */}
              <div className="mb-7 flex flex-col items-center text-center">
                <div
                  className="h-14 w-14 rounded-full flex items-center justify-center mb-4"
                  style={{ background: '#E7F3EC' }}
                >
                  <UserRound className="h-7 w-7 text-[#0F5132]" strokeWidth={1.75} />
                </div>
                <h2 className="text-[28px] font-semibold text-foreground tracking-tight leading-tight">
                  Bem-vindo ao SiDIF
                </h2>
                <p className="text-[15px] text-muted-foreground mt-1.5">
                  Acesse sua conta institucional para continuar.
                </p>
              </div>

              {renderFormArea()}
            </div>

            {/* Footer under card */}
            <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground">
              <Shield className="h-3.5 w-3.5" strokeWidth={2} />
              <p className="text-[12px]">
                Ambiente seguro <span className="mx-1.5 opacity-50">•</span> Versão 2.0.0
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AuthPage;
