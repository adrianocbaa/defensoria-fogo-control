import { SimpleHeader } from '@/components/SimpleHeader';
import { CurvaABC } from '@/components/orcamento/CurvaABC';

export default function OrcamentoCurvaABC() {
  return (
    <SimpleHeader>
      <div className="container mx-auto px-4 py-8">
        <CurvaABC />
      </div>
    </SimpleHeader>
  );
}
