import { z } from 'zod';

export const TIPOS_CALHA = [
  'semicircular',
  'retangular',
  'trapezoidal',
  'personalizada',
] as const;

export type TipoCalha = (typeof TIPOS_CALHA)[number];

/**
 * Materiais comuns e respectivos coeficientes de rugosidade de Manning (n)
 * — referência: NBR 10844:1989 / literatura hidráulica.
 */
export const MATERIAIS_CALHA: { nome: string; n: number }[] = [
  { nome: 'PVC', n: 0.011 },
  { nome: 'Aço galvanizado (chapa lisa)', n: 0.012 },
  { nome: 'Alumínio', n: 0.012 },
  { nome: 'Cobre', n: 0.011 },
  { nome: 'Concreto liso (acabado)', n: 0.012 },
  { nome: 'Concreto rugoso', n: 0.016 },
  { nome: 'Aço corrugado', n: 0.022 },
  { nome: 'Fibrocimento', n: 0.013 },
  { nome: 'Outro (informar n)', n: 0.013 },
];

export const pontoDescidaSchema = z.object({
  id: z.string(),
  rotulo: z.string().trim().min(1, 'Informe o rótulo').max(40),
  posicao_m: z.coerce.number().min(0, 'Posição inválida').max(500),
});

export const calhaSchema = z
  .object({
    id: z.string(),
    nome: z.string().trim().min(1, 'Informe o nome da calha').max(60),
    comprimento_m: z.coerce.number().positive('Comprimento deve ser > 0').max(500),
    tipo: z.enum(TIPOS_CALHA),
    declividade_pct: z.coerce
      .number()
      .min(0.05, 'Mínimo 0,05% (NBR 10844)')
      .max(20),
    material: z.string().trim().min(1, 'Selecione o material').max(60),
    manning_n: z.coerce.number().positive('n deve ser > 0').max(0.1),
    // dimensões — alguns campos só se aplicam a determinado tipo
    largura_m: z.coerce.number().min(0).max(5).optional(),
    altura_m: z.coerce.number().min(0).max(5).optional(),
    diametro_m: z.coerce.number().min(0).max(5).optional(),
    base_menor_m: z.coerce.number().min(0).max(5).optional(),
    base_maior_m: z.coerce.number().min(0).max(5).optional(),
    geometria_personalizada: z.string().max(500).optional().or(z.literal('')),
    pontos_descida: z.array(pontoDescidaSchema).min(1, 'Cadastre ao menos um ponto de descida'),
  })
  .superRefine((c, ctx) => {
    const need = (path: string, msg: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message: msg });

    if (c.tipo === 'semicircular') {
      if (!c.diametro_m || c.diametro_m <= 0) need('diametro_m', 'Informe o diâmetro (m)');
    }
    if (c.tipo === 'retangular') {
      if (!c.largura_m || c.largura_m <= 0) need('largura_m', 'Informe a largura (m)');
      if (!c.altura_m || c.altura_m <= 0) need('altura_m', 'Informe a altura (m)');
    }
    if (c.tipo === 'trapezoidal') {
      if (!c.base_menor_m || c.base_menor_m <= 0) need('base_menor_m', 'Informe a base menor (m)');
      if (!c.base_maior_m || c.base_maior_m <= 0) need('base_maior_m', 'Informe a base maior (m)');
      if (!c.altura_m || c.altura_m <= 0) need('altura_m', 'Informe a altura (m)');
    }
    if (c.tipo === 'personalizada') {
      if (!c.geometria_personalizada?.trim())
        need('geometria_personalizada', 'Descreva a geometria personalizada');
    }
    // pontos de descida dentro do comprimento
    c.pontos_descida.forEach((p, i) => {
      if (p.posicao_m > c.comprimento_m) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['pontos_descida', i, 'posicao_m'],
          message: 'Posição além do comprimento da calha',
        });
      }
    });
  });

export type Calha = z.infer<typeof calhaSchema>;
export type PontoDescida = z.infer<typeof pontoDescidaSchema>;

export const calhasFormSchema = z.object({
  calhas: z.array(calhaSchema).min(1, 'Cadastre pelo menos uma calha'),
});

export type CalhasForm = z.infer<typeof calhasFormSchema>;

/**
 * Geometria da seção transversal — área molhada e perímetro a partir
 * das dimensões e do nível de lâmina (y). Usado depois no cálculo de vazão
 * via Manning. Aqui apenas exporta helpers básicos.
 */
export function areaSecaoCheia(c: Calha): number | null {
  switch (c.tipo) {
    case 'semicircular':
      return c.diametro_m ? (Math.PI * (c.diametro_m / 2) ** 2) / 2 : null;
    case 'retangular':
      return c.largura_m && c.altura_m ? c.largura_m * c.altura_m : null;
    case 'trapezoidal':
      return c.base_menor_m && c.base_maior_m && c.altura_m
        ? ((c.base_menor_m + c.base_maior_m) / 2) * c.altura_m
        : null;
    default:
      return null;
  }
}
