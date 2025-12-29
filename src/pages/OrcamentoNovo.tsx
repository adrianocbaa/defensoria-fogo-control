import { SimpleHeader } from '@/components/SimpleHeader';
import { OrcamentoWizard } from '@/components/orcamento/OrcamentoWizard';

export default function OrcamentoNovo() {
  return (
    <SimpleHeader>
      <div className="container mx-auto px-4 py-8">
        <OrcamentoWizard />
      </div>
    </SimpleHeader>
  );
}
