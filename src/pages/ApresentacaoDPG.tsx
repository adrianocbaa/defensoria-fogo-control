import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Home, Maximize2, Building2, Wrench, ClipboardCheck,
  FileSpreadsheet, Shield, Mail, Users, CheckCircle2, TrendingUp,
  FileText, Lock, Bell, Zap, BarChart3, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

/* =========================================================================
   Blocos base
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
      {!dark && <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(90deg,#065f46,#0ea5e9)' }} />}
      {eyebrow && (
        <span className={`text-[11px] font-semibold tracking-[0.2em] uppercase mb-2 ${dark ? 'text-emerald-200' : 'text-emerald-700'}`}>
          {eyebrow}
        </span>
      )}
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-1">{title}</h1>
      {subtitle && (
        <p className={`text-base mb-6 ${dark ? 'text-emerald-50/90' : 'text-slate-600'}`}>{subtitle}</p>
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
    <div className="flex gap-3 items-start">
      <div className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${bg}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
        <p className="text-[13px] text-slate-600 leading-snug">{desc}</p>
      </div>
    </div>
  );
}

/* =========================================================================
   Slides
   ========================================================================= */

// 1 — Capa (mantida)
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
          Defensoria Pública-Geral
        </span>
      </div>

      <div className="relative">
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

// 2 — Contexto: antes x depois (objetivo)
function S2Contexto() {
  return (
    <SlideShell
      eyebrow="Por que o SiDIF"
      title="De pastas na rede para uma única fonte de dados."
      subtitle="Planilhas, e-mails e fotos dispersas davam lugar a um fluxo padronizado e auditável."
    >
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-2xl border-2 border-dashed border-red-200 bg-red-50/40 p-6">
          <div className="text-xs font-semibold tracking-[0.2em] uppercase text-red-700 mb-4">Antes</div>
          <ul className="space-y-2.5 text-sm text-slate-700">
            <li className="flex gap-2"><span className="text-red-500">•</span> Medições em planilhas Excel</li>
            <li className="flex gap-2"><span className="text-red-500">•</span> Sem relatório diário de obra (RDO)</li>
            <li className="flex gap-2"><span className="text-red-500">•</span> Chamados por e-mail, controle em planilha</li>
            <li className="flex gap-2"><span className="text-red-500">•</span> TRP/TRD/ACT refeitos a cada obra</li>
            <li className="flex gap-2"><span className="text-red-500">•</span> Sem histórico, sem indicadores, auditoria difícil</li>
          </ul>
        </div>
        <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6">
          <div className="text-xs font-semibold tracking-[0.2em] uppercase text-emerald-700 mb-4">Com o SiDIF</div>
          <ul className="space-y-2.5 text-sm text-slate-700">
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> Obras, Medição, RDO e Manutenção integrados</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> Coleta no canteiro, com fotos rastreáveis</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> E-mail de manutenção vira tarefa automaticamente</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> Documentos institucionais em 1 clique</li>
            <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" /> Trilha de auditoria por perfil e ação</li>
          </ul>
        </div>
      </div>
    </SlideShell>
  );
}

