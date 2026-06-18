import { z } from 'zod';
import { UFS, TIPOS_EDIFICACAO } from './constants';

export const cadastroObraSchema = z.object({
  nome_obra: z
    .string()
    .trim()
    .min(1, 'Informe o nome da obra')
    .max(150, 'Máximo 150 caracteres'),
  cidade: z
    .string()
    .trim()
    .min(1, 'Informe a cidade')
    .max(100, 'Máximo 100 caracteres'),
  uf: z.enum(UFS, { errorMap: () => ({ message: 'Selecione a UF' }) }),
  tipo_edificacao: z.enum(TIPOS_EDIFICACAO, {
    errorMap: () => ({ message: 'Selecione o tipo de edificação' }),
  }),
  responsavel_tecnico: z
    .string()
    .trim()
    .min(1, 'Informe o responsável técnico')
    .max(150, 'Máximo 150 caracteres'),
  data_calculo: z.string().min(1, 'Informe a data do cálculo'),
  observacoes: z.string().max(2000, 'Máximo 2000 caracteres').optional().or(z.literal('')),
});

export type CadastroObra = z.infer<typeof cadastroObraSchema>;
