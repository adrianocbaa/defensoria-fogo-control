import { z } from 'zod';
import { TIPOS_CALHA } from './calhaSchema';

export const bibliotecaCalhaSchema = z
  .object({
    id: z.string(),
    nome: z.string().trim().min(1, 'Informe o nome').max(80),
    tipo: z.enum(TIPOS_CALHA),
    material: z.string().trim().min(1, 'Informe o material').max(60),
    manning_n: z.coerce.number().positive('n > 0').max(0.1),
    largura_m: z.coerce.number().min(0).max(5).optional(),
    altura_m: z.coerce.number().min(0).max(5).optional(),
    diametro_m: z.coerce.number().min(0).max(5).optional(),
    base_menor_m: z.coerce.number().min(0).max(5).optional(),
    base_maior_m: z.coerce.number().min(0).max(5).optional(),
    observacoes: z.string().max(300).optional().or(z.literal('')),
  })
  .superRefine((c, ctx) => {
    const need = (path: string, msg: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message: msg });
    if (c.tipo === 'semicircular' && !c.diametro_m) need('diametro_m', 'Informe o diâmetro');
    if (c.tipo === 'retangular') {
      if (!c.largura_m) need('largura_m', 'Informe a largura');
      if (!c.altura_m) need('altura_m', 'Informe a altura');
    }
    if (c.tipo === 'trapezoidal') {
      if (!c.base_menor_m) need('base_menor_m', 'Informe a base menor');
      if (!c.base_maior_m) need('base_maior_m', 'Informe a base maior');
      if (!c.altura_m) need('altura_m', 'Informe a altura');
    }
  });

export type CalhaBiblioteca = z.infer<typeof bibliotecaCalhaSchema>;
