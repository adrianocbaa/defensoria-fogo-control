import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Home, Maximize2, Building2, Wrench, ClipboardCheck,
  FileSpreadsheet, Shield, Mail, MapPin, Users, CheckCircle2, TrendingUp,
  Camera, FileText, Lock, Bell, Zap, BarChart3, ArrowRight, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

/* =========================================================================
   Paleta institucional (verde DPMT + acentos)
   ========================================================================= */
const brand = {
  primary: '#065f46',   // emerald-800
  primarySoft: '#d1fae5',
  accent: '#0369a1',    // blue-700
  ink: '#0f172a',
  muted: '#475569',
};

/* =========================================================================
   Building blocks
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
          ? 'linear-gradient(135deg,#064e3b 0%,#065f46 55%,#0f766e 100%)'
          : 'linear-gradient(180deg,#ffffff 0%,#f8fafc 100%)',
      }}>
      {/* faixa verde superior */}
      {!dark && <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(90deg,#065f46,#0ea5e9)' }} />}
      <div className="flex items-baseline justify-between mb-2">
        {eyebrow && (
          <span className={`text-[11px] font-semibold tracking-[0.2em] uppercase ${dark ? 'text-emerald-200' : 'text-emerald-700'}`}>
            {eyebrow}
          </span>
        )}
      </div>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-1">{title}</h1>
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
      <div className="text-4xl font-bold leading-none">{value}</div>
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
   Slides
   ========================================================================= */

// 1 — Capa
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
          Julho / 2026
        </span>
      </div>

      <div className="relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 mb-6">
          <Sparkles className="h-3.5 w-3.5 text-emerald-200" />
          <span className="text-xs font-medium tracking-wide">Apresentação à Diretoria Geral</span>
        </div>
        <h1 className="text-6xl md:text-7xl font-bold leading-[1.02] tracking-tight mb-4">
          SiDIF
        </h1>
        <p className="text-2xl md:text-3xl font-light text-emerald-50/90 max-w-3xl leading-snug">
          Sistema de gestão da Diretoria de Infraestrutura Física — módulos <span className="font-semibold text-white">Obras</span> e <span className="font-semibold text-white">Manutenção</span>.
        </p>
        <div className="mt-8 w-24 h-1 rounded-full bg-gradient-to-r from-emerald-300 to-sky-300" />
      </div>

      <div className="relative flex items-end justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Diretoria de Infraestrutura Física</p>
          <p className="text-xs text-emerald-100/70">Defensoria Pública do Estado de Mato Grosso</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-emerald-100/70">sidif.com.br</p>
        </div>
      </div>
    </div>
  );
}

// 2 — Contexto / o problema que resolvemos
function S2Contexto() {
  return (
    <SlideShell
      eyebrow="Contexto"
      title="Antes do SiDIF, as informações eram armazenadas em pastas localizadas na rede."
      subtitle="Planilhas em servidor, e-mails e pastas de fotos sem rastro, sem padrão, com difícil visibilidade."
    >
      <div className="grid grid-cols-2 gap-6 h-full">
        <div className="rounded-2xl border-2 border-dashed border-red-200 bg-red-50/40 p-6">
          <div className="text-xs font-semibold tracking-[0.2em] uppercase text-red-700 mb-4">Antes</div>
          <ul className="space-y-3 text-sm text-slate-700">
            <li className="flex gap-2"><span className="text-red-500">•</span> Medições em planilhas Excel&nbsp;</li>
            <li className="flex gap-2"><span className="text-red-500">•</span> Sem RDO's</li>
            <li className="flex gap-2"><span className="text-red-500">•</span> Chamados de manutenção por e-mail e controle por planilhas</li>
            <li className="flex gap-2"><span className="text-red-500">•</span> Encerramento (TRP/TRD/ACT) refeito do zero a cada obra</li>
            <li className="flex gap-2"><span className="text-red-500">•</span> Sem histórico, difícil auditoria, sem indicadores</li>
          </ul>
        </div>
        <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6">
          <div className="text-xs font-semibold tracking-[0.2em] uppercase text-emerald-700 mb-4">Com o SiDIF</div>
          <ul className="space-y-3 text-sm text-slate-700">
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> Uma única fonte — Obras, Medição, RDO e Manutenção</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> Coleta de dados no canteiro, com fotos georreferenciadas</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> Na Manutenção, o e-mail vira tarefa automaticamente</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> Documentos institucionais gerados em 1 clique</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> Trilha de auditoria completa por perfil e ação</li>
          </ul>
        </div>
      </div>
    </SlideShell>
  );
}

