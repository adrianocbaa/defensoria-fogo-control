import { z } from 'zod';

export const FONTES_INTENSIDADE = [
  'Tabela NBR 10844',
  'Curva IDF local',
  'Estação pluviométrica',
  'Entrada manual',
] as const;

export const chuvaProjetoSchema = z.object({
  intensidade_mm_h: z
    .number({ invalid_type_error: 'Informe um número' })
    .positive('Deve ser maior que zero')
    .max(1000, 'Valor improvável (> 1000 mm/h)'),
  tempo_retorno_anos: z
    .number({ invalid_type_error: 'Informe um número' })
    .int('Deve ser inteiro')
    .min(1, 'Mínimo 1 ano')
    .max(100, 'Máximo 100 anos'),
  duracao_min: z
    .number({ invalid_type_error: 'Informe um número' })
    .int('Deve ser inteiro')
    .min(1, 'Mínimo 1 minuto')
    .max(180, 'Máximo 180 minutos'),
  fonte: z.enum(FONTES_INTENSIDADE, {
    errorMap: () => ({ message: 'Selecione a fonte' }),
  }),
  observacoes_chuva: z.string().max(500).optional().or(z.literal('')),
});

export type ChuvaProjeto = z.infer<typeof chuvaProjetoSchema>;
