import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Wrench, 
  Construction, 
  Map, 
  Shield,
  TrendingUp,
  Clock,
  DollarSign,
  Users,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Hero Section */}
      <motion.section 
        className="relative overflow-hidden py-20 px-4"
        initial="initial"
        animate="animate"
        variants={stagger}
      >
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="container mx-auto max-w-6xl relative z-10">
          <motion.div className="text-center space-y-6" variants={fadeInUp}>
            <Badge variant="secondary" className="text-sm px-4 py-2">
              Sistema DIF - Diretoria de Infraestrutura Física
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              Transformando a Gestão da{' '}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Infraestrutura Pública
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Conheça nossos módulos e veja como o Sistema DIF facilita o trabalho de 
              planejamento, execução e controle das obras e manutenções.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button size="lg" className="gap-2" asChild>
                <Link to="/public/obras">
                  Ver Demonstração <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2" asChild>
                <Link to="/auth">
                  Acessar Sistema <Users className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Módulos Section */}
      <motion.section 
        className="py-16 px-4"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={stagger}
      >
        <div className="container mx-auto max-w-6xl">
          <motion.div className="text-center mb-12" variants={fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Módulos Integrados
            </h2>
            <p className="text-muted-foreground text-lg">
              Soluções completas para cada área de atuação
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Preventivo */}
            <motion.div variants={fadeInUp}>
              <Card className="h-full hover:shadow-lg transition-shadow duration-300 border-primary/20">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                    <Wrench className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-2xl">Preventivo</CardTitle>
                  <CardDescription className="text-base">
                    Gestão completa de manutenções preventivas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Mostra todas as manutenções preventivas realizadas nos prédios da Defensoria, 
                    com histórico de execução, fotos, relatórios e alertas de vencimento.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                      <span>Controle de cronogramas</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                      <span>Notificações automáticas</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                      <span>Relatórios técnicos</span>
                    </div>
                  </div>
                  <Button className="w-full" variant="outline" asChild>
                    <Link to="/public/preventivos">Visualizar (Público)</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Obras */}
            <motion.div variants={fadeInUp}>
              <Card className="h-full hover:shadow-lg transition-shadow duration-300 border-primary/20">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center mb-4">
                    <Construction className="h-6 w-6 text-orange-600" />
                  </div>
                  <CardTitle className="text-2xl">Obras</CardTitle>
                  <CardDescription className="text-base">
                    Acompanhamento físico-financeiro completo
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Gerencia todas as obras e reformas da Defensoria, com acompanhamento 
                    físico-financeiro, medições, aditivos e relatórios fotográficos.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                      <span>Painel consolidado por contrato</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                      <span>Relatórios de medição</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                      <span>Integração com orçamentos</span>
                    </div>
                  </div>
                  <Button className="w-full" variant="outline" asChild>
                    <Link to="/public/obras">Visualizar (Público)</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Núcleos */}
            <motion.div variants={fadeInUp}>
              <Card className="h-full hover:shadow-lg transition-shadow duration-300 border-primary/20">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4">
                    <Map className="h-6 w-6 text-amber-600" />
                  </div>
                  <CardTitle className="text-2xl">Núcleos</CardTitle>
                  <CardDescription className="text-base">
                    Gestão territorial inteligente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Reúne informações básicas dos núcleos da Defensoria (endereço, contatos, 
                    mapa e status) com visualização geográfica.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                      <span>Mapa interativo estadual</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                      <span>Integração com módulos</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                      <span>Cadastro completo</span>
                    </div>
                  </div>
                  <Button className="w-full" variant="outline" asChild>
                    <Link to="/public/nucleos">Visualizar (Público)</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Benefícios Section */}
      <motion.section 
        className="py-16 px-4 bg-secondary/30"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={stagger}
      >
        <div className="container mx-auto max-w-6xl">
          <motion.div className="text-center mb-12" variants={fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Por que escolher o Sistema DIF?
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div variants={fadeInUp}>
              <Card className="text-center h-full">
                <CardContent className="pt-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">Transparência</h3>
                  <p className="text-sm text-muted-foreground">
                    Controle centralizado e dados confiáveis
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="text-center h-full">
                <CardContent className="pt-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">Eficiência</h3>
                  <p className="text-sm text-muted-foreground">
                    Redução de retrabalho e falhas
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="text-center h-full">
                <CardContent className="pt-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">Tempo Real</h3>
                  <p className="text-sm text-muted-foreground">
                    Dados integrados instantaneamente
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="text-center h-full">
                <CardContent className="pt-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">Intuitivo</h3>
                  <p className="text-sm text-muted-foreground">
                    Interface moderna e fácil de usar
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Dashboard Stats Section */}
      <motion.section 
        className="py-16 px-4"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={stagger}
      >
        <div className="container mx-auto max-w-6xl">
          <motion.div className="text-center mb-12" variants={fadeInUp}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Sistema em Números
            </h2>
            <p className="text-muted-foreground text-lg">
              Resultados que fazem a diferença
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div variants={fadeInUp}>
              <Card className="text-center bg-gradient-to-br from-amber-500/10 to-transparent">
                <CardContent className="pt-6 pb-6">
                  <Map className="h-8 w-8 text-amber-600 mx-auto mb-3" />
                  <div className="text-4xl font-bold mb-1">48</div>
                  <div className="text-sm text-muted-foreground">Núcleos Ativos</div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="text-center bg-gradient-to-br from-blue-500/10 to-transparent">
                <CardContent className="pt-6 pb-6">
                  <Wrench className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                  <div className="text-4xl font-bold mb-1">312</div>
                  <div className="text-sm text-muted-foreground">Relatórios Preventivos</div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="text-center bg-gradient-to-br from-orange-500/10 to-transparent">
                <CardContent className="pt-6 pb-6">
                  <Construction className="h-8 w-8 text-orange-600 mx-auto mb-3" />
                  <div className="text-4xl font-bold mb-1">26</div>
                  <div className="text-sm text-muted-foreground">Obras em Andamento</div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="text-center bg-gradient-to-br from-green-500/10 to-transparent">
                <CardContent className="pt-6 pb-6">
                  <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-3" />
                  <div className="text-4xl font-bold mb-1">R$ 18M</div>
                  <div className="text-sm text-muted-foreground">Recursos Gerenciados</div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="border-t bg-secondary/50 py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold mb-3">Sistema DIF</h3>
              <p className="text-sm text-muted-foreground">
                Defensoria Pública do Estado de Mato Grosso
                <br />
                Diretoria de Infraestrutura Física
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Módulos</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/public/preventivos" className="hover:text-primary transition-colors">Preventivos (Público)</Link></li>
                <li><Link to="/public/obras" className="hover:text-primary transition-colors">Obras (Público)</Link></li>
                <li><Link to="/public/nucleos" className="hover:text-primary transition-colors">Núcleos (Público)</Link></li>
                <li><Link to="/auth" className="hover:text-primary transition-colors">Acessar Sistema</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Contato</h3>
              <p className="text-sm text-muted-foreground">
                Para mais informações sobre o sistema e demonstrações, entre em contato com a equipe DIF.
              </p>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>© 2025 Defensoria Pública do Estado de Mato Grosso. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
