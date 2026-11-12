import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileSearch, Plus, Search } from 'lucide-react';
import { SimpleHeader } from '@/components/SimpleHeader';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { db, rpc } from '@/lib/avaliacao/api';
import { STAGE_LABEL, STATUS_LABEL, TIPO_LABEL } from '@/lib/avaliacao/labels';
import { NovaAvaliacaoDialog } from '@/components/avaliacoes/NovaAvaliacaoDialog';

export default function AvaliacoesList() {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('ATIVA');
  const lista = useQuery({
    queryKey: ['aval-list'],
    queryFn: async () => {
      const { data, error } = await db.from('avaliacoes')
        .select('id, codigo, ano, numero, tipo, status, stage, municipio_nome, uf, tipo_imovel, processo_administrativo, responsavel_tecnico_id, updated_at')
        .order('ano', { ascending: false }).order('numero', { ascending: false }).limit(10000);
      if (error) throw error;
      return data as any[];
    },
  });
  const tecnicos = useQuery({ queryKey: ['aval-tecnicos'], queryFn: () => rpc<{ user_id: string; display_name: string }[]>('aval_list_tecnicos', {}) });
  const globalPerms = useQuery({ queryKey: ['aval-global-perms'], queryFn: async () => new Set(await rpc<string[]>('aval_my_perms', { p_avaliacao: null })) });
  const nomes = useMemo(() => new Map((tecnicos.data ?? []).map((t) => [t.user_id, t.display_name])), [tecnicos.data]);
  const rows = (lista.data ?? []).filter((r) => (status === 'TODAS' || r.status === status) &&
    (!busca.trim() || `${r.codigo} ${r.municipio_nome} ${r.tipo_imovel} ${r.processo_administrativo ?? ''}`.toLowerCase().includes(busca.trim().toLowerCase())));

  return (
    <SimpleHeader>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <PageHeader
          title="Avaliações"
          subtitle="Avaliação de imóveis para locação: mercado, modelo estatístico, resultado e laudo"
          actions={globalPerms.data?.has('evaluation.create') ? <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Nova avaliação</Button> : undefined}
        />
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por número, município, imóvel ou processo" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ATIVA">Ativas</SelectItem>
              <SelectItem value="CONCLUIDA">Concluídas</SelectItem>
              <SelectItem value="CANCELADA">Canceladas</SelectItem>
              <SelectItem value="TODAS">Todas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Card>
          <CardContent className="p-0">
            {lista.isLoading ? (
              <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
            ) : rows.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <FileSearch className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nenhuma avaliação encontrada.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead><TableHead>Tipo</TableHead><TableHead>Município</TableHead>
                    <TableHead className="hidden md:table-cell">Imóvel</TableHead><TableHead className="hidden lg:table-cell">Responsável</TableHead>
                    <TableHead>Etapa</TableHead><TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id} className="cursor-pointer">
                      <TableCell className="font-medium"><Link className="hover:underline" to={`/avaliacoes/${r.id}`}>{r.codigo}</Link></TableCell>
                      <TableCell>{TIPO_LABEL[r.tipo]}</TableCell>
                      <TableCell>{r.municipio_nome}/{r.uf}</TableCell>
                      <TableCell className="hidden md:table-cell">{r.tipo_imovel}</TableCell>
                      <TableCell className="hidden lg:table-cell">{nomes.get(r.responsavel_tecnico_id) ?? '—'}</TableCell>
                      <TableCell>{STAGE_LABEL[r.stage]}</TableCell>
                      <TableCell><Badge variant={r.status === 'ATIVA' ? 'default' : r.status === 'CONCLUIDA' ? 'secondary' : 'outline'}>{STATUS_LABEL[r.status]}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <NovaAvaliacaoDialog open={open} onOpenChange={setOpen} />
    </SimpleHeader>
  );
}
