import planoExpansaoCapa from '@/assets/apresentacao/plano-expansao-capa.jpg';
import planoExpansaoExpediente from '@/assets/apresentacao/plano-expansao-expediente.jpg';
import planoExpansaoApresentacao from '@/assets/apresentacao/plano-expansao-apresentacao.jpg';
import planoExpansaoObjetivos from '@/assets/apresentacao/plano-expansao-objetivos.jpg';
import planoExpansaoJustificativas from '@/assets/apresentacao/plano-expansao-justificativas.jpg';
import planoExpansaoDiretrizes from '@/assets/apresentacao/plano-expansao-diretrizes.jpg';
import planoExpansaoIntervencoes from '@/assets/apresentacao/plano-expansao-intervencoes.jpg';
import planoExpansaoEconucleos from '@/assets/apresentacao/plano-expansao-econucleos.jpg';
import planoExpansaoEconucleos2 from '@/assets/apresentacao/plano-expansao-econucleos-2.jpg';
import planoExpansaoEconucleosTabela from '@/assets/apresentacao/plano-expansao-econucleos-tabela.jpg';
import planoExpansaoCronograma1 from '@/assets/apresentacao/plano-expansao-cronograma-1.jpg';
import planoExpansaoCronograma2 from '@/assets/apresentacao/plano-expansao-cronograma-2.jpg';
import planoExpansaoConstrucoes from '@/assets/apresentacao/plano-expansao-construcoes.jpg';
import planoExpansaoMonitoramento from '@/assets/apresentacao/plano-expansao-monitoramento.jpg';
import planoExpansaoConsideracoes from '@/assets/apresentacao/plano-expansao-consideracoes.jpg';

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

// Slide 8 - Intervenções Estruturais (25 comarcas)
export function PlanoExpansaoIntervencoes() {
  return <SlideImagem src={planoExpansaoIntervencoes} alt="Intervenções estruturais nas 25 comarcas prioritárias" />;
}

// Slide 9 - Construção de 18 Econúcleos
export function PlanoExpansaoEconucleos() {
  return <SlideImagem src={planoExpansaoEconucleos} alt="Construção de 18 Econúcleos" />;
}

// Slide 10 - Econúcleos continuação
export function PlanoExpansaoEconucleos2() {
  return <SlideImagem src={planoExpansaoEconucleos2} alt="Econúcleos - Cronograma de Implantação" />;
}

// Slide 11 - Tabela Econúcleos
export function PlanoExpansaoEconucleosTabela() {
  return <SlideImagem src={planoExpansaoEconucleosTabela} alt="Tabela de Econúcleos - Situação Atual" />;
}

// Slide 12 - Cronograma 1
export function PlanoExpansaoCronograma1() {
  return <SlideImagem src={planoExpansaoCronograma1} alt="Cronograma de Execução - Parte 1" />;
}

// Slide 13 - Cronograma 2
export function PlanoExpansaoCronograma2() {
  return <SlideImagem src={planoExpansaoCronograma2} alt="Cronograma de Execução - Parte 2" />;
}

// Slide 14 - Construções
export function PlanoExpansaoConstrucoes() {
  return <SlideImagem src={planoExpansaoConstrucoes} alt="Status das Construções" />;
}

// Slide 15 - Monitoramento e Avaliação
export function PlanoExpansaoMonitoramento() {
  return <SlideImagem src={planoExpansaoMonitoramento} alt="Monitoramento e Avaliação" />;
}

// Slide 16 - Considerações Finais
export function PlanoExpansaoConsideracoes() {
  return <SlideImagem src={planoExpansaoConsideracoes} alt="Considerações Finais" />;
}
