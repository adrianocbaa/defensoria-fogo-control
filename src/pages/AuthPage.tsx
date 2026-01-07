import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Lock, User, AlertTriangle } from 'lucide-react';
import logoDif from '@/assets/logo-dif-dpmt.jpg';
import logoSidif from '@/assets/logo-sidif-new.jpg';
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

const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, resetPassword, loading } = useAuth();
  const { toast } = useToast();

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg border-t-4 border-t-primary relative">
          <CardHeader className="text-center pb-2 pt-4">
            <div className="mx-auto mb-1 flex items-center justify-center">
              <img src={logoSidif} alt="SiDIF" className="h-40 object-contain" />
            </div>
            <img 
              src={logoDif} 
              alt="Logo DIF" 
              className="absolute bottom-4 right-4 h-12 w-12 object-contain rounded-full shadow-md"
            />
            <CardTitle className="text-lg font-semibold text-foreground">Sistema Integrado</CardTitle>
            <CardDescription className="text-sm">
              Diretoria de Infraestrutura Física
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {resetFlow === 'forgot' ? (
              <ForgotPasswordForm
                onCodeSent={(email) => {
                  setResetEmail(email);
                  setResetFlow('verify');
                }}
                onBack={() => setResetFlow('login')}
              />
            ) : resetFlow === 'verify' ? (
              <VerifyCodeForm
                email={resetEmail}
                onCodeVerified={(code, userId) => {
                  setResetCode(code);
                  setResetUserId(userId);
                  setResetFlow('reset');
                }}
                onBack={() => setResetFlow('forgot')}
              />
            ) : resetFlow === 'reset' ? (
              <ResetPasswordForm
                code={resetCode}
                userId={resetUserId}
              />
            ) : showNewPassword ? (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-semibold">Redefinição de senha</h3>
                  <p className="text-sm text-muted-foreground">
                    Crie uma nova senha para acessar sua conta.
                  </p>
                </div>
                
                <form onSubmit={handleNewPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-sm font-medium">
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
                        className={`pl-10 ${validationErrors.newPassword ? 'border-red-500' : ''}`}
                        required
                        minLength={8}
                      />
                    </div>
                    <div className="space-y-1 text-xs">
                      <p className={newPassword.length >= 8 ? 'text-green-600' : 'text-muted-foreground'}>
                        ✓ Pelo menos 8 caracteres especial (como @ # ! $ %)
                      </p>
                      <p className={/[0-9]/.test(newPassword) ? 'text-green-600' : 'text-muted-foreground'}>
                        ✓ Pelo menos 1 dígito entre 0 e 9
                      </p>
                      <p className={/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-muted-foreground'}>
                        ✓ Ao menos 1 caractere
                      </p>
                    </div>
                    {validationErrors.newPassword && (
                      <p className="text-sm text-red-600">{validationErrors.newPassword}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm-new-password" className="text-sm font-medium">
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
                        className={`pl-10 ${validationErrors.confirmNewPassword ? 'border-red-500' : ''}`}
                        required
                      />
                    </div>
                    {validationErrors.confirmNewPassword && (
                      <p className="text-sm text-red-600">{validationErrors.confirmNewPassword}</p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || loading}
                  >
                    {isLoading ? 'Salvando...' : 'Salvar'}
                  </Button>
                  
                  <div className="text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Clear recovery mode
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
            ) : (
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-1">
                  <TabsTrigger value="login">Login</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                        className={`pl-10 ${validationErrors.email ? 'border-red-500' : ''}`}
                        required
                        autoComplete="email"
                      />
                      {validationErrors.email && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.email}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                        className={`pl-10 ${validationErrors.password ? 'border-red-500' : ''}`}
                        required
                        autoComplete="current-password"
                      />
                      {validationErrors.password && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.password}</p>
                      )}
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || loading}
                  >
                    {isLoading ? 'Entrando...' : 'Entrar'}
                  </Button>
                  
                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => setResetFlow('forgot')}
                      className="text-muted-foreground hover:text-primary"
                    >
                      Esqueci minha senha
                    </Button>
                  </div>
                </form>

                {showForgotPassword && (
                  <div className="mt-4 p-4 border rounded-lg bg-muted/20">
                    <h3 className="text-sm font-medium mb-3">Recuperar Senha</h3>
                    <form onSubmit={handleResetPassword} className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="reset-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="reset-email"
                            type="email"
                            placeholder="seu@email.com"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            className={`pl-10 ${validationErrors.resetEmail ? 'border-red-500' : ''}`}
                            required
                          />
                          {validationErrors.resetEmail && (
                            <p className="text-sm text-red-600 mt-1">{validationErrors.resetEmail}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          type="submit" 
                          size="sm"
                          disabled={isLoading || loading}
                        >
                          {isLoading ? 'Enviando...' : 'Enviar Email'}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setShowForgotPassword(false);
                            setResetEmail('');
                            setValidationErrors({});
                          }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
              </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;