// 3 — Números
function S3Numeros() {
  return (
    <SlideShell
      eyebrow="Panorama"
      title="O SiDIF em números — hoje."
      subtitle="Dados reais em produção: obras, medições, RDOs e chamados registrados."
    >
      <div className="grid grid-cols-4 gap-4 mb-4">
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

// 4 — Ciclo da obra: Obras + RDO + Medição
function S4CicloObra() {
  return (
    <SlideShell
      eyebrow="Módulo 01 · Obras"
      title="Um único ciclo: do canteiro ao pagamento."
      subtitle="O RDO alimenta a medição, que gera o relatório oficial — sem dupla digitação."
    >
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { step: '1', title: 'RDO diário', desc: 'Contratada registra quantitativos, mão de obra, ocorrências e fotos com marca d\'água.' },
          { step: '2', title: 'Importa na medição', desc: 'Um clique traz o executado para a medição. Avanço físico recalculado no banco.' },
          { step: '3', title: 'Revisão do fiscal', desc: 'Ajusta, valida aditivos e bloqueia a medição — tudo com trilha de auditoria.' },
          { step: '4', title: 'Relatório oficial', desc: 'PDF/Word com resumo financeiro, anexo fotográfico e assinaturas.' },
        ].map((s, i) => (
          <div key={i} className="relative rounded-2xl border bg-white p-5 shadow-sm">
            <div className="absolute -top-3 -left-3 h-9 w-9 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center shadow-md">
              {s.step}
            </div>
            <h3 className="font-semibold text-slate-900 mt-3 mb-2 text-sm">{s.title}</h3>
            <p className="text-[13px] text-slate-600 leading-snug">{s.desc}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl bg-slate-50 border p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">Mapa institucional</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">18 municípios</div>
          <div className="text-xs text-slate-500 mt-1">status por obra em tempo real</div>
        </div>
        <div className="rounded-xl bg-slate-50 border p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">Valor executado</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">R$ 3,99 mi</div>
          <div className="text-xs text-slate-500 mt-1">73% dos contratos vigentes</div>
        </div>
        <div className="rounded-xl bg-slate-50 border p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">Aditivos</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">18 formalizados</div>
          <div className="text-xs text-slate-500 mt-1">sessões bloqueadas e auditadas</div>
        </div>
        <div className="rounded-xl bg-slate-50 border p-4">
          <div className="text-xs uppercase tracking-wider text-slate-500">Cálculos</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">100% no banco</div>
          <div className="text-xs text-slate-500 mt-1">arredondamento blindado</div>
        </div>
      </div>
    </SlideShell>
  );
}

// 5 — Recebimento e encerramento
function S5Encerramento() {
  return (
    <SlideShell
      eyebrow="Recebimento e encerramento"
      title="TRP, TRD, ACT e ARTs — gerados em 1 clique."
      subtitle="Checklists de recebimento e entrega institucional alimentam os documentos oficiais."
    >
      <div className="grid grid-cols-2 gap-8">
        <div>
          <div className="grid grid-cols-2 gap-3">
            {['TRP · Termo de Recebimento Provisório', 'TRD · Termo de Recebimento Definitivo', 'ACT · Ata de Conclusão Técnica', 'Registro múltiplo de ARTs por serviço'].map((d) => (
              <div key={d} className="rounded-xl border bg-white p-4 shadow-sm">
                <FileText className="h-5 w-5 text-emerald-700 mb-2" />
                <p className="text-[13px] font-medium text-slate-800 leading-tight">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-800 text-white p-6">
            <div className="text-xs uppercase tracking-[0.2em] opacity-80 mb-2">Já produzidos no sistema</div>
            <div className="text-5xl font-bold">42</div>
            <div className="text-sm opacity-90 mt-1">documentos oficiais gerados sem retrabalho</div>
          </div>
        </div>
        <div className="space-y-4">
          <BenefitRow icon={ClipboardCheck} title="Checklist de recebimento" desc="Vistorias provisória e definitiva por ambiente, com pendências, fotos antes/depois e reinspeção." />
          <BenefitRow icon={CheckCircle2} title="Padrão institucional" desc="Cabeçalho, brasão e assinaturas do fiscal e da DIF na identidade oficial." />
          <BenefitRow icon={Shield} title="Assinatura e auditoria" desc="Assinantes cadastrados por documento e histórico completo do que foi entregue." />
          <BenefitRow icon={Sparkles} title="Sem planilha externa" desc="Serviços, sistemas e ARTs saem do que já foi registrado durante a obra." />
        </div>
      </div>
    </SlideShell>
  );
}

// 6 — Manutenção: fluxo + resultados
function S6Manutencao() {
  const antes = ['Lançar na planilha', 'Repassar ao gerente', 'Gerente atende', 'Informar responsável', 'E-mail ao solicitante', 'Arquivar e-mail', 'Atualizar planilha'];
  const depois = ['Encaminha para o sistema', 'Gerente atende', 'E-mail ao solicitante'];

  const Flow = ({ label, tone, steps, note }: { label: string; tone: 'rose' | 'emerald'; steps: string[]; note: string }) => {
    const isNew = tone === 'emerald';
    return (
      <div className={`rounded-2xl border p-4 ${isNew ? 'border-emerald-300 bg-emerald-50/60' : 'border-rose-200 bg-rose-50/50'}`}>
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs font-bold uppercase tracking-wider ${isNew ? 'text-emerald-800' : 'text-rose-700'}`}>{label}</span>
          <span className={`text-xs font-bold rounded-full px-2.5 py-0.5 ${isNew ? 'bg-emerald-700 text-white' : 'bg-rose-600 text-white'}`}>
            {steps.length} ações
          </span>
        </div>
        <div className="space-y-1.5">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className={`h-5 w-5 shrink-0 rounded-full text-[10px] font-bold flex items-center justify-center ${isNew ? 'bg-emerald-700 text-white' : 'bg-rose-500 text-white'}`}>
                {i + 1}
              </span>
              <span className={`flex-1 rounded-md bg-white border px-3 py-1 text-[13px] text-slate-700 ${isNew ? 'border-emerald-200' : 'border-rose-200'}`}>{s}</span>
            </div>
          ))}
        </div>
        <p className={`mt-2 text-[11px] leading-snug ${isNew ? 'text-emerald-800' : 'text-rose-700'}`}>{note}</p>
      </div>
    );
  };

  return (
    <SlideShell
      eyebrow="Módulo 02 · Manutenção"
      title="O mesmo chamado, com menos da metade das etapas."
      subtitle="O e-mail vira tarefa, a equipe executa com fotos e o solicitante confirma por link público."
    >
      <div className="grid grid-cols-2 gap-5 items-start">
        <Flow label="Antes — manual" tone="rose" steps={antes} note="Planilha, encaminhamentos manuais e arquivamento por e-mail." />
        <Flow label="Depois — SiDIF" tone="emerald" steps={depois} note="Prioridade, núcleo, cobrança de confirmação e arquivamento em PDF são automáticos." />
      </div>
      <div className="mt-4 grid grid-cols-4 gap-3">
        <div className="rounded-xl bg-slate-50 border p-3">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">Etapas manuais</div>
          <div className="text-xl font-bold text-emerald-800 mt-0.5">−57%</div>
        </div>
        <div className="rounded-xl bg-slate-50 border p-3">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">Abertos por e-mail</div>
          <div className="text-xl font-bold text-slate-900 mt-0.5">62%</div>
        </div>
        <div className="rounded-xl bg-slate-50 border p-3">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">Taxa de resolução</div>
          <div className="text-xl font-bold text-slate-900 mt-0.5">71%</div>
        </div>
        <div className="rounded-xl bg-slate-50 border p-3">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">Movimentações auditadas</div>
          <div className="text-xl font-bold text-slate-900 mt-0.5">87</div>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-3">
        <Zap className="h-4 w-4 text-emerald-700 shrink-0" />
        <p className="text-[13px] text-emerald-900">
          Kanban em tempo real para toda a equipe, com histórico de cada movimento e lembrete automático de confirmação em 3 e 7 dias.
        </p>
      </div>
    </SlideShell>
  );
}

// 7 — Segurança + ganhos
function S7SegurancaGanhos() {
  return (
    <SlideShell
      eyebrow="Governança e resultados"
      title="Cada usuário vê o que precisa — e a gestão vê o todo."
      subtitle="Row-Level Security no banco, perfis segregados e indicadores para a administração superior."
    >
      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-3.5">
          <BenefitRow icon={Lock} title="RLS por perfil" desc="Admin, GM, fiscal, contratada e manutenção — regras aplicadas no próprio banco." />
          <BenefitRow icon={Shield} title="Fiscal vê só as suas obras" desc="Acesso nominal, com substitutos formalizados para férias ou impedimento." />
          <BenefitRow icon={ClipboardCheck} title="Auditoria completa" desc="Autor, data e valores antes/depois em toda alteração relevante." />
          <BenefitRow icon={Bell} title="Bloqueios inteligentes" desc="Impede execução acima do contratado e medição sobre item bloqueado." />
        </div>
        <div className="space-y-3.5">
          <BenefitRow icon={BarChart3} title="Transparência para a gestão" tone="blue" desc="Portfólio completo: mapa, execução física e financeira, obras concluídas e chamados em curso." />
          <BenefitRow icon={Zap} title="Agilidade mensurável" tone="blue" desc="Chamados abertos em segundos; medições em minutos, sem dupla digitação." />
          <BenefitRow icon={Sparkles} title="Padronização real" tone="amber" desc="Mesmo processo em toda a DIF — do orçamento à entrega, do chamado à confirmação." />
          <BenefitRow icon={Users} title="Facilidade de uso" tone="amber" desc="Interface pensada para o fiscal e a contratada, sem treinamento longo." />
        </div>
      </div>
    </SlideShell>
  );
}

// 8 — Próximos passos / encerramento
function S8Encerramento() {
  return (
    <div className="relative h-full w-full rounded-2xl overflow-hidden text-white flex flex-col p-12"
      style={{ background: 'linear-gradient(135deg,#022c22 0%,#065f46 60%,#0e7490 100%)' }}>
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="absolute -bottom-40 -left-24 w-[420px] h-[420px] rounded-full bg-sky-400/20 blur-3xl" />

      <div className="relative flex-1 flex flex-col justify-center max-w-4xl">
        <span className="text-[11px] font-semibold tracking-[0.3em] uppercase text-emerald-100/90 mb-4">Próximos passos</span>
        <h1 className="text-6xl font-bold leading-[1.02] tracking-tight mb-6">Aprimoramento</h1>
        <p className="text-2xl font-light text-emerald-50/90 mb-10 leading-snug">
          Com o SiDIF em fase de testes, inicia-se agora um processo contínuo de validação e aperfeiçoamento dos módulos, alinhado às necessidades de seus usuários.
        </p>
        <div className="grid grid-cols-3 gap-4">
          {[
            ['Curto prazo', 'Implantação de check-list de obra e Dashboard das obras e do processo do Plano de Expansão.'],
            ['Médio prazo', 'Preventivos, Almoxarifado\u00a0e Ar Condicionado'],
            ['Longo prazo', 'Integração institucional (SEI - Utilização de API) e Inserção das informações no Portal Transparência.'],
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
  { id: 4, render: S4CicloObra },
  { id: 5, render: S5Encerramento },
  { id: 6, render: S6Manutencao },
  { id: 7, render: S7SegurancaGanhos },
  { id: 8, render: S8Encerramento },
];

export default function ApresentacaoDPG() {
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
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
