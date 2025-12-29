import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { OrcamentosList } from '@/components/orcamento/OrcamentosList';

export default function Orcamento() {
  return (
    <SimpleHeader>
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Orçamentos"
          subtitle="Crie e gerencie orçamentos de obras"
        />
        <OrcamentosList />
      </div>
    </SimpleHeader>
  );
}
