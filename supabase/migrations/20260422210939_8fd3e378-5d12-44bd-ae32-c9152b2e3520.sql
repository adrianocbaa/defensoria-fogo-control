-- Corrige códigos avulsos em medicao_items da obra Impermeabilização - Núcleo de Rio Branco
-- (e8f7606c-0271-4416-9c95-8bfd09be9d42), restaurando o vínculo hierárquico (item) com o orçamento.
-- Sem essa correção, o cálculo de medições ignora os itens gravados com código de banco (CP.DPMT.*),
-- fazendo a barra de medição cair de 100% para ~91%.

UPDATE public.medicao_items SET item_code = '2.1'
 WHERE medicao_id = 'a7b9e934-a07a-4a42-9c96-cbd4bbfb36de' AND item_code = 'CP.DPMT.0943';

UPDATE public.medicao_items SET item_code = '2.3'
 WHERE medicao_id = 'a7b9e934-a07a-4a42-9c96-cbd4bbfb36de' AND item_code = 'CP.DPMT.0286';

UPDATE public.medicao_items SET item_code = '3.2'
 WHERE medicao_id = 'a7b9e934-a07a-4a42-9c96-cbd4bbfb36de' AND item_code = 'CP.DPMT.0330';

UPDATE public.medicao_items SET item_code = '4.1'
 WHERE medicao_id = 'a7b9e934-a07a-4a42-9c96-cbd4bbfb36de' AND item_code = 'CP.DPMT.0991';

UPDATE public.medicao_items SET item_code = '5.2'
 WHERE medicao_id = 'a7b9e934-a07a-4a42-9c96-cbd4bbfb36de' AND item_code = 'CP.DPMT.0010';

UPDATE public.medicao_items SET item_code = '5.3'
 WHERE medicao_id = 'a7b9e934-a07a-4a42-9c96-cbd4bbfb36de' AND item_code = 'CP.DPMT.0210';

UPDATE public.medicao_items SET item_code = '5.4'
 WHERE medicao_id = 'a7b9e934-a07a-4a42-9c96-cbd4bbfb36de' AND item_code = 'CP.DPMT.0112';