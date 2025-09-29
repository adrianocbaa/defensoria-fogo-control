import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Mail, Lock, User, AlertTriangle, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
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

  // Check for password reset parameters
  useEffect(() => {
    const type = searchParams.get('type');
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    if (type === 'recovery' && accessToken && refreshToken) {
      // Set session with the tokens from URL
      const setSession = async () => {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (error) {
            toast({
              title: "Erro na recuperação",
              description: "Link de recuperação inválido ou expirado.",
              variant: "destructive",
            });
          } else {
            setShowNewPassword(true);
            toast({
              title: "Link válido",
              description: "Digite sua nova senha.",
            });
          }
        } catch (error) {
          toast({
            title: "Erro inesperado",
            description: "Tente novamente.",
            variant: "destructive",
          });
        }
      };
      
      setSession();
    }
  }, [searchParams, toast]);

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
          title: "Senha atualizada!",
          description: "Sua senha foi alterada com sucesso.",
        });
        setShowNewPassword(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Home Button */}
        <div className="mb-6">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Sistema
            </Button>
          </Link>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Sistema de Prevenção</CardTitle>
            <CardDescription>
              Acesse sua conta para gerenciar os núcleos
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {showNewPassword ? (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-medium">Definir Nova Senha</h3>
                  <p className="text-sm text-muted-foreground">Digite sua nova senha</p>
                </div>
                
                <form onSubmit={handleNewPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nova Senha</Label>
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
                      {validationErrors.newPassword && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.newPassword}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm-new-password">Confirmar Nova Senha</Label>
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
                      {validationErrors.confirmNewPassword && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.confirmNewPassword}</p>
                      )}
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || loading}
                  >
                    {isLoading ? 'Atualizando...' : 'Atualizar Senha'}
                  </Button>
                </form>
              </div>
            ) : (
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="signup">Cadastro</TabsTrigger>
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
                      onClick={() => setShowForgotPassword(true)}
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
              
              <TabsContent value="signup" className="space-y-4">
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Use uma senha forte com pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas e números.
                  </AlertDescription>
                </Alert>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome de Exibição</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Seu nome"
                        value={signupForm.displayName}
                        onChange={(e) => setSignupForm(prev => ({ ...prev, displayName: e.target.value }))}
                        className={`pl-10 ${validationErrors.displayName ? 'border-red-500' : ''}`}
                        required
                        autoComplete="name"
                        maxLength={100}
                      />
                      {validationErrors.displayName && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.displayName}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={signupForm.email}
                        onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
                        className={`pl-10 ${validationErrors.email ? 'border-red-500' : ''}`}
                        required
                        autoComplete="email"
                        maxLength={255}
                      />
                      {validationErrors.email && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.email}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={signupForm.password}
                        onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                        className={`pl-10 ${validationErrors.password ? 'border-red-500' : ''}`}
                        required
                        autoComplete="new-password"
                        minLength={8}
                        maxLength={128}
                      />
                      {validationErrors.password && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.password}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirmar Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="signup-confirm"
                        type="password"
                        placeholder="••••••••"
                        value={signupForm.confirmPassword}
                        onChange={(e) => setSignupForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className={`pl-10 ${validationErrors.confirmPassword ? 'border-red-500' : ''}`}
                        required
                        autoComplete="new-password"
                      />
                      {validationErrors.confirmPassword && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.confirmPassword}</p>
                      )}
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || loading}
                  >
                    {isLoading ? 'Cadastrando...' : 'Criar Conta'}
                  </Button>
                </form>
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