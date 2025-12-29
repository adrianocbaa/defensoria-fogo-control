import { SimpleHeader } from '@/components/SimpleHeader';
import { OrcamentoEditor } from '@/components/orcamento/OrcamentoEditor';

export default function OrcamentoDetalhe() {
  return (
    <SimpleHeader>
      <div className="container mx-auto px-4 py-8">
        <OrcamentoEditor />
      </div>
    </SimpleHeader>
  );
}
