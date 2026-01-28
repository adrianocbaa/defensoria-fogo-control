import planoExpansaoCapa from '@/assets/apresentacao/plano-expansao-capa.jpg';

// Slide 1 - Capa do Plano de Expansão
export function PlanoExpansaoCapa() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-full max-w-4xl">
        <img 
          src={planoExpansaoCapa} 
          alt="Plano de Expansão da Infraestrutura Física 2025-2026" 
          className="w-full h-auto rounded-lg shadow-lg"
        />
      </div>
    </div>
  );
}
