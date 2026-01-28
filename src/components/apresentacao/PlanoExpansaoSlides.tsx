import planoExpansaoCapa from '@/assets/apresentacao/plano-expansao-capa.jpg';
import planoExpansaoExpediente from '@/assets/apresentacao/plano-expansao-expediente.jpg';
import planoExpansaoApresentacao from '@/assets/apresentacao/plano-expansao-apresentacao.jpg';
import planoExpansaoObjetivos from '@/assets/apresentacao/plano-expansao-objetivos.jpg';
import planoExpansaoJustificativas from '@/assets/apresentacao/plano-expansao-justificativas.jpg';
import planoExpansaoDiretrizes from '@/assets/apresentacao/plano-expansao-diretrizes.jpg';

// Componente base para slides de imagem
function SlideImagem({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-full max-w-4xl">
        <img 
          src={src} 
          alt={alt} 
          className="w-full h-auto rounded-lg shadow-lg"
        />
      </div>
    </div>
  );
}

// Slide 1 - Capa do Plano de Expansão
export function PlanoExpansaoCapa() {
  return <SlideImagem src={planoExpansaoCapa} alt="Plano de Expansão da Infraestrutura Física 2025-2026" />;
}

// Slide 2 - Expediente
export function PlanoExpansaoExpediente() {
  return <SlideImagem src={planoExpansaoExpediente} alt="Expediente - Equipe DPE/MT" />;
}

// Slide 3 - Apresentação
export function PlanoExpansaoApresentacao() {
  return <SlideImagem src={planoExpansaoApresentacao} alt="Apresentação do Plano de Expansão" />;
}

// Slide 4 - Objetivos
export function PlanoExpansaoObjetivos() {
  return <SlideImagem src={planoExpansaoObjetivos} alt="Objetivos do Plano de Expansão" />;
}

// Slide 5 - Justificativas
export function PlanoExpansaoJustificativas() {
  return <SlideImagem src={planoExpansaoJustificativas} alt="Justificativas do Plano de Expansão" />;
}

// Slide 6 - Diretrizes e Metodologia
export function PlanoExpansaoDiretrizes() {
  return <SlideImagem src={planoExpansaoDiretrizes} alt="Diretrizes e Metodologia" />;
}
