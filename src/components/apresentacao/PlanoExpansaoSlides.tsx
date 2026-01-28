import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2,
  Target,
  Scale,
  Users,
  Briefcase,
  CheckCircle2,
  BookOpen,
  Leaf,
  MapPin,
  Wrench,
  Home,
  FileText,
  Landmark
} from 'lucide-react';

// Importar imagens do plano de expansão
import planoCapa from '@/assets/apresentacao/plano-expansao-capa.jpg';
import planoObjetivos from '@/assets/apresentacao/plano-expansao-objetivos.jpg';
import planoJustificativas from '@/assets/apresentacao/plano-expansao-justificativas.jpg';
import planoDiretrizes from '@/assets/apresentacao/plano-expansao-diretrizes.jpg';
import planoIntervencoes from '@/assets/apresentacao/plano-expansao-intervencoes.jpg';
import planoEconucleos from '@/assets/apresentacao/plano-expansao-econucleos.jpg';

// Slide 1 - Capa do Plano de Expansão
export function PlanoExpansaoCapa() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
      <div className="bg-card border rounded-lg shadow-lg overflow-hidden max-w-4xl">
        <img 
          src={planoCapa} 
          alt="Plano de Expansão da Infraestrutura Física 2025-2026" 
          className="w-full h-auto"
        />
      </div>
    </div>
  );
}

// Slide 2 - Objetivos (imagem do PDF)
export function PlanoExpansaoObjetivosImg() {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4">
      <div className="bg-card border rounded-lg shadow-lg overflow-hidden max-w-4xl">
        <img 
          src={planoObjetivos} 
          alt="Objetivos do Plano de Expansão" 
          className="w-full h-auto"
        />
      </div>
    </div>
  );
}

// Slide 3 - Justificativas (imagem do PDF)
export function PlanoExpansaoJustificativasImg() {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4">
      <div className="bg-card border rounded-lg shadow-lg overflow-hidden max-w-4xl">
        <img 
          src={planoJustificativas} 
          alt="Justificativas do Plano de Expansão" 
          className="w-full h-auto"
        />
      </div>
    </div>
  );
}

// Slide 4 - Diretrizes e Metodologia (imagem do PDF)
export function PlanoExpansaoDiretrizesImg() {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4">
      <div className="bg-card border rounded-lg shadow-lg overflow-hidden max-w-4xl">
        <img 
          src={planoDiretrizes} 
          alt="Diretrizes e Metodologia do Plano de Expansão" 
          className="w-full h-auto"
        />
      </div>
    </div>
  );
}

// Slide 5 - Intervenções nas 25 Comarcas (imagem do PDF)
export function PlanoExpansaoIntervencoesImg() {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4">
      <div className="bg-card border rounded-lg shadow-lg overflow-hidden max-w-4xl">
        <img 
          src={planoIntervencoes} 
          alt="Intervenções nas 25 Comarcas Prioritárias" 
          className="w-full h-auto"
        />
      </div>
    </div>
  );
}

// Slide 6 - Econúcleos (imagem do PDF)
export function PlanoExpansaoEconucleosImg() {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4">
      <div className="bg-card border rounded-lg shadow-lg overflow-hidden max-w-4xl">
        <img 
          src={planoEconucleos} 
          alt="Construção de 18 Econúcleos" 
          className="w-full h-auto"
        />
      </div>
    </div>
  );
}

// Versão alternativa dos slides em formato de cards (caso as imagens não funcionem)

