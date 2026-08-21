import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Home, Maximize2, Building2, Wrench, ClipboardCheck,
  FileSpreadsheet, Shield, Mail, Users, CheckCircle2, TrendingUp,
  FileText, Lock, Zap, BarChart3, Sparkles, Camera, MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

/* =========================================================================
   Blocos de construção
   ========================================================================= */
function SlideShell({
  eyebrow, title, subtitle, children, dark = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div className={`relative h-full w-full flex flex-col p-10 rounded-2xl overflow-hidden ${dark ? 'text-white' : 'text-slate-800'}`}
      style={{
        background: dark
          ? 'linear-gradient(135deg,#022c22 0%,#065f46 60%,#0e7490 100%)'
          : 'linear-gradient(180deg,#ffffff 0%,#f8fafc 100%)',
      }}>
      {!dark && <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(90deg,#065f46,#0ea5e9)' }} />}
      {eyebrow && (
        <span className={`text-[11px] font-semibold tracking-[0.2em] uppercase mb-2 ${dark ? 'text-emerald-200' : 'text-emerald-700'}`}>
          {eyebrow}
        </span>
      )}
      <h1 className="text-3xl md:text-[2.6rem] font-bold tracking-tight leading-[1.1] mb-2">{title}</h1>
      {subtitle && (
        <p className={`text-base md:text-lg mb-6 ${dark ? 'text-emerald-50/90' : 'text-slate-600'}`}>{subtitle}</p>
      )}
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

function StatCard({ value, label, hint, icon: Icon, tone = 'emerald' }: {
  value: string; label: string; hint?: string; icon?: any; tone?: 'emerald' | 'blue' | 'amber' | 'slate';
}) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-200 text-emerald-800',
    blue: 'from-sky-500/10 to-sky-500/5 border-sky-200 text-sky-800',
    amber: 'from-amber-500/10 to-amber-500/5 border-amber-200 text-amber-800',
    slate: 'from-slate-500/10 to-slate-500/5 border-slate-200 text-slate-800',
  };
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-5 ${tones[tone]}`}>
      {Icon && <Icon className="h-5 w-5 mb-3 opacity-70" />}
      <div className="text-[2.6rem] font-bold leading-none">{value}</div>
      <div className="mt-2 text-sm font-medium text-slate-700">{label}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

function BenefitRow({ icon: Icon, title, desc, tone = 'emerald' }: {
  icon: any; title: string; desc: string; tone?: 'emerald' | 'blue' | 'amber';
}) {
  const bg = { emerald: 'bg-emerald-100 text-emerald-700', blue: 'bg-sky-100 text-sky-700', amber: 'bg-amber-100 text-amber-700' }[tone];
  return (
    <div className="flex gap-4 items-start">
      <div className={`shrink-0 h-11 w-11 rounded-xl flex items-center justify-center ${bg}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-semibold text-slate-800">{title}</h3>
        <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

/* =========================================================================
   Slides — 8 no total, diretos e objetivos
   ========================================================================= */

// 1 — Capa com a mensagem-chave
function S1Capa() {
  return (
    <div className="relative h-full w-full rounded-2xl overflow-hidden text-white flex flex-col justify-between p-12"
      style={{ background: 'linear-gradient(135deg,#022c22 0%,#065f46 60%,#0e7490 100%)' }}>
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="absolute -bottom-40 -left-24 w-[420px] h-[420px] rounded-full bg-sky-400/20 blur-3xl" />

      <div className="relative flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-[0.3em] uppercase text-emerald-100/90">
          Defensoria Pública · MT · DIF
        </span>
        <span className="text-[11px] font-semibold tracking-[0.3em] uppercase text-emerald-100/90">
          Apresentação à Defensoria Pública-Geral
        </span>
      </div>

      <div className="relative">
        <h1 className="text-7xl font-bold leading-[1.02] tracking-tight mb-4">SiDIF</h1>
        <p className="text-2xl md:text-3xl font-light text-emerald-50/95 max-w-4xl leading-snug">
          Toda a infraestrutura física da Defensoria — <span className="font-semibold text-white">obras, medições, fiscalização e manutenção</span> — em um único sistema, com dado rastreável e documento oficial gerado automaticamente.
        </p>
        <div className="mt-8 w-24 h-1 rounded-full bg-gradient-to-r from-emerald-300 to-sky-300" />
      </div>

      <div className="relative grid grid-cols-4 gap-4">
        {[
          ['21', 'obras gerenciadas'],
          ['R$ 5,49 mi', 'em contratos'],
          ['252', 'RDOs registrados'],
          ['100%', 'auditável'],
        ].map(([v, l]) => (
          <div key={l} className="rounded-xl bg-white/10 backdrop-blur border border-white/20 px-4 py-3">
            <div className="text-2xl font-bold">{v}</div>
            <div className="text-xs text-emerald-100/80">{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 2 — Antes x Depois (mensagem de impacto)
function S2AntesDepois() {
  return (
    <SlideShell
      eyebrow="O problema e a virada"
      title="Saímos de planilhas e pastas de rede para um processo único."
      subtitle="Mesma equipe, mesmo orçamento — processo padronizado e controlado."
    >
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-2xl border-2 border-dashed border-red-200 bg-red-50/40 p-6">
          <div className="text-xs font-semibold tracking-[0.2em] uppercase text-red-700 mb-4">Antes</div>
          <ul className="space-y-3 text-[15px] text-slate-700">
            <li className="flex gap-2"><span className="text-red-500">•</span> Medições em planilhas Excel, sem conferência automática</li>
            <li className="flex gap-2"><span className="text-red-500">•</span> Sem RDO — obra sem registro diário do que foi executado</li>
            <li className="flex gap-2"><span className="text-red-500">•</span> Chamados de manutenção controlados por e-mail e planilha</li>
            <li className="flex gap-2"><span className="text-red-500">•</span> Documentos de encerramento refeitos do zero a cada obra</li>
            <li className="flex gap-2"><span className="text-red-500">•</span> Sem histórico, sem auditoria, sem indicadores</li>
          </ul>
        </div>
        <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-6">
          <div className="text-xs font-semibold tracking-[0.2em] uppercase text-emerald-700 mb-4">Com o SiDIF</div>
          <ul className="space-y-3 text-[15px] text-slate-700">
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-1" /> Uma única fonte da verdade para toda a DIF</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-1" /> Registro diário com foto datada e verificável</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-1" /> E-mail vira chamado automaticamente, com prazo e responsável</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-1" /> TRP, TRD, ACT e ARTs gerados em um clique</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-1" /> Trilha de auditoria de cada ação, por usuário</li>
          </ul>
        </div>
      </div>
      <div className="mt-5 rounded-xl bg-slate-900 text-white p-4 text-center">
        <span className="text-[15px]">
          <strong className="text-emerald-300">−57% de etapas manuais</strong> no fluxo de manutenção · <strong className="text-emerald-300">zero</strong> dupla digitação entre RDO e medição
        </span>
      </div>
    </SlideShell>
  );
}

// 3 — Números
function S3Numeros() {
  return (
    <SlideShell
      eyebrow="Panorama"
      title="O SiDIF hoje, em produção."
      subtitle="Números reais registrados no sistema — não é protótipo."
    >
      <div className="grid grid-cols-4 gap-4 mb-4">
        <StatCard value="21" label="Obras gerenciadas" hint="em 18 municípios" icon={Building2} tone="emerald" />
        <StatCard value="R$ 5,49 mi" label="Contratos sob controle" hint="R$ 3,99 mi executados (73%)" icon={TrendingUp} tone="emerald" />
        <StatCard value="252" label="RDOs preenchidos" hint="329 fotos e vídeos rastreáveis" icon={ClipboardCheck} tone="blue" />
        <StatCard value="42" label="Documentos oficiais" hint="TRP · TRD · ACT · ARTs" icon={FileText} tone="blue" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <StatCard value="45" label="Chamados de manutenção" hint="32 concluídos · 13 em curso" icon={Wrench} tone="amber" />
        <StatCard value="62%" label="Chamados abertos por e-mail" hint="sem digitação manual" icon={Mail} tone="amber" />
        <StatCard value="18" label="Aditivos formalizados" hint="com trilha auditável" icon={FileSpreadsheet} tone="slate" />
        <StatCard value="36" label="Usuários ativos" hint="12 núcleos · perfis segregados" icon={Users} tone="slate" />
      </div>
    </SlideShell>
  );
}

// 4 — O ciclo completo da obra
function S4CicloObra() {
  const etapas = [
    { icon: MapPin, t: 'Planejamento', d: 'Obra cadastrada, fiscal e substituto nomeados, orçamento importado.' },
    { icon: Camera, t: 'RDO diário', d: 'Contratada registra execução e fotos; avanço físico é recalculado sozinho.' },
    { icon: FileSpreadsheet, t: 'Medição', d: 'Importa o RDO, calcula, congela e emite o relatório oficial.' },
    { icon: ClipboardCheck, t: 'Recebimento', d: 'Checklist por ambiente, pendências com foto antes/depois e reinspeção.' },
    { icon: FileText, t: 'Encerramento', d: 'TRP, TRD, ACT e ARTs no padrão institucional, em um clique.' },
  ];
  return (
    <SlideShell
      eyebrow="Módulo Obras"
      title="Um único fluxo, do contrato à entrega da unidade."
      subtitle="Cada etapa alimenta a seguinte — nada é redigitado, nada se perde."
    >
      <div className="grid grid-cols-5 gap-3">
        {etapas.map((e, i) => (
          <div key={e.t} className="relative rounded-2xl border bg-white p-5 shadow-sm">
            <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-emerald-700 text-white text-sm font-bold flex items-center justify-center shadow-md">
              {i + 1}
            </div>
            <e.icon className="h-6 w-6 text-emerald-700 mb-3 mt-2" />
            <h3 className="font-semibold text-slate-900 mb-1.5">{e.t}</h3>
            <p className="text-[13px] text-slate-600 leading-relaxed">{e.d}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
          <div className="text-xs uppercase tracking-wider text-emerald-800 font-semibold">Avanço físico</div>
          <div className="text-2xl font-bold text-emerald-900 mt-1">Automático</div>
          <div className="text-xs text-emerald-800/80 mt-1">calculado no banco, sem planilha paralela</div>
        </div>
        <div className="rounded-xl bg-sky-50 border border-sky-200 p-4">
          <div className="text-xs uppercase tracking-wider text-sky-800 font-semibold">Cálculo financeiro</div>
          <div className="text-2xl font-bold text-sky-900 mt-1">Blindado</div>
          <div className="text-xs text-sky-800/80 mt-1">arredondamento único e medições congeladas</div>
        </div>
        <div className="rounded-xl bg-slate-50 border p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Evidência</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">Foto verificável</div>
          <div className="text-xs text-slate-500 mt-1">marca d'água, data e QR code de conferência</div>
        </div>
      </div>
    </SlideShell>
  );
}

// 5 — Manutenção automatizada
function S5Manutencao() {
  return (
    <SlideShell
      eyebrow="Módulo Manutenção"
      title="O e-mail entra, o sistema resolve o resto."
      subtitle="Um processo que tinha 7 ações manuais hoje exige 3."
      dark
    >
      <div className="grid grid-cols-5 gap-4">
        {[
          { icon: Mail, label: 'Solicitante envia e-mail', hint: 'sem login, sem formulário' },
          { icon: Zap, label: 'Sistema cria o chamado', hint: 'prioridade e núcleo detectados' },
          { icon: Wrench, label: 'Equipe executa', hint: 'fotos de referência e execução' },
          { icon: CheckCircle2, label: 'Solicitante confirma', hint: 'por link público, com cobrança automática' },
          { icon: FileText, label: 'Arquivado em PDF', hint: 'histórico, fotos e conversas' },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-5 flex flex-col">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
              <s.icon className="h-5 w-5 text-white" />
            </div>
            <div className="text-xs opacity-70 mb-1">Etapa {i + 1}</div>
            <div className="font-semibold text-white text-sm leading-tight">{s.label}</div>
            <div className="text-xs text-emerald-100/80 mt-1">{s.hint}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-3 gap-4">
        {[
          ['62%', 'dos chamados entram sozinhos pelo e-mail'],
          ['71%', 'taxa de resolução — 32 de 45 chamados'],
          ['87', 'movimentações auditadas: quem, quando, de/para'],
        ].map(([v, d]) => (
          <div key={d} className="rounded-xl bg-white/10 border border-white/20 p-4">
            <div className="text-3xl font-bold">{v}</div>
            <div className="text-xs text-emerald-100/85 mt-1">{d}</div>
          </div>
        ))}
      </div>
    </SlideShell>
  );
}

// 6 — Governança e segurança
function S6Governanca() {
  return (
    <SlideShell
      eyebrow="Governança"
      title="Controle, sigilo e prestação de contas por padrão."
      subtitle="Segurança aplicada no banco de dados — não depende da tela nem do usuário."
    >
      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-4">
          <BenefitRow icon={Lock} title="Acesso segregado por perfil" desc="Regras aplicadas no próprio banco: cada perfil enxerga estritamente o seu escopo." />
          <BenefitRow icon={Shield} title="Responsabilidade nominal" desc="Fiscal vê apenas as suas obras; substitutos formalizados em férias ou impedimento." />
          <BenefitRow icon={ClipboardCheck} title="Auditoria de cada ação" desc="Autor, data e valores antes/depois em toda alteração relevante." />
          <BenefitRow icon={BarChart3} title="Bloqueios automáticos" desc="Impede execução acima do contratado e medição sobre item já bloqueado." />
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 flex flex-col justify-center">
          <div className="text-xs font-semibold tracking-[0.3em] uppercase text-emerald-300 mb-4">Perfis de acesso</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Admin/GM', 'Visão total'],
              ['Fiscal', 'Suas obras'],
              ['Contratada', 'Seus RDOs'],
              ['Manutenção', 'Chamados'],
              ['Público', 'Confirmação'],
              ['Auditoria', 'Só leitura'],
            ].map(([p, d]) => (
              <div key={p} className="rounded-lg bg-white/5 border border-white/10 p-3">
                <div className="font-semibold text-sm">{p}</div>
                <div className="text-xs text-emerald-100/70">{d}</div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs text-emerald-100/70 leading-relaxed">
            Dados públicos de obras e núcleos podem ser expostos em portal de transparência sem abrir o cadastro interno.
          </p>
        </div>
      </div>
    </SlideShell>
  );
}

// 7 — Valor para a DPG
function S7Valor() {
  return (
    <SlideShell
      eyebrow="Por que isso importa para a Defensoria"
      title="Decisão baseada em dado, e não em relato."
      subtitle="O que a administração superior passa a ter, todos os dias."
    >
      <div className="grid grid-cols-2 gap-x-10 gap-y-5">
        <BenefitRow icon={BarChart3} title="Painel executivo em tempo real"
          desc="Carteira inteira: valor contratado, executado, saldo, avanço físico e obras em risco." />
        <BenefitRow icon={Sparkles} title="Plano de expansão acompanhado" tone="blue"
          desc="Metas de comarcas e econúcleos com estágio, próximo passo e responsável — sem cobrar relatório." />
        <BenefitRow icon={Shield} title="Segurança jurídica" tone="amber"
          desc="Prova documental de tudo que foi executado, pago e recebido, pronta para controle interno e TCE." />
        <BenefitRow icon={Zap} title="Ganho de produtividade" tone="blue"
          desc="A mesma equipe atende mais obras e mais chamados sem aumentar o esforço administrativo." />
        <BenefitRow icon={Users} title="Padrão único na instituição"
          desc="Do interior à capital, todo fiscal e toda contratada seguem o mesmo processo." />
        <BenefitRow icon={CheckCircle2} title="Custo institucional reduzido" tone="amber"
          desc="Sistema desenvolvido internamente pela DIF, sem contratação de software de mercado." />
      </div>
    </SlideShell>
  );
}

// 8 — Fechamento
function S8Fechamento() {
  return (
    <div className="relative h-full w-full rounded-2xl overflow-hidden text-white flex flex-col p-12"
      style={{ background: 'linear-gradient(135deg,#022c22 0%,#065f46 60%,#0e7490 100%)' }}>
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="absolute -bottom-40 -left-24 w-[420px] h-[420px] rounded-full bg-sky-400/20 blur-3xl" />

      <div className="relative flex-1 flex flex-col justify-center max-w-4xl">
        <span className="text-[11px] font-semibold tracking-[0.3em] uppercase text-emerald-100/90 mb-4">Próximos passos</span>
        <h1 className="text-6xl md:text-7xl font-bold leading-[1.02] tracking-tight mb-6">
          Já está em produção.
        </h1>
        <p className="text-2xl font-light text-emerald-50/95 mb-10 leading-snug">
          O que pedimos é a adoção institucional plena — para que toda obra e todo chamado da Defensoria nasçam dentro do SiDIF.
        </p>
        <div className="grid grid-cols-3 gap-4">
          {[
            ['Curto prazo', 'Adoção plena nos 12 núcleos e nas obras em andamento'],
            ['Médio prazo', 'Preventivos, Almoxarifado e Fluxo de Contratos'],
            ['Longo prazo', 'Integração com SEI e Portal da Transparência'],
          ].map(([t, d]) => (
            <div key={t} className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-4">
              <div className="text-xs uppercase tracking-widest text-emerald-200 mb-1">{t}</div>
              <div className="text-sm text-white leading-snug">{d}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative flex items-end justify-between">
        <div>
          <p className="text-sm font-semibold">Diretoria de Infraestrutura Física</p>
          <p className="text-xs text-emerald-100/70">Defensoria Pública do Estado de Mato Grosso</p>
        </div>
        <div className="text-right text-xs text-emerald-100/70">sidif.com.br</div>
      </div>
    </div>
  );
}

/* =========================================================================
   Página
   ========================================================================= */
const SLIDES: { id: number; render: () => JSX.Element }[] = [
  { id: 1, render: S1Capa },
  { id: 2, render: S2AntesDepois },
  { id: 3, render: S3Numeros },
  { id: 4, render: S4CicloObra },
  { id: 5, render: S5Manutencao },
  { id: 6, render: S6Governanca },
  { id: 7, render: S7Valor },
  { id: 8, render: S8Fechamento },
];

export default function ApresentacaoDiretoria() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const total = SLIDES.length;

  useEffect(() => {
    document.title = `${current + 1}/${total} — SiDIF · Apresentação DPG`;
  }, [current, total]);

  const requestFullscreen = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        setCurrent((c) => Math.min(total - 1, c + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setCurrent((c) => Math.max(0, c - 1));
      } else if (e.key === 'Home') setCurrent(0);
      else if (e.key === 'End') setCurrent(total - 1);
      else if (e.key.toLowerCase() === 'f') requestFullscreen();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [total]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* Toolbar */}
      <div className="border-b bg-white/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-6 py-2.5 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <Home className="h-4 w-4" />
          </Button>
          <div className="text-xs text-slate-500 font-medium">
            Slide {current + 1} de {total}
          </div>
          <div className="flex-1">
            <Progress value={((current + 1) / total) * 100} className="h-1" />
          </div>
          <div className="hidden md:flex gap-1">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all ${i === current ? 'w-6 bg-emerald-700' : 'w-2 bg-slate-300 hover:bg-slate-400'}`}
                aria-label={`Ir para slide ${i + 1}`}
              />
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={requestFullscreen} className="gap-2">
            <Maximize2 className="h-4 w-4" />
            <span className="hidden md:inline">Tela cheia</span>
          </Button>
        </div>
      </div>

      {/* Slide */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[1280px] aspect-[16/9] max-h-[calc(100vh-180px)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.28 }}
              className="h-full w-full shadow-2xl rounded-2xl"
            >
              {SLIDES[current].render()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Nav inferior */}
      <div className="border-t bg-white/80 backdrop-blur">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between">
          <Button variant="outline" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
            <ChevronLeft className="h-4 w-4 mr-2" /> Anterior
          </Button>
          <span className="text-xs text-slate-500">← → para navegar · <kbd className="px-1.5 py-0.5 bg-slate-100 rounded border">F</kbd> tela cheia</span>
          <Button onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))} disabled={current === total - 1}>
            Próximo <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
