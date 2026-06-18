import { z } from 'zod';

export const TIPOS_TELHADO = [
  'Cerâmica',
  'Fibrocimento',
  'Metálica (trapezoidal)',
  'Metálica (zipada)',
  'Concreto',
  'Polímero/PVC',
  'Vidro',
  'Outro',
] as const;

export const UNIDADES_INCLINACAO = ['%', 'graus'] as const;

export const panoSchema = z.object({
  id: z.string(),
  nome: z.string().trim().min(1, 'Informe o nome do pano').max(60),
  comprimento_m: z.coerce.number().positive('Comprimento deve ser > 0').max(500),
  projecao_m: z.coerce.number().positive('Projeção deve ser > 0').max(200),
  inclinacao_valor: z.coerce.number().min(0, 'Inclinação inválida').max(1000),
  inclinacao_unidade: z.enum(UNIDADES_INCLINACAO),
  tipo_telhado: z.enum(TIPOS_TELHADO),
  calha_associada: z.string().trim().max(60).optional().or(z.literal('')),
});

export type Pano = z.infer<typeof panoSchema>;

export const panosFormSchema = z.object({
  panos: z.array(panoSchema).min(1, 'Cadastre pelo menos um pano'),
});

export type PanosForm = z.infer<typeof panosFormSchema>;

/**
 * Conversão da inclinação para ângulo em radianos.
 */
export function inclinacaoEmRadianos(valor: number, unidade: '%' | 'graus'): number {
  if (unidade === 'graus') return (valor * Math.PI) / 180;
  // % de inclinação = tan(θ) × 100  →  θ = atan(valor/100)
  return Math.atan(valor / 100);
}

/**
 * Área de contribuição conforme NBR 10844:1989 — Tabela 1
 * Telhado de uma água: A = (a + h/2) × b
 *   a = projeção horizontal (m)
 *   b = comprimento horizontal (m)
 *   h = altura = a × tan(θ)
 * → A_contrib = a · b · (1 + tan(θ)/2)
 */
export function calcularAreaContribuicao(pano: Pano) {
  const theta = inclinacaoEmRadianos(pano.inclinacao_valor, pano.inclinacao_unidade);
  const a = pano.projecao_m;
  const b = pano.comprimento_m;
  const tanT = Math.tan(theta);
  const cosT = Math.cos(theta);
  const areaPlanta = a * b;
  const areaInclinada = cosT > 0 ? areaPlanta / cosT : areaPlanta;
  const areaContrib = areaPlanta * (1 + tanT / 2);
  const inclinacaoGraus = (theta * 180) / Math.PI;
  const inclinacaoPct = tanT * 100;
  return {
    areaPlanta: +areaPlanta.toFixed(2),
    areaInclinada: +areaInclinada.toFixed(2),
    areaContribuicao: +areaContrib.toFixed(2),
    inclinacaoGraus: +inclinacaoGraus.toFixed(2),
    inclinacaoPct: +inclinacaoPct.toFixed(2),
  };
}