// Slide Objetivos em formato de cards
export function PlanoExpansaoObjetivos() {
  const objetivosEspecificos = [
    'Identificar e qualificar os espaços físicos utilizados atualmente nas comarcas',
    'Promover reformas, relocações ou construções de núcleos em condições inadequadas',
    'Estabelecer padrões institucionais de infraestrutura, layout e identidade visual',
    'Adequar os espaços às normas de acessibilidade, segurança e sustentabilidade',
    'Priorizar soluções com eficiência energética e respeito ambiental (econúcleos)',
    'Racionalizar o uso de recursos públicos com base em critérios técnicos'
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-emerald-800">
            <Target className="h-6 w-6" />
            Objetivo Geral
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-emerald-700">
            Aprimorar e ampliar a infraestrutura física dos núcleos da Defensoria Pública do Estado de Mato Grosso, 
            consolidando o atendimento presencial com qualidade, dignidade e efetividade em todo o território estadual.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Objetivos Específicos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid md:grid-cols-2 gap-3">
            {objetivosEspecificos.map((obj, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{obj}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// Slide Justificativas em formato de cards
export function PlanoExpansaoJustificativas() {
  const justificativas = [
    {
      icon: Scale,
      title: 'Jurídica',
      description: 'Respaldo na EC nº 80/2014 e LC Estadual nº 146/2003, garantindo autonomia para elaborar e executar política de infraestrutura.',
      color: 'text-blue-600 bg-blue-100'
    },
    {
      icon: Users,
      title: 'Social',
      description: 'Garantir acesso efetivo à justiça às populações vulneráveis, especialmente nos municípios com menor presença do Estado.',
      color: 'text-green-600 bg-green-100'
    },
    {
      icon: Briefcase,
      title: 'Administrativa',
      description: 'Racionalização dos recursos públicos com projetos padronizados, eficientes e com menor custo de manutenção.',
      color: 'text-amber-600 bg-amber-100'
    }
  ];

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {justificativas.map((j, i) => (
        <Card key={i} className="h-full">
          <CardHeader>
            <div className={`inline-flex p-3 rounded-full ${j.color} mb-2 w-fit`}>
              <j.icon className="h-6 w-6" />
            </div>
            <CardTitle className="text-lg">{j.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{j.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Slide Diretrizes e Metodologia em formato de cards
export function PlanoExpansaoDiretrizes() {
  const diretrizes = [
    { icon: Home, text: 'Prioridade para instalação em imóveis próprios (construção ou reforma)' },
    { icon: Users, text: 'Respeito às normas de acessibilidade (NBR 9050) e segurança predial' },
    { icon: Leaf, text: 'Instalação de núcleos sustentáveis' },
    { icon: Building2, text: 'Layout padronizado conforme projeto arquitetônico da equipe de Infraestrutura' }
  ];

  const metodologia = [
    'Classificação técnica das unidades (ruim, regular, bom, muito bom)',
    'Relatórios de vistoria técnica e manifestações das Diretorias',
    'Imóveis que já possuem projetos executivos',
    'Localidades com terreno disponível e prazos definidos',
    'Existência de imóvel próprio, locado ou possibilidade de cessão',
    'Potencial de demanda (população e vulnerabilidade)',
    'Localização estratégica e condições operacionais'
  ];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="bg-emerald-50">
          <CardTitle className="flex items-center gap-2 text-emerald-800">
            <BookOpen className="h-5 w-5" />
            Diretrizes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <ul className="space-y-3">
            {diretrizes.map((d, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <div className="p-1.5 rounded bg-emerald-100">
                  <d.icon className="h-4 w-4 text-emerald-600" />
                </div>
                <span>{d.text}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-blue-50">
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <FileText className="h-5 w-5" />
            Metodologia de Seleção
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <ul className="space-y-2">
            {metodologia.map((m, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// Slide Econúcleos em formato de cards
export function PlanoExpansaoEconucleos() {
  const pilares = [
    { 
      icon: Building2, 
      title: 'Padronização', 
      text: 'Modelo construtivo único, com layout funcional, compacto e adaptável' 
    },
    { 
      icon: Leaf, 
      title: 'Sustentabilidade', 
      text: 'Materiais ecológicos, captação de água, energia solar e eficiência energética' 
    },
    { 
      icon: Wrench, 
      title: 'Rapidez', 
      text: 'Projeto modular com menor tempo de implantação e menor custo de manutenção' 
    },
    { 
      icon: Landmark, 
      title: 'Dignidade', 
      text: 'Espaços adequados para defensores, servidores e acolhimento dos assistidos' 
    }
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-green-600 text-white p-3 rounded-full">
              <Leaf className="h-8 w-8" />
            </div>
            <div>
              <Badge className="bg-green-600 mb-1">18 Econúcleos</Badge>
              <h3 className="text-xl font-bold text-green-800">Construção de Unidades Sustentáveis</h3>
            </div>
          </div>
          <p className="text-green-700 text-sm">
            Unidades físicas padronizadas, sustentáveis e de baixo custo operacional para consolidar 
            a presença institucional em comarcas com atendimento exclusivamente virtual ou estruturas inadequadas.
          </p>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-4 gap-4">
        {pilares.map((p, i) => (
          <Card key={i} className="text-center">
            <CardContent className="p-4">
              <div className="inline-flex p-3 rounded-full bg-green-100 mb-3">
                <p.icon className="h-5 w-5 text-green-600" />
              </div>
              <h4 className="font-semibold mb-1">{p.title}</h4>
              <p className="text-xs text-muted-foreground">{p.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Critérios de Seleção dos Locais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-2 p-2 bg-muted rounded">
              <MapPin className="h-3 w-3 text-green-600" />
              <span>Terreno disponível</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted rounded">
              <Building2 className="h-3 w-3 text-amber-600" />
              <span>Estrutura deficitária atual</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted rounded">
              <Users className="h-3 w-3 text-blue-600" />
              <span>Demanda local identificada</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
