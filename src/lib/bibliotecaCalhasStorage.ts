import type { CalhaBiblioteca } from '@/components/dimensionamento/calhas/bibliotecaCalhaSchema';

const KEY = 'dimensionamento-calhas:biblioteca';

const SEED: Omit<CalhaBiblioteca, 'id'>[] = [
  // Semicirculares (PVC)
  { nome: 'Semicircular PVC Ø100', tipo: 'semicircular', material: 'PVC', manning_n: 0.011, diametro_m: 0.1, observacoes: 'Padrão residencial' },
  { nome: 'Semicircular PVC Ø125', tipo: 'semicircular', material: 'PVC', manning_n: 0.011, diametro_m: 0.125, observacoes: '' },
  { nome: 'Semicircular PVC Ø150', tipo: 'semicircular', material: 'PVC', manning_n: 0.011, diametro_m: 0.15, observacoes: '' },
  { nome: 'Semicircular PVC Ø200', tipo: 'semicircular', material: 'PVC', manning_n: 0.011, diametro_m: 0.2, observacoes: '' },
  // Retangulares (Galvanizado)
  { nome: 'Retangular Galv. 100×100', tipo: 'retangular', material: 'Aço galvanizado (chapa lisa)', manning_n: 0.012, largura_m: 0.1, altura_m: 0.1, observacoes: '' },
  { nome: 'Retangular Galv. 150×100', tipo: 'retangular', material: 'Aço galvanizado (chapa lisa)', manning_n: 0.012, largura_m: 0.15, altura_m: 0.1, observacoes: '' },
  { nome: 'Retangular Galv. 200×150', tipo: 'retangular', material: 'Aço galvanizado (chapa lisa)', manning_n: 0.012, largura_m: 0.2, altura_m: 0.15, observacoes: '' },
  { nome: 'Retangular Galv. 250×200', tipo: 'retangular', material: 'Aço galvanizado (chapa lisa)', manning_n: 0.012, largura_m: 0.25, altura_m: 0.2, observacoes: '' },
  { nome: 'Retangular Galv. 300×250', tipo: 'retangular', material: 'Aço galvanizado (chapa lisa)', manning_n: 0.012, largura_m: 0.3, altura_m: 0.25, observacoes: 'Industrial' },
  // Trapezoidal
  { nome: 'Trapezoidal Galv. 150/250×200', tipo: 'trapezoidal', material: 'Aço galvanizado (chapa lisa)', manning_n: 0.012, base_menor_m: 0.15, base_maior_m: 0.25, altura_m: 0.2, observacoes: '' },
];

export function listarBiblioteca(): CalhaBiblioteca[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const seeded = SEED.map((c) => ({ ...c, id: crypto.randomUUID() }));
      localStorage.setItem(KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as CalhaBiblioteca[];
  } catch {
    return [];
  }
}

function persistir(lista: CalhaBiblioteca[]) {
  localStorage.setItem(KEY, JSON.stringify(lista));
}

export function salvarItemBiblioteca(item: CalhaBiblioteca) {
  const lista = listarBiblioteca();
  const idx = lista.findIndex((x) => x.id === item.id);
  if (idx >= 0) lista[idx] = item;
  else lista.unshift(item);
  persistir(lista);
}

export function removerItemBiblioteca(id: string) {
  persistir(listarBiblioteca().filter((x) => x.id !== id));
}

export function restaurarBibliotecaPadrao(): CalhaBiblioteca[] {
  localStorage.removeItem(KEY);
  return listarBiblioteca();
}