// 3 — KPIs do sistema hoje (dados reais)
function S3Numeros() {
  return (
    <SlideShell
      eyebrow="Panorama"
      title="O SiDIF em números — hoje."
      subtitle="Dados reais em produção — obras, medições, RDOs e chamados registrados no sistema."
    >
      <div className="grid grid-cols-4 gap-4 mb-5">
        <StatCard value="21" label="Obras cadastradas" hint="em 18 municípios" icon={Building2} tone="emerald" />
        <StatCard value="R$ 5,49 mi" label="Contratos gerenciados" hint="R$ 3,99 mi executados (73%)" icon={TrendingUp} tone="emerald" />
        <StatCard value="252" label="RDOs preenchidos" hint="329 fotos e vídeos rastreáveis" icon={ClipboardCheck} tone="blue" />
        <StatCard value="42" label="Docs de encerramento" hint="TRP · TRD · ACT · ARTs" icon={FileText} tone="blue" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <StatCard value="45" label="Chamados de manutenção" hint="32 concluídos · 13 em curso" icon={Wrench} tone="amber" />
        <StatCard value="62%" label="Chamados via e-mail" hint="28 abertos automaticamente" icon={Mail} tone="amber" />
        <StatCard value="18" label="Aditivos formalizados" hint="registro auditável" icon={FileSpreadsheet} tone="slate" />
        <StatCard value="36" label="Usuários ativos" hint="12 núcleos · perfis segregados" icon={Users} tone="slate" />
      </div>
    </SlideShell>
  );
}

