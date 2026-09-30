// Busca paginada: evita truncamento silencioso quando o volume de linhas
// ultrapassa o limite máximo por requisição no Supabase (~1000 linhas).
// O builder recebido deve aplicar .order() determinístico e .range(from, to).
export async function fetchAllPaged(
  build: (from: number, to: number) => any,
  page = 1000,
): Promise<any[]> {
  const all: any[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await build(from, from + page - 1);
    if (error) throw error;
    const rows = data || [];
    all.push(...rows);
    if (rows.length < page) break;
  }
  return all;
}
