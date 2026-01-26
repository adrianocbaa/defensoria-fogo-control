import { 
  FileText, 
  Building2, 
  Monitor, 
  Settings,
  ClipboardCheck,
  BarChart3
} from 'lucide-react';

export function CapaApresentacao() {
  return (
    <div className="relative flex flex-col items-center justify-center h-full overflow-hidden">
      {/* Background com gradiente institucional */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-emerald-50/30 to-blue-50/40" />
      
      {/* Elementos geométricos decorativos */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-emerald-100/40 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-blue-100/30 to-transparent rounded-full translate-y-1/2 -translate-x-1/2" />
      
      {/* Grid lines sutis */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, #064e3b 1px, transparent 1px),
            linear-gradient(to bottom, #064e3b 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }} />
      </div>

      {/* Linha decorativa superior */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-blue-500" />

      {/* Conteúdo principal */}
      <div className="relative z-10 text-center px-8 max-w-4xl">
        {/* Logo DIF */}
        <div className="mb-8">
          <img 
            src="/images/logo-dif-dpmt.jpg" 
            alt="Logo DIF" 
            className="h-20 mx-auto object-contain rounded-lg shadow-sm"
          />
        </div>

        {/* Ícones representativos */}
        <div className="flex justify-center gap-6 mb-8">
          <div className="flex flex-col items-center gap-2 opacity-60">
            <div className="p-3 bg-emerald-100/80 rounded-xl">
              <FileText className="h-6 w-6 text-emerald-700" />
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Contratos</span>
          </div>
          <div className="flex flex-col items-center gap-2 opacity-60">
            <div className="p-3 bg-blue-100/80 rounded-xl">
              <Building2 className="h-6 w-6 text-blue-700" />
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Obras</span>
          </div>
          <div className="flex flex-col items-center gap-2 opacity-60">
            <div className="p-3 bg-slate-100/80 rounded-xl">
              <Monitor className="h-6 w-6 text-slate-700" />
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Sistema</span>
          </div>
          <div className="flex flex-col items-center gap-2 opacity-60">
            <div className="p-3 bg-emerald-100/80 rounded-xl">
              <ClipboardCheck className="h-6 w-6 text-emerald-700" />
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Fiscalização</span>
          </div>
          <div className="flex flex-col items-center gap-2 opacity-60">
            <div className="p-3 bg-blue-100/80 rounded-xl">
              <BarChart3 className="h-6 w-6 text-blue-700" />
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Medições</span>
          </div>
        </div>

        {/* Título principal */}
        <h1 className="text-4xl md:text-5xl font-bold text-slate-800 mb-4 tracking-tight">
          Novas Diretrizes{' '}
          <span className="text-emerald-700">DIF</span>
        </h1>

        {/* Linha decorativa */}
        <div className="w-24 h-1 bg-gradient-to-r from-emerald-500 to-blue-500 mx-auto mb-6 rounded-full" />

        {/* Subtítulo */}
        <p className="text-lg md:text-xl text-slate-600 font-medium leading-relaxed max-w-2xl mx-auto">
          Padronização de procedimentos, gestão de contratos
          <br />
          e uso do Sistema <span className="text-emerald-700 font-semibold">SiDIF</span>
        </p>

        {/* Elementos decorativos laterais */}
        <div className="flex justify-center gap-3 mt-8 opacity-40">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <div className="w-2 h-2 rounded-full bg-slate-400" />
          <div className="w-2 h-2 rounded-full bg-blue-500" />
        </div>
      </div>

      {/* Rodapé institucional */}
      <div className="absolute bottom-0 left-0 right-0 py-6 px-8">
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm font-semibold text-slate-700">
            Defensoria Pública do Estado de Mato Grosso
          </p>
          <p className="text-xs text-slate-500">
            Diretoria de Infraestrutura Física
          </p>
        </div>
        
        {/* Linha decorativa inferior */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-emerald-500 to-blue-500" />
      </div>
    </div>
  );
}
