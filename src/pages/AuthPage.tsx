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
          viewBox="0 0 800 1000"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <pattern id="bp-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#D9F2E3" strokeOpacity="0.045" strokeWidth="0.5" />
            </pattern>
            <pattern id="bp-grid-major" width="200" height="200" patternUnits="userSpaceOnUse">
              <path d="M 200 0 L 0 0 0 200" fill="none" stroke="#D9F2E3" strokeOpacity="0.07" strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect width="800" height="1000" fill="url(#bp-grid)" />
          <rect width="800" height="1000" fill="url(#bp-grid-major)" />

          {/* ---- Floor plan (top-right area) ---- */}
          <g stroke="#D9F2E3" strokeOpacity="0.22" strokeWidth="1" fill="none">
            {/* Outer walls */}
            <rect x="440" y="70" width="300" height="220" strokeWidth="1.4" />
            {/* Interior partitions */}
            <line x1="580" y1="70" x2="580" y2="200" />
            <line x1="440" y1="200" x2="740" y2="200" />
            <line x1="660" y1="200" x2="660" y2="290" />
            {/* Door swings (arcs) */}
            <path d="M 560 200 A 20 20 0 0 1 580 220" />
            <path d="M 660 220 A 20 20 0 0 1 680 240" />
            {/* Door openings (breaks in walls) */}
            <line x1="558" y1="200" x2="580" y2="200" stroke="#0F5132" strokeWidth="2.2" strokeOpacity="1" />
            <line x1="660" y1="220" x2="660" y2="242" stroke="#0F5132" strokeWidth="2.2" strokeOpacity="1" />
            {/* Furniture hints */}
            <rect x="460" y="90" width="60" height="30" strokeOpacity="0.16" />
            <circle cx="500" cy="160" r="14" strokeOpacity="0.16" />
            <rect x="610" y="90" width="110" height="20" strokeOpacity="0.16" />
            {/* Stairs */}
            <g strokeOpacity="0.18">
              <rect x="680" y="220" width="50" height="60" />
              <line x1="680" y1="235" x2="730" y2="235" />
              <line x1="680" y1="250" x2="730" y2="250" />
              <line x1="680" y1="265" x2="730" y2="265" />
            </g>
          </g>

          {/* Dimension line above floor plan */}
          <g stroke="#D9F2E3" strokeOpacity="0.28" strokeWidth="0.6" fill="none">
            <line x1="440" y1="50" x2="740" y2="50" />
            <line x1="440" y1="44" x2="440" y2="56" />
            <line x1="740" y1="44" x2="740" y2="56" />
            <line x1="590" y1="44" x2="590" y2="56" />
          </g>
          <text x="510" y="42" fill="#D9F2E3" fillOpacity="0.35" fontSize="9" fontFamily="Inter, sans-serif">12.40</text>
          <text x="650" y="42" fill="#D9F2E3" fillOpacity="0.35" fontSize="9" fontFamily="Inter, sans-serif">12.40</text>

          {/* ---- Column grid (left side, top) ---- */}
          <g stroke="#D9F2E3" strokeOpacity="0.14" strokeWidth="0.6" strokeDasharray="4 4">
            {[80, 200, 320].map((x) => (
              <line key={`ax-${x}`} x1={x} y1="60" x2={x} y2="380" />
            ))}
            {[80, 200, 320].map((y) => (
              <line key={`ay-${y}`} x1="40" y1={y} x2="380" y2={y} />
            ))}
          </g>
          {/* Axis bubbles */}
          <g fill="none" stroke="#D9F2E3" strokeOpacity="0.35" strokeWidth="0.8">
            {[
              { cx: 80, cy: 40, t: 'A' },
              { cx: 200, cy: 40, t: 'B' },
              { cx: 320, cy: 40, t: 'C' },
              { cx: 20, cy: 80, t: '1' },
              { cx: 20, cy: 200, t: '2' },
              { cx: 20, cy: 320, t: '3' },
            ].map((c) => (
              <g key={`axi-${c.t}`}>
                <circle cx={c.cx} cy={c.cy} r="10" />
                <text
                  x={c.cx}
                  y={c.cy + 3}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#D9F2E3"
                  fillOpacity="0.5"
                  fontFamily="Inter, sans-serif"
                >
                  {c.t}
                </text>
              </g>
            ))}
          </g>
          {/* Columns at intersections */}
          <g fill="#D9F2E3" fillOpacity="0.35">
            {[80, 200, 320].flatMap((x) =>
              [80, 200, 320].map((y) => (
                <rect key={`col-${x}-${y}`} x={x - 4} y={y - 4} width="8" height="8" />
              ))
            )}
          </g>

          {/* ---- Building facade (bottom, full width) ---- */}
          <g stroke="#D9F2E3" strokeOpacity="0.32" strokeWidth="1.1" fill="none">
            {/* Ground line */}
            <line x1="40" y1="880" x2="760" y2="880" strokeOpacity="0.45" />
            {/* Base slab */}
            <rect x="80" y="640" width="640" height="240" strokeWidth="1.4" />
            {/* Floor lines */}
            <line x1="80" y1="720" x2="720" y2="720" />
            <line x1="80" y1="800" x2="720" y2="800" />
            {/* Vertical mullions — regular rhythm */}
            {Array.from({ length: 15 }).map((_, i) => (
              <line
                key={`m-${i}`}
                x1={80 + (i + 1) * (640 / 16)}
                y1="640"
                x2={80 + (i + 1) * (640 / 16)}
                y2="880"
                strokeOpacity="0.18"
              />
            ))}
            {/* Roof cornice */}
            <line x1="60" y1="640" x2="740" y2="640" strokeOpacity="0.45" />
            {/* Entrance */}
            <rect x="378" y="810" width="44" height="70" strokeOpacity="0.5" />
            <line x1="400" y1="810" x2="400" y2="880" strokeOpacity="0.35" />
            {/* Flag pole */}
            <line x1="720" y1="640" x2="720" y2="560" strokeOpacity="0.35" />
            <line x1="720" y1="560" x2="750" y2="560" strokeOpacity="0.35" />
          </g>

          {/* Dimension line below facade */}
          <g stroke="#D9F2E3" strokeOpacity="0.32" strokeWidth="0.6" fill="none">
            <line x1="80" y1="920" x2="720" y2="920" />
            <line x1="80" y1="914" x2="80" y2="926" />
            <line x1="720" y1="914" x2="720" y2="926" />
            <line x1="400" y1="914" x2="400" y2="926" />
          </g>
          <text x="380" y="943" fill="#D9F2E3" fillOpacity="0.4" fontSize="10" fontFamily="Inter, sans-serif">64.00 m</text>
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
        <div className="relative z-10 space-y-14 max-w-[620px]">
          <div className="space-y-6">
            <h1
              className="text-[46px] xl:text-[56px] leading-[1.05] font-semibold tracking-tight"
              style={fontStack}
            >
              Infraestrutura pública<br />
              gerida com <span className="text-[#D9F2E3] font-bold">mais controle</span>.
            </h1>
            <p className="text-[17px] xl:text-[18px] text-white/75 leading-relaxed max-w-[520px]">
              Obras, contratos, medições, fiscalizações e manutenção em um único ambiente
              institucional.
            </p>
          </div>

          {/* Three institutional blocks */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Building2, title: 'Gestão de obras' },
              { icon: ClipboardCheck, title: 'Controle de medições' },
              { icon: HardHat, title: 'Acompanhamento técnico' },
            ].map(({ icon: Icon, title }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/[0.18] bg-white/[0.08] backdrop-blur-[3px] px-5 py-6 flex flex-col items-start gap-4 hover:bg-white/[0.11] hover:border-white/25 transition-colors"
              >
                <div className="h-12 w-12 rounded-xl bg-[#D9F2E3]/10 border border-white/20 flex items-center justify-center">
                  <Icon className="h-[22px] w-[22px] text-[#D9F2E3]" strokeWidth={1.75} />
                </div>
                <p className="text-[14px] font-medium leading-snug text-white">{title}</p>
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