// 4 — Módulo Obras
function S4Obras() {
  return (
    <SlideShell
      eyebrow="Módulo 01"
      title="Obras — do planejamento à entrega, em um só lugar."
      subtitle="Mapa geográfico, filtros por status, contratos, fiscais e substitutos vinculados a cada obra."
    >
      <div className="grid grid-cols-5 gap-6 h-full">
        <div className="col-span-2 space-y-5">
          <BenefitRow icon={MapPin} title="Mapa institucional" desc="Todas as 21 obras plotadas por município, com pinos que refletem status em tempo real." />
          <BenefitRow icon={Users} title="Fiscais e substitutos" desc="Cadastro nominal, com regras de acesso e trilha de responsabilidade por obra." />
          <BenefitRow icon={FileSpreadsheet} title="Orçamento e aditivos" desc="Importação por planilha, hierarquia de itens, aditivos formalizados sem retrabalho." />
          <BenefitRow icon={Shield} title="Acesso segregado" desc="Cada fiscal vê apenas as obras sob sua responsabilidade — sem exposição indevida." />
        </div>
        <div className="col-span-3 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold tracking-[0.2em] uppercase text-slate-500 mb-4">Distribuição das obras</div>
          {[
            { label: 'Em andamento', value: 6, pct: 29, color: 'bg-emerald-500' },
            { label: 'Concluídas', value: 12, pct: 57, color: 'bg-sky-500' },
            { label: 'Planejadas', value: 3, pct: 14, color: 'bg-amber-500' },
          ].map((s) => (
            <div key={s.label} className="mb-4">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="font-medium text-slate-700">{s.label}</span>
                <span className="font-semibold text-slate-900">{s.value} <span className="text-slate-400 font-normal">· {s.pct}%</span></span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div className={`h-full ${s.color} rounded-full`} style={{ width: `${s.pct}%` }} />
              </div>
            </div>
          ))}
          <div className="mt-6 pt-4 border-t border-dashed">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Alcance geográfico</div>
            <div className="text-3xl font-bold text-emerald-700">18 municípios</div>
            <div className="text-xs text-slate-500">de Rondonópolis a Sinop, atendidos pela DIF</div>
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

// 5 — RDO
function S5RDO() {
  return (
    <SlideShell
      eyebrow="Coleta de dados"
      title="RDO — o canteiro alimenta o sistema, todos os dias."
      subtitle="O Relatório Diário de Obra é a base de tudo: fotos, avanço físico, mão de obra e ocorrências."
    >
      <div className="grid grid-cols-3 gap-5 h-full">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <Camera className="h-6 w-6 text-emerald-700 mb-3" />
          <div className="text-3xl font-bold text-slate-900">329</div>
          <div className="text-sm text-slate-600 mt-1">fotos e vídeos anexados</div>
          <p className="text-xs text-slate-500 mt-3 leading-relaxed">
            Cada mídia fica vinculada à data e ao serviço executado, com marca d'água e verificação por QR code.
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <ClipboardCheck className="h-6 w-6 text-emerald-700 mb-3" />
          <div className="text-3xl font-bold text-slate-900">252</div>
          <div className="text-sm text-slate-600 mt-1">RDOs registrados</div>
          <p className="text-xs text-slate-500 mt-3 leading-relaxed">
            Fluxo de aprovação por fiscal, com histórico de reprovações e assinatura digital de contratada e fiscal.
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <BarChart3 className="h-6 w-6 text-emerald-700 mb-3" />
          <div className="text-3xl font-bold text-slate-900">Automático</div>
          <div className="text-sm text-slate-600 mt-1">cálculo do avanço físico</div>
          <p className="text-xs text-slate-500 mt-3 leading-relaxed">
            Percentual da obra recalculado no banco a cada RDO aprovado — sem planilha paralela.
          </p>
        </div>
      </div>
      <div className="mt-5 rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3">
        <Zap className="h-5 w-5 text-emerald-700 shrink-0" />
        <p className="text-sm text-emerald-900">
          <strong>Padronização:</strong> mesmo formato de coleta em toda a DIF — não importa se a obra é em Cuiabá ou em Barra do Garças.
        </p>
      </div>
    </SlideShell>
  );
}

// 6 — Medição
function S6Medicao() {
  return (
    <SlideShell
      eyebrow="Do RDO ao pagamento"
      title="Medição — sem retrabalho, sem dupla digitação."
      subtitle="O que foi executado no RDO é importado direto para a medição. O sistema calcula, congela e gera o relatório."
    >
      <div className="grid grid-cols-4 gap-4 h-full">
        {[
          { step: '1', title: 'RDO diário', desc: 'Contratada informa quantitativos executados no canteiro.' },
          { step: '2', title: 'Importa no SiDIF', desc: 'Um clique traz tudo para a medição — sem redigitar.' },
          { step: '3', title: 'Ajustes e aprovação', desc: 'Fiscal revisa, ajusta se necessário e bloqueia a medição.' },
          { step: '4', title: 'Relatório oficial', desc: 'PDF/Word gerado com resumo financeiro, fotos e assinaturas.' },
        ].map((s, i) => (
          <div key={i} className="relative rounded-2xl border bg-white p-5 shadow-sm">
            <div className="absolute -top-3 -left-3 h-9 w-9 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center shadow-md">
              {s.step}
            </div>
            <h3 className="font-semibold text-slate-900 mt-3 mb-2">{s.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{s.desc}</p>
            {i < 3 && (
              <ArrowRight className="hidden md:block absolute -right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
            )}
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-slate-50 border p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">Aditivos formalizados</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">18 sessões bloqueadas</div>
          <div className="text-xs text-slate-500 mt-1">com trilha de auditoria completa</div>
        </div>
        <div className="rounded-xl bg-slate-50 border p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">Valor executado</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">R$ 3,99 mi</div>
          <div className="text-xs text-slate-500 mt-1">73% dos contratos vigentes</div>
        </div>
        <div className="rounded-xl bg-slate-50 border p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">Cálculos protegidos</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">100% no banco</div>
          <div className="text-xs text-slate-500 mt-1">arredondamento consistente e blindado</div>
        </div>
      </div>
    </SlideShell>
  );
}

// 7 — Encerramento
function S7Encerramento() {
  return (
    <SlideShell
      eyebrow="Encerramento de obra"
      title="TRP, TRD, ACT e ARTs — gerados em 1 clique."
      subtitle="Os documentos institucionais do encerramento saem prontos, no padrão da Defensoria."
    >
      <div className="grid grid-cols-2 gap-8 h-full">
        <div>
          <div className="grid grid-cols-2 gap-3">
            {['TRP · Termo de Recebimento Provisório', 'TRD · Termo de Recebimento Definitivo', 'ACT · Ata de Conclusão Técnica', 'Registro múltiplo de ARTs por serviço'].map((d) => (
              <div key={d} className="rounded-xl border bg-white p-4 shadow-sm">
                <FileText className="h-5 w-5 text-emerald-700 mb-2" />
                <p className="text-sm font-medium text-slate-800 leading-tight">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-800 text-white p-6">
            <div className="text-xs uppercase tracking-[0.2em] opacity-80 mb-2">Já produzidos no sistema</div>
            <div className="text-5xl font-bold">42</div>
            <div className="text-sm opacity-90 mt-1">documentos oficiais gerados sem retrabalho</div>
          </div>
        </div>
        <div className="space-y-4">
          <BenefitRow icon={CheckCircle2} title="Padrão institucional" desc="Cabeçalho, assinaturas do fiscal e da DIF, brasão — tudo na identidade oficial." />
          <BenefitRow icon={Shield} title="Assinatura digital" desc="Fluxo de assinantes cadastrado por documento, com validade auditável." />
          <BenefitRow icon={Sparkles} title="Sem planilha externa" desc="Sistemas, serviços entregues e ARTs saem direto do que foi registrado durante a obra." />
          <BenefitRow icon={FileSpreadsheet} title="Reaproveitamento" desc="Modelos institucionais mantidos pela DIF — mudou o padrão, muda para todos." />
        </div>
      </div>
    </SlideShell>
  );
}

// 8 — Manutenção — capa do módulo
function S8ManutencaoCapa() {
  return (
    <SlideShell
      eyebrow="Módulo 02"
      title="Manutenção — do e-mail ao arquivamento, sem intervenção manual."
      subtitle="O fluxo que era 100% manual agora é ponta-a-ponta automatizado."
      dark
    >
      <div className="grid grid-cols-5 gap-4 h-full items-stretch">
        {[
          { icon: Mail, label: 'Solicitante envia e-mail', hint: 'manutencao@dp.mt.gov.br' },
          { icon: Zap, label: 'Sistema cria a tarefa', hint: 'com prioridade e núcleo detectados' },
          { icon: Wrench, label: 'Equipe executa', hint: 'com fotos de referência e execução' },
          { icon: Bell, label: 'Solicitante confirma', hint: 'por link público, sem login' },
          { icon: FileText, label: 'Arquivado em PDF', hint: 'histórico + fotos + conversas' },
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
      <div className="mt-6 rounded-xl bg-white/10 border border-white/20 p-4 text-center">
        <span className="text-sm">
          <strong className="text-white">28 de 45 chamados (62%)</strong> já entram automaticamente pelo e-mail — <span className="opacity-80">sem digitação manual.</span>
        </span>
      </div>
    </SlideShell>
  );
}

// 9 — Kanban + tempo real
function S9Kanban() {
  const columns = [
    { title: 'Pendente', count: 5, color: 'border-slate-300', dot: 'bg-slate-400' },
    { title: 'Em andamento', count: 6, color: 'border-amber-300', dot: 'bg-amber-500' },
    { title: 'Impedido', count: 2, color: 'border-rose-300', dot: 'bg-rose-500' },
    { title: 'Concluído', count: 32, color: 'border-emerald-300', dot: 'bg-emerald-500' },
  ];
  return (
    <SlideShell
      eyebrow="Gestão visual"
      title="Kanban em tempo real, com histórico de cada movimento."
      subtitle="Toda a equipe vê o mesmo quadro, atualizado no instante em que a tarefa muda de coluna."
    >
      <div className="grid grid-cols-4 gap-3 mb-6">
        {columns.map((c) => (
          <div key={c.title} className={`rounded-xl border-t-4 ${c.color} bg-white p-3 shadow-sm`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${c.dot}`} />
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{c.title}</span>
              </div>
              <span className="text-xs font-bold text-slate-500">{c.count}</span>
            </div>
            {Array.from({ length: Math.min(c.count, 3) }).map((_, i) => (
              <div key={i} className="rounded-md bg-slate-50 border border-slate-100 h-10 mb-2" />
            ))}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
          <div className="text-xs uppercase tracking-wider text-emerald-800 font-semibold">Movimentações auditadas</div>
          <div className="text-3xl font-bold text-emerald-900 mt-1">87</div>
          <div className="text-xs text-emerald-800/80 mt-1">quem moveu · quando · de/para</div>
        </div>
        <div className="rounded-xl bg-sky-50 border border-sky-200 p-4">
          <div className="text-xs uppercase tracking-wider text-sky-800 font-semibold">Taxa de resolução</div>
          <div className="text-3xl font-bold text-sky-900 mt-1">71%</div>
          <div className="text-xs text-sky-800/80 mt-1">32 concluídos sobre 45 chamados</div>
        </div>
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
          <div className="text-xs uppercase tracking-wider text-amber-800 font-semibold">Lembrete automático</div>
          <div className="text-3xl font-bold text-amber-900 mt-1">3 + 7 dias</div>
          <div className="text-xs text-amber-800/80 mt-1">confirmação automática se sem resposta</div>
        </div>
      </div>
    </SlideShell>
  );
}

// 10 — Segurança
function S10Seguranca() {
  return (
    <SlideShell
      eyebrow="Segurança e conformidade"
      title="Cada usuário vê exatamente o que precisa — e nada mais."
      subtitle="Row-Level Security no banco, perfis segregados, trilha de auditoria por ação."
    >
      <div className="grid grid-cols-2 gap-8 h-full">
        <div className="space-y-4">
          <BenefitRow icon={Lock} title="RLS por perfil" desc="Regras aplicadas no banco: admin, GM, fiscal, contratada, manutenção — cada um enxerga o seu escopo." />
          <BenefitRow icon={Shield} title="Fiscal vê só as suas obras" desc="Acesso concedido nominalmente. Substitutos formalizados para férias ou impedimento." />
          <BenefitRow icon={ClipboardCheck} title="Auditoria completa" desc="Toda alteração relevante é registrada com autor, data e valores antes/depois." />
          <BenefitRow icon={Bell} title="Bloqueios inteligentes" desc="Sistema impede execução acima do contratado, medição sobre item bloqueado e outras inconsistências." />
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
        </div>
      </div>
    </SlideShell>
  );
}

// 11 — Ganhos
function S11Ganhos() {
  return (
    <SlideShell
      eyebrow="Resultados"
      title="O que a Defensoria ganha ao adotar o SiDIF."
      subtitle="Padronização, agilidade, transparência e segurança — em um único fluxo."
    >
      <div className="grid grid-cols-2 gap-x-10 gap-y-5">
        <BenefitRow icon={Sparkles} title="Padronização real"
          desc="Todas as obras seguem o mesmo processo — do orçamento à entrega, do chamado à confirmação." />
        <BenefitRow icon={Zap} title="Agilidade mensurável" tone="blue"
          desc="Chamados abertos em segundos por e-mail. Medições em minutos, sem dupla digitação." />
        <BenefitRow icon={BarChart3} title="Transparência de dados" tone="blue"
          desc="Diretoria enxerga o portfólio inteiro: mapa, orçamento executado, obras concluídas, chamados em curso." />
        <BenefitRow icon={Shield} title="Segurança institucional" tone="amber"
          desc="RLS no banco, auditoria por ação, backups gerenciados — dados sensíveis protegidos." />
        <BenefitRow icon={CheckCircle2} title="Facilidade de uso"
          desc="Interface pensada para o fiscal e para a contratada — sem treinamento longo, sem manual pesado." />
        <BenefitRow icon={FileText} title="Documentação institucional"
          desc="Relatórios, memoriais e documentos de encerramento gerados no padrão da Defensoria." />
      </div>
    </SlideShell>
  );
}

// 12 — Encerramento
function S12Encerramento() {
  return (
    <div className="relative h-full w-full rounded-2xl overflow-hidden text-white flex flex-col p-12"
      style={{ background: 'linear-gradient(135deg,#022c22 0%,#065f46 60%,#0e7490 100%)' }}>
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="absolute -bottom-40 -left-24 w-[420px] h-[420px] rounded-full bg-sky-400/20 blur-3xl" />

      <div className="relative flex-1 flex flex-col justify-center max-w-4xl">
        <span className="text-[11px] font-semibold tracking-[0.3em] uppercase text-emerald-100/90 mb-4">Próximos passos</span>
        <h1 className="text-6xl md:text-7xl font-bold leading-[1.02] tracking-tight mb-6">Obrigado.</h1>
        <p className="text-2xl font-light text-emerald-50/90 mb-10 leading-snug">
          O SiDIF já está em produção. Agora é escalar a adoção e amadurecer os módulos junto com quem usa.
        </p>
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            ['Curto prazo', 'Adoção plena nos 12 núcleos e nas 6 obras em andamento'],
            ['Médio prazo', 'Módulos de Preventivos, Almoxarifado e Fluxo de Contratos'],
            ['Longo prazo', 'Integração institucional (SEI, Portal Transparência)'],
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
  { id: 2, render: S2Contexto },
  { id: 3, render: S3Numeros },
  { id: 4, render: S4Obras },
  { id: 5, render: S5RDO },
  { id: 6, render: S6Medicao },
  { id: 7, render: S7Encerramento },
  { id: 8, render: S8ManutencaoCapa },
  { id: 9, render: S9Kanban },
  { id: 10, render: S10Seguranca },
  { id: 11, render: S11Ganhos },
  { id: 12, render: S12Encerramento },
];

export default function ApresentacaoDiretoria() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const total = SLIDES.length;

  useEffect(() => {
    document.title = `${current + 1}/${total} — SiDIF · Apresentação Diretoria`;
  }, [current, total]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
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

  const requestFullscreen = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

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
