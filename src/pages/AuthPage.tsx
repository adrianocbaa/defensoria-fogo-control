import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import logoSidif from '@/assets/sidif-logo-oficial.png';
import bb2Asset from '@/assets/bb2.png.asset.json';
import econucleoAsset from '@/assets/econucleo3.jpg.asset.json';
import e01Asset from '@/assets/e01.png.asset.json';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ForgotPasswordForm } from '@/components/ForgotPasswordForm';
import { VerifyCodeForm } from '@/components/VerifyCodeForm';
import { ResetPasswordForm } from '@/components/ResetPasswordForm';
import {
  AuthLoginSchema,
  sanitizeEmail,
  createRateLimiter,
  type AuthLoginData,
} from '@/lib/validations';

const AuthPage = () => {
  const navigate = useNavigate();
  const { signIn, resetPassword, loading } = useAuth();
  const { toast } = useToast();

  const loginRateLimiter = createRateLimiter(5, 15 * 60 * 1000);

  const [loginForm, setLoginForm] = useState<AuthLoginData>({ email: '', password: '' });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

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

    const sanitized = { email: sanitizeEmail(loginForm.email), password: loginForm.password };
    const validation = AuthLoginSchema.safeParse(sanitized);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) errors[err.path[0] as string] = err.message;
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
        toast({ title: 'Login realizado', description: 'Bem-vindo de volta.' });
        navigate('/');
      }
    } catch {
      toast({ title: 'Erro inesperado', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

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
      toast({ title: 'Redefinir senha', description: 'Escolha uma nova senha.' });
    }
  }, [toast]);

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    if (!newPassword.trim()) return setValidationErrors({ newPassword: 'Nova senha é obrigatória' });
    if (newPassword.length < 8) return setValidationErrors({ newPassword: 'Mínimo de 8 caracteres' });
    if (newPassword !== confirmNewPassword) return setValidationErrors({ confirmNewPassword: 'As senhas não coincidem' });

    setIsLoading(true);
    try {
      const accessToken = sessionStorage.getItem('recovery_access_token');
      const refreshToken = sessionStorage.getItem('recovery_refresh_token');
      if (!accessToken || !refreshToken) {
        toast({ title: 'Erro', description: 'Link de recuperação inválido.', variant: 'destructive' });
        setShowNewPassword(false);
        return;
      }
      const { error: sErr } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (sErr) {
        toast({ title: 'Erro', description: 'Token expirado.', variant: 'destructive' });
        sessionStorage.removeItem('recovery_access_token');
        sessionStorage.removeItem('recovery_refresh_token');
        sessionStorage.removeItem('in_recovery_mode');
        setShowNewPassword(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Senha atualizada', description: 'Faça login com sua nova senha.' });
        sessionStorage.removeItem('recovery_access_token');
        sessionStorage.removeItem('recovery_refresh_token');
        sessionStorage.removeItem('in_recovery_mode');
        await supabase.auth.signOut();
        setShowNewPassword(false);
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch {
      toast({ title: 'Erro inesperado', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const fontStack = { fontFamily: "'Inter', 'Manrope', system-ui, -apple-system, sans-serif" };

  // Underline-only field style
  const fieldCls =
    'h-12 w-full bg-transparent border-0 border-b border-neutral-300 rounded-none px-0 ' +
    'text-[15px] text-neutral-900 placeholder:text-neutral-400 ' +
    'focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#0F5132] focus:outline-none ' +
    'shadow-none transition-colors';

  const renderFormArea = () => {
    if (resetFlow === 'forgot') {
      return (
        <ForgotPasswordForm
          onCodeSent={(email) => { setResetEmail(email); setResetFlow('verify'); }}
          onBack={() => setResetFlow('login')}
        />
      );
    }
    if (resetFlow === 'verify') {
      return (
        <VerifyCodeForm
          email={resetEmail}
          onCodeVerified={(code, userId) => { setResetCode(code); setResetUserId(userId); setResetFlow('reset'); }}
          onBack={() => setResetFlow('forgot')}
        />
      );
    }
    if (resetFlow === 'reset') {
      return <ResetPasswordForm code={resetCode} userId={resetUserId} />;
    }
    if (showNewPassword) {
      return (
        <form onSubmit={handleNewPassword} className="space-y-8">
          <div>
            <label className="block text-[11px] font-medium tracking-[0.18em] uppercase text-neutral-500 mb-2">
              Nova senha
            </label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={fieldCls}
              required
              minLength={8}
            />
            {validationErrors.newPassword && (
              <p className="mt-2 text-[12px] text-red-600">{validationErrors.newPassword}</p>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-medium tracking-[0.18em] uppercase text-neutral-500 mb-2">
              Confirmar nova senha
            </label>
            <Input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className={fieldCls}
              required
            />
            {validationErrors.confirmNewPassword && (
              <p className="mt-2 text-[12px] text-red-600">{validationErrors.confirmNewPassword}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading || loading}
            className="w-full h-14 bg-[#0B3D24] hover:bg-[#0F5132] text-white text-[13px] font-semibold tracking-[0.24em] transition-colors disabled:opacity-60"
          >
            {isLoading ? 'SALVANDO...' : 'SALVAR NOVA SENHA'}
          </button>
        </form>
      );
    }

    return (
      <form onSubmit={handleLogin} className="space-y-7">
        <div>
          <label htmlFor="login-email" className="block text-[11px] font-medium tracking-[0.18em] uppercase text-neutral-500 mb-2">
            E-mail institucional
          </label>
          <Input
            id="login-email"
            type="email"
            placeholder="usuario@defensoria.mt.gov.br"
            value={loginForm.email}
            onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))}
            className={fieldCls}
            required
            autoComplete="email"
          />
          {validationErrors.email && (
            <p className="mt-2 text-[12px] text-red-600">{validationErrors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="login-password" className="block text-[11px] font-medium tracking-[0.18em] uppercase text-neutral-500 mb-2">
            Senha de acesso
          </label>
          <Input
            id="login-password"
            type="password"
            placeholder="Digite sua senha"
            value={loginForm.password}
            onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
            className={fieldCls}
            required
            autoComplete="current-password"
          />
          {validationErrors.password && (
            <p className="mt-2 text-[12px] text-red-600">{validationErrors.password}</p>
          )}
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setResetFlow('forgot')}
              className="text-[13px] text-neutral-500 hover:text-[#0F5132] transition-colors"
            >
              Esqueceu a senha?
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || loading}
          className="w-full h-14 bg-[#0B3D24] hover:bg-[#0F5132] text-white text-[13px] font-semibold tracking-[0.32em] transition-colors disabled:opacity-60"
        >
          {isLoading ? 'AUTENTICANDO...' : 'ENTRAR'}
        </button>
      </form>
    );
  };

  return (
    <div className="flex min-h-screen w-full bg-[#F3F3EF] text-neutral-900" style={fontStack}>
      {/* ============ LEFT — Editorial visual composition ============ */}
      <aside className="hidden lg:block relative overflow-hidden lg:w-[58%]">
        {/* Base green */}
        <div className="absolute inset-0 bg-[#062A1B]" />

        {/* Image layer 1 — E01 facade, main background */}
        <img
          src={e01Asset.url}
          alt=""
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover opacity-[0.55]"
          style={{ filter: 'grayscale(1) contrast(1.05) brightness(0.7)', mixBlendMode: 'luminosity' }}
        />

        {/* Image layer 2 — BB2 entrance canopy, overlapping mid-right */}
        <img
          src={bb2Asset.url}
          alt=""
          loading="lazy"
          className="absolute h-[62%] w-[52%] object-cover opacity-[0.42]"
          style={{
            top: '18%',
            right: '-4%',
            filter: 'grayscale(1) contrast(1.1) brightness(0.65)',
            mixBlendMode: 'luminosity',
            clipPath: 'polygon(8% 0, 100% 0, 100% 92%, 0 100%)',
          }}
        />

        {/* Image layer 3 — Econucleo, bottom-left overlap */}
        <img
          src={econucleoAsset.url}
          alt=""
          loading="lazy"
          className="absolute h-[48%] w-[62%] object-cover opacity-[0.32]"
          style={{
            bottom: '0%',
            left: '-6%',
            filter: 'grayscale(1) contrast(1.1) brightness(0.6)',
            mixBlendMode: 'luminosity',
            clipPath: 'polygon(0 12%, 100% 0, 92% 100%, 0 100%)',
          }}
        />

        {/* Green tint wash — unifies the composition */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(6,42,27,0.55) 0%, rgba(6,42,27,0.65) 35%, rgba(4,30,20,0.88) 78%, rgba(3,22,15,0.96) 100%), linear-gradient(90deg, rgba(15,81,50,0.35) 0%, rgba(6,42,27,0.15) 45%, rgba(6,42,27,0.6) 100%)',
          }}
        />

        {/* Subtle grain / paper */}
        <div
          className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '3px 3px',
          }}
        />

        {/* ---- Technical blueprint overlay ---- */}
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          viewBox="0 0 1000 1200"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <pattern id="micro-grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#CDEAD8" strokeOpacity="0.035" strokeWidth="0.4" />
            </pattern>
          </defs>
          <rect width="1000" height="1200" fill="url(#micro-grid)" />

          {/* --- Floor plan top ---- */}
          <g stroke="#CDEAD8" strokeOpacity="0.28" strokeWidth="0.9" fill="none">
            {/* Outer walls */}
            <rect x="180" y="80" width="720" height="330" strokeWidth="1.2" />
            {/* Interior partitions */}
            <line x1="500" y1="80" x2="500" y2="260" />
            <line x1="180" y1="260" x2="900" y2="260" />
            <line x1="720" y1="260" x2="720" y2="410" />
            {/* Doors */}
            <path d="M 470 260 A 30 30 0 0 1 500 290" />
            <path d="M 720 290 A 30 30 0 0 1 750 320" />
            {/* door openings */}
            <line x1="468" y1="260" x2="500" y2="260" stroke="#062A1B" strokeWidth="2" />
            <line x1="720" y1="288" x2="720" y2="322" stroke="#062A1B" strokeWidth="2" />
          </g>

          {/* Room labels */}
          <g fill="#CDEAD8" fillOpacity="0.32" fontFamily="Inter, sans-serif" fontSize="12" letterSpacing="2">
            <text x="290" y="140">SALA 01</text>
            <text x="290" y="345">SALA 02</text>
            <text x="600" y="345">CORREDOR</text>
          </g>

          {/* Dimension line right side (10.80 m) */}
          <g stroke="#CDEAD8" strokeOpacity="0.35" strokeWidth="0.6" fill="none">
            <line x1="930" y1="80" x2="930" y2="410" />
            <line x1="924" y1="80" x2="936" y2="80" />
            <line x1="924" y1="410" x2="936" y2="410" />
          </g>
          <text
            x="945" y="255"
            fill="#CDEAD8" fillOpacity="0.45"
            fontSize="11" fontFamily="Inter, sans-serif"
            transform="rotate(-90 945 255)"
            textAnchor="middle"
          >
            10.80 m
          </text>

          {/* Axis bubbles left (1,2,3) */}
          <g fill="none" stroke="#CDEAD8" strokeOpacity="0.32" strokeWidth="0.9">
            {[
              { cx: 80, cy: 170, t: '1' },
              { cx: 80, cy: 420, t: '2' },
              { cx: 80, cy: 720, t: '3' },
            ].map((c) => (
              <g key={c.t}>
                <circle cx={c.cx} cy={c.cy} r="16" />
                <text
                  x={c.cx} y={c.cy + 4}
                  textAnchor="middle" fontSize="12"
                  fill="#CDEAD8" fillOpacity="0.55"
                  fontFamily="Inter, sans-serif"
                >
                  {c.t}
                </text>
              </g>
            ))}
            {/* axis lines */}
            <line x1="96" y1="170" x2="180" y2="170" strokeDasharray="4 5" strokeOpacity="0.2" />
            <line x1="96" y1="420" x2="180" y2="420" strokeDasharray="4 5" strokeOpacity="0.2" />
          </g>

          {/* Compass N bottom-right area */}
          <g stroke="#CDEAD8" strokeOpacity="0.4" fill="none" strokeWidth="0.8">
            <circle cx="820" cy="820" r="24" />
            <line x1="820" y1="800" x2="820" y2="844" />
            <line x1="820" y1="800" x2="814" y2="812" />
            <line x1="820" y1="800" x2="826" y2="812" />
          </g>
          <text x="820" y="792" textAnchor="middle" fill="#CDEAD8" fillOpacity="0.55" fontSize="10" fontFamily="Inter, sans-serif" letterSpacing="1.5">N</text>

          {/* DPMT watermark large near center */}
          <text
            x="500" y="600"
            textAnchor="middle"
            fill="#CDEAD8" fillOpacity="0.05"
            fontSize="160" fontWeight="700"
            fontFamily="Inter, sans-serif" letterSpacing="8"
          >
            DPMT
          </text>

          {/* dimension line bottom */}
          <g stroke="#CDEAD8" strokeOpacity="0.28" strokeWidth="0.6" fill="none">
            <line x1="180" y1="880" x2="700" y2="880" />
            <line x1="180" y1="874" x2="180" y2="886" />
            <line x1="700" y1="874" x2="700" y2="886" />
          </g>
        </svg>

        {/* ---- Foreground content ---- */}
        {/* Top-left logo */}
        <div className="absolute top-12 left-14 z-10 flex items-center gap-4">
          <img
            src={logoSidif}
            alt="SiDIF"
            className="h-9 w-auto object-contain brightness-0 invert"
          />
          <div className="border-l border-white/25 pl-4">
            <p className="text-[10px] font-medium tracking-[0.24em] uppercase text-white/70 leading-tight">
              Sistema de Gestão<br />de Infraestrutura
            </p>
          </div>
        </div>

        {/* Top-right corner label */}
        <div className="absolute top-12 right-14 z-10 text-right">
          <p className="text-[10px] font-medium tracking-[0.28em] uppercase text-white/55 leading-relaxed">
            Defensoria Pública<br />de Mato Grosso
          </p>
        </div>

        {/* Middle-left small caption */}
        <div className="absolute z-10 left-14 top-[52%] flex items-center gap-3">
          <span className="block h-px w-8 bg-[#5FBF87]" />
          <p className="text-[10px] font-medium tracking-[0.28em] uppercase text-[#8FD3A9]">
            Diretoria de Infraestrutura Física
          </p>
        </div>

        {/* Bottom-left headline */}
        <div className="absolute z-10 left-14 bottom-[110px] max-w-[640px]">
          <h1
            className="text-white font-semibold leading-[1.02] tracking-tight"
            style={{ fontSize: 'clamp(44px, 4.4vw, 68px)' }}
          >
            Infraestrutura<br />
            pública gerida<br />
            <span className="text-[#5FBF87] font-bold">com mais controle.</span>
          </h1>
          <p className="mt-6 text-[14px] leading-relaxed text-white/65 max-w-[440px]">
            Gestão técnica de ativos, manutenções e projetos da<br />
            Defensoria Pública do Estado de Mato Grosso.
          </p>
        </div>

        {/* Bottom institutional strip */}
        <div className="absolute z-10 left-14 right-14 bottom-10 flex items-center gap-10 border-t border-white/10 pt-5">
          <span className="text-[10px] font-medium tracking-[0.28em] uppercase text-white/45">
            V2.1.4 — 2025
          </span>
          <span className="text-[10px] font-medium tracking-[0.28em] uppercase text-white/45">
            MT-DIF / DPMT-0042
          </span>
          <span className="text-[10px] font-medium tracking-[0.28em] uppercase text-white/45">
            Acesso Institucional
          </span>
        </div>
      </aside>

      {/* ============ RIGHT — Auth ============ */}
      <section className="w-full lg:w-[42%] relative flex flex-col bg-[#F3F3EF]">
        {/* Mobile top strip */}
        <div className="lg:hidden px-6 py-6 flex items-center justify-between bg-[#062A1B]">
          <img src={logoSidif} alt="SiDIF" className="h-8 w-auto brightness-0 invert" />
          <p className="text-[9px] font-medium tracking-[0.28em] uppercase text-white/60 text-right">
            Defensoria Pública<br />de Mato Grosso
          </p>
        </div>

        {/* Top-right corner label (desktop) */}
        <div className="hidden lg:block absolute top-12 right-14 text-right">
          <p className="text-[10px] font-medium tracking-[0.28em] uppercase text-neutral-500 leading-relaxed">
            DPMT<br />Sistema Corporativo
          </p>
        </div>

        {/* Form column */}
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-[440px] mx-auto px-8 sm:px-4 py-16 lg:pl-16 lg:pr-14">
            <div className="mb-10 flex items-center gap-3">
              <span className="block h-px w-8 bg-[#0F5132]" />
              <p className="text-[10px] font-medium tracking-[0.32em] uppercase text-[#0F5132]">
                Acesso ao sistema
              </p>
            </div>

            <h2 className="text-[38px] leading-[1.08] font-semibold text-neutral-900 tracking-tight mb-12">
              {resetFlow === 'login' && !showNewPassword ? (
                <>Entre com suas<br />credenciais</>
              ) : (
                <>Redefinição<br />de acesso</>
              )}
            </h2>

            {renderFormArea()}

            {/* Divider + support */}
            <div className="mt-14 pt-6 border-t border-neutral-200">
              <p className="text-[13px] text-neutral-500 leading-relaxed">
                Problemas de acesso? Entre em contato com a{' '}
                <a
                  href="mailto:ti@defensoria.mt.gov.br"
                  className="text-[#0F5132] font-medium hover:underline"
                >
                  Diretoria de TI.
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom footer */}
        <div className="pb-8 text-center">
          <p className="text-[11px] font-medium tracking-[0.32em] uppercase text-neutral-400">
            SiDIF © 2025 — DPMT
          </p>
        </div>
      </section>
    </div>
  );
};

export default AuthPage;
