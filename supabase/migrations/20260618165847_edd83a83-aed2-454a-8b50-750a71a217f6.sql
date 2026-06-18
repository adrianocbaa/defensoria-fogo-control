ALTER TABLE public.dimensionamento_intensidades_pluviometricas
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.dimensionamento_intensidades_pluviometricas
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Authenticated insert intensidades"
  ON public.dimensionamento_intensidades_pluviometricas;

CREATE POLICY "Authenticated insert intensidades"
  ON public.dimensionamento_intensidades_pluviometricas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_system = false);

INSERT INTO public.dimensionamento_intensidades_pluviometricas
  (user_id, is_system, cidade, uf, intensidade_mm_h, tempo_retorno_anos, duracao_min, fonte, observacoes)
VALUES
  (NULL, true, 'Aracaju',              'SE', 116, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Belém',                 'PA', 157, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Belo Horizonte',        'MG', 132, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Boa Vista',             'RR', 138, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Brasília',              'DF', 133, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Campo Grande',          'MS', 144, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Cuiabá',                'MT', 144, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Curitiba',              'PR', 132, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Florianópolis',         'SC', 114, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Fortaleza',             'CE', 120, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Goiânia',               'GO', 120, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'João Pessoa',           'PB', 115, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Macapá',                'AP', 144, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Maceió',                'AL', 102, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Manaus',                'AM', 138, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Natal',                 'RN', 113, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Palmas',                'TO', 132, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Porto Alegre',          'RS', 118, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Porto Velho',           'RO', 138, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Recife',                'PE', 115, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Rio Branco',            'AC', 138, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Rio de Janeiro',        'RJ', 167, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Salvador',              'BA', 108, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'São Luís',              'MA', 127, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'São Paulo',             'SP', 122, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Teresina',              'PI', 154, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Vitória',               'ES', 102, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Campinas',              'SP', 128, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Santos',                'SP', 136, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Ribeirão Preto',        'SP', 134, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'São José dos Campos',   'SP', 130, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Uberlândia',            'MG', 121, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Juiz de Fora',          'MG', 122, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Londrina',              'PR', 130, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Maringá',               'PR', 125, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Caxias do Sul',         'RS', 117, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Pelotas',               'RS', 110, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Joinville',             'SC', 122, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Blumenau',              'SC', 120, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Feira de Santana',      'BA', 110, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Petrolina',             'PE', 122, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Niterói',               'RJ', 165, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A'),
  (NULL, true, 'Petrópolis',            'RJ', 145, 5, 5, 'Tabela NBR 10844', 'NBR 10844:1989 - Anexo A')
ON CONFLICT (cidade, uf, tempo_retorno_anos, duracao_min) DO NOTHING;