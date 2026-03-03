
-- ETAPA 2C: RDO Reports - 30 dias com valores corretos de clima/cond
INSERT INTO public.rdo_reports (id, obra_id, data, numero_seq, status, clima_manha, clima_tarde, clima_noite, cond_manha, cond_tarde, cond_noite, observacoes, created_at, updated_at)
VALUES
('de000002-de00-4001-8000-de0000000001','de000002-de00-4000-8000-de0000000002','2024-08-05',1,'aprovado','claro','claro','claro','praticavel','praticavel','praticavel','Servicos de locacao e nivelamento iniciados. Equipe de 8 funcionarios.',now(),now()),
('de000002-de00-4001-8000-de0000000002','de000002-de00-4000-8000-de0000000002','2024-08-06',2,'aprovado','claro','nublado','claro','praticavel','praticavel','praticavel','Continuacao da locacao. Inicio da montagem do barracao de obra.',now(),now()),
('de000002-de00-4001-8000-de0000000003','de000002-de00-4000-8000-de0000000002','2024-08-07',3,'aprovado','nublado','chuvoso','nublado','praticavel','impraticavel','praticavel','Paralisacao parcial por chuva as 14h. Barracao concluido.',now(),now()),
('de000002-de00-4001-8000-de0000000004','de000002-de00-4000-8000-de0000000002','2024-08-08',4,'aprovado','claro','claro','claro','praticavel','praticavel','praticavel','Locacao concluida. Placa instalada. Inicio das escavacoes.',now(),now()),
('de000002-de00-4001-8000-de0000000005','de000002-de00-4000-8000-de0000000002','2024-08-09',5,'aprovado','claro','claro','claro','praticavel','praticavel','praticavel','Escavacoes de valas em andamento. 35m3 executados.',now(),now()),
('de000002-de00-4001-8000-de0000000006','de000002-de00-4000-8000-de0000000002','2024-08-12',6,'aprovado','claro','nublado','claro','praticavel','praticavel','praticavel','Escavacoes concluidas. Total 85m3. Inicio do lastro de concreto.',now(),now()),
('de000002-de00-4001-8000-de0000000007','de000002-de00-4000-8000-de0000000002','2024-08-13',7,'aprovado','claro','claro','claro','praticavel','praticavel','praticavel','Lastro de concreto magro concluido (12,5m3). Inicio armacao fundacao.',now(),now()),
('de000002-de00-4001-8000-de0000000008','de000002-de00-4000-8000-de0000000002','2024-08-14',8,'aprovado','nublado','nublado','claro','praticavel','praticavel','praticavel','Armacao CA-50 fundacao em andamento. 380kg colocados.',now(),now()),
('de000002-de00-4001-8000-de0000000009','de000002-de00-4000-8000-de0000000002','2024-08-15',9,'aprovado','claro','claro','claro','praticavel','praticavel','praticavel','Armacao fundacao concluida (980kg). Concretagem iniciada.',now(),now()),
('de000002-de00-4001-8000-de0000000010','de000002-de00-4000-8000-de0000000002','2024-08-16',10,'aprovado','claro','claro','claro','praticavel','praticavel','praticavel','Concretagem fundacao concluida (42m3 fck25). Inicio das formas.',now(),now()),
('de000002-de00-4001-8000-de0000000011','de000002-de00-4000-8000-de0000000002','2024-08-19',11,'aprovado','claro','nublado','claro','praticavel','praticavel','praticavel','Montagem de formas para pilares - 120m2 executados.',now(),now()),
('de000002-de00-4001-8000-de0000000012','de000002-de00-4000-8000-de0000000002','2024-08-20',12,'aprovado','claro','claro','claro','praticavel','praticavel','praticavel','Formas pilares concluidas (380m2). Armacao estrutura em andamento.',now(),now()),
('de000002-de00-4001-8000-de0000000013','de000002-de00-4000-8000-de0000000002','2024-08-21',13,'aprovado','nublado','claro','claro','praticavel','praticavel','praticavel','Armacao estrutura: 1.200kg CA-50 colocados.',now(),now()),
('de000002-de00-4001-8000-de0000000014','de000002-de00-4000-8000-de0000000002','2024-08-22',14,'aprovado','claro','claro','claro','praticavel','praticavel','praticavel','Armacao estrutura: total 2.850kg. Inicio concretagem pilares.',now(),now()),
('de000002-de00-4001-8000-de0000000015','de000002-de00-4000-8000-de0000000002','2024-08-23',15,'aprovado','nublado','chuvoso','nublado','praticavel','impraticavel','praticavel','Concretagem pilares: 45m3. Paralisacao as 15h30 por chuva.',now(),now()),
('de000002-de00-4001-8000-de0000000016','de000002-de00-4000-8000-de0000000002','2024-08-26',16,'aprovado','claro','claro','claro','praticavel','praticavel','praticavel','Concretagem vigas e pilares concluida (95m3 fck25).',now(),now()),
('de000002-de00-4001-8000-de0000000017','de000002-de00-4000-8000-de0000000002','2024-08-27',17,'aprovado','claro','claro','claro','praticavel','praticavel','praticavel','Inicio da laje pre-moldada. 85m2 executados.',now(),now()),
('de000002-de00-4001-8000-de0000000018','de000002-de00-4000-8000-de0000000002','2024-08-28',18,'aprovado','claro','nublado','claro','praticavel','praticavel','praticavel','Laje pre-moldada: 200m2 concluidos.',now(),now()),
('de000002-de00-4001-8000-de0000000019','de000002-de00-4000-8000-de0000000002','2024-08-29',19,'aprovado','claro','claro','claro','praticavel','praticavel','praticavel','Laje pre-moldada concluida (285m2). Inicio alvenaria.',now(),now()),
('de000002-de00-4001-8000-de0000000020','de000002-de00-4000-8000-de0000000002','2024-08-30',20,'aprovado','claro','claro','claro','praticavel','praticavel','praticavel','Alvenaria bloco ceramico: 180m2 executados.',now(),now()),
('de000002-de00-4001-8000-de0000000021','de000002-de00-4000-8000-de0000000002','2024-09-02',21,'aprovado','claro','claro','claro','praticavel','praticavel','praticavel','Alvenaria: total 380m2 blocos ceramicos.',now(),now()),
('de000002-de00-4001-8000-de0000000022','de000002-de00-4000-8000-de0000000002','2024-09-03',22,'aprovado','nublado','chuvoso','nublado','praticavel','impraticavel','praticavel','Chuva intensa. Paralisacao total. Alvenaria area molhada: 40m2.',now(),now()),
('de000002-de00-4001-8000-de0000000023','de000002-de00-4000-8000-de0000000002','2024-09-04',23,'aprovado','claro','claro','claro','praticavel','praticavel','praticavel','Alvenaria ceramica concluida (520m2). Area molhada 85m2 concluida.',now(),now()),
('de000002-de00-4001-8000-de0000000024','de000002-de00-4000-8000-de0000000002','2024-09-05',24,'aprovado','claro','claro','claro','praticavel','praticavel','praticavel','Inicio estrutura metalica cobertura. 620kg montados.',now(),now()),
('de000002-de00-4001-8000-de0000000025','de000002-de00-4000-8000-de0000000002','2024-09-06',25,'aprovado','claro','nublado','claro','praticavel','praticavel','praticavel','Estrutura metalica: 1.280kg. Telha termoacustica iniciada.',now(),now()),
('de000002-de00-4001-8000-de0000000026','de000002-de00-4000-8000-de0000000002','2024-09-09',26,'aprovado','claro','claro','claro','praticavel','praticavel','praticavel','Estrutura metalica concluida (1.850kg). Telha: 180m2.',now(),now()),
('de000002-de00-4001-8000-de0000000027','de000002-de00-4000-8000-de0000000002','2024-09-10',27,'aprovado','nublado','claro','claro','praticavel','praticavel','praticavel','Telha termoacustica concluida (320m2). Calhas iniciadas.',now(),now()),
('de000002-de00-4001-8000-de0000000028','de000002-de00-4000-8000-de0000000002','2024-09-11',28,'aprovado','claro','claro','claro','praticavel','praticavel','praticavel','Calhas concluidas (85m). Inicio instalacoes hidrossanitarias.',now(),now()),
('de000002-de00-4001-8000-de0000000029','de000002-de00-4000-8000-de0000000002','2024-09-12',29,'aprovado','claro','claro','claro','praticavel','praticavel','praticavel','Tubulacoes agua fria (185m) e esgoto (120m) concluidas.',now(),now()),
('de000002-de00-4001-8000-de0000000030','de000002-de00-4000-8000-de0000000002','2024-09-13',30,'concluido','claro','claro','claro','praticavel','praticavel','praticavel','Caixa dagua instalada (2un). Inicio das loucas sanitarias.',now(),now())
ON CONFLICT (obra_id, data) DO NOTHING;

-- ETAPA 2D: Atividades nos RDOs (vinculadas à planilha orçamentária)
INSERT INTO public.rdo_activities (id, obra_id, report_id, descricao, tipo, orcamento_item_id, executado_dia, unidade, item_code, created_at)
VALUES
('de000003-de00-4000-8000-de0000000001','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000001','Locacao e nivelamento de obras','planilha','de010002-de00-4000-8000-de0000000002',160,'m2','1.1',now()),
('de000003-de00-4000-8000-de0000000002','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000002','Locacao e nivelamento de obras','planilha','de010002-de00-4000-8000-de0000000002',160,'m2','1.1',now()),
('de000003-de00-4000-8000-de0000000003','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000002','Barracao de obra c/ sanitario','planilha','de010003-de00-4000-8000-de0000000003',24,'m2','1.2',now()),
('de000003-de00-4000-8000-de0000000004','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000004','Placa de obra em chapa galvanizada','planilha','de010004-de00-4000-8000-de0000000004',6,'m2','1.3',now()),
('de000003-de00-4000-8000-de0000000005','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000004','Escavacao manual de vala h<1,5m','planilha','de020002-de00-4000-8000-de0000000002',30,'m3','2.1',now()),
('de000003-de00-4000-8000-de0000000006','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000005','Escavacao manual de vala h<1,5m','planilha','de020002-de00-4000-8000-de0000000002',35,'m3','2.1',now()),
('de000003-de00-4000-8000-de0000000007','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000006','Escavacao manual de vala h<1,5m','planilha','de020002-de00-4000-8000-de0000000002',20,'m3','2.1',now()),
('de000003-de00-4000-8000-de0000000008','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000006','Concreto magro para lastro fck=15MPa','planilha','de020003-de00-4000-8000-de0000000003',12.5,'m3','2.2',now()),
('de000003-de00-4000-8000-de0000000009','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000008','Armacao aco CA-50 fundacao','planilha','de020004-de00-4000-8000-de0000000004',380,'kg','2.3',now()),
('de000003-de00-4000-8000-de0000000010','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000009','Armacao aco CA-50 fundacao','planilha','de020004-de00-4000-8000-de0000000004',600,'kg','2.3',now()),
('de000003-de00-4000-8000-de0000000011','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000009','Concreto fck=25MPa fundacao','planilha','de020005-de00-4000-8000-de0000000005',20,'m3','2.4',now()),
('de000003-de00-4000-8000-de0000000012','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000010','Concreto fck=25MPa fundacao','planilha','de020005-de00-4000-8000-de0000000005',22,'m3','2.4',now()),
('de000003-de00-4000-8000-de0000000013','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000011','Forma p/ estrutura c/ reaproveitamento','planilha','de030002-de00-4000-8000-de0000000002',120,'m2','3.1',now()),
('de000003-de00-4000-8000-de0000000014','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000012','Forma p/ estrutura c/ reaproveitamento','planilha','de030002-de00-4000-8000-de0000000002',260,'m2','3.1',now()),
('de000003-de00-4000-8000-de0000000015','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000013','Armacao aco CA-50 estrutura','planilha','de030003-de00-4000-8000-de0000000003',1200,'kg','3.2',now()),
('de000003-de00-4000-8000-de0000000016','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000014','Armacao aco CA-50 estrutura','planilha','de030003-de00-4000-8000-de0000000003',1650,'kg','3.2',now()),
('de000003-de00-4000-8000-de0000000017','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000015','Concreto fck=25MPa pilares/vigas','planilha','de030004-de00-4000-8000-de0000000004',45,'m3','3.3',now()),
('de000003-de00-4000-8000-de0000000018','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000016','Concreto fck=25MPa pilares/vigas','planilha','de030004-de00-4000-8000-de0000000004',50,'m3','3.3',now()),
('de000003-de00-4000-8000-de0000000019','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000017','Laje pre-moldada c/ EPS','planilha','de030005-de00-4000-8000-de0000000005',85,'m2','3.4',now()),
('de000003-de00-4000-8000-de0000000020','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000018','Laje pre-moldada c/ EPS','planilha','de030005-de00-4000-8000-de0000000005',115,'m2','3.4',now()),
('de000003-de00-4000-8000-de0000000021','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000019','Laje pre-moldada c/ EPS','planilha','de030005-de00-4000-8000-de0000000005',85,'m2','3.4',now()),
('de000003-de00-4000-8000-de0000000022','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000020','Alvenaria bloco ceramico 9x14x19cm','planilha','de040002-de00-4000-8000-de0000000002',180,'m2','4.1',now()),
('de000003-de00-4000-8000-de0000000023','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000021','Alvenaria bloco ceramico 9x14x19cm','planilha','de040002-de00-4000-8000-de0000000002',200,'m2','4.1',now()),
('de000003-de00-4000-8000-de0000000024','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000022','Alvenaria bloco concreto area molhada','planilha','de040003-de00-4000-8000-de0000000003',40,'m2','4.2',now()),
('de000003-de00-4000-8000-de0000000025','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000023','Alvenaria bloco ceramico 9x14x19cm','planilha','de040002-de00-4000-8000-de0000000002',140,'m2','4.1',now()),
('de000003-de00-4000-8000-de0000000026','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000023','Alvenaria bloco concreto area molhada','planilha','de040003-de00-4000-8000-de0000000003',45,'m2','4.2',now()),
('de000003-de00-4000-8000-de0000000027','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000024','Estrutura metalica p/ telhado','planilha','de050002-de00-4000-8000-de0000000002',620,'kg','5.1',now()),
('de000003-de00-4000-8000-de0000000028','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000025','Estrutura metalica p/ telhado','planilha','de050002-de00-4000-8000-de0000000002',660,'kg','5.1',now()),
('de000003-de00-4000-8000-de0000000029','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000025','Telha termoacustica e=30mm','planilha','de050003-de00-4000-8000-de0000000003',60,'m2','5.2',now()),
('de000003-de00-4000-8000-de0000000030','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000026','Estrutura metalica p/ telhado','planilha','de050002-de00-4000-8000-de0000000002',570,'kg','5.1',now()),
('de000003-de00-4000-8000-de0000000031','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000026','Telha termoacustica e=30mm','planilha','de050003-de00-4000-8000-de0000000003',120,'m2','5.2',now()),
('de000003-de00-4000-8000-de0000000032','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000027','Telha termoacustica e=30mm','planilha','de050003-de00-4000-8000-de0000000003',140,'m2','5.2',now()),
('de000003-de00-4000-8000-de0000000033','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000027','Calha em chapa galvanizada','planilha','de050004-de00-4000-8000-de0000000004',85,'m','5.3',now()),
('de000003-de00-4000-8000-de0000000034','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000028','Tubulacao PVC 25mm - agua fria','planilha','de060002-de00-4000-8000-de0000000002',185,'m','6.1',now()),
('de000003-de00-4000-8000-de0000000035','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000029','Tubulacao PVC 50mm - esgoto','planilha','de060003-de00-4000-8000-de0000000003',120,'m','6.2',now()),
('de000003-de00-4000-8000-de0000000036','de000002-de00-4000-8000-de0000000002','de000002-de00-4001-8000-de0000000030','Caixa dagua fibra 1000L c/ instalacao','planilha','de060004-de00-4000-8000-de0000000004',2,'un','6.3',now())
ON CONFLICT (id) DO NOTHING;

-- ETAPA 2E: Sessões de medição
INSERT INTO public.medicao_sessions (id, obra_id, sequencia, status, created_at, updated_at)
VALUES
('de000004-de00-4000-8000-de0000000001','de000002-de00-4000-8000-de0000000002',1,'bloqueada',now(),now()),
('de000004-de00-4000-8000-de0000000002','de000002-de00-4000-8000-de0000000002',2,'aberta',now(),now())
ON CONFLICT (id) DO NOTHING;

-- ETAPA 2F: Itens 1ª medição
INSERT INTO public.medicao_items (id, medicao_id, item_code, qtd, pct, total, created_at, updated_at)
VALUES
('de000005-de00-4000-8000-de0000000001','de000004-de00-4000-8000-de0000000001','1.1',320,100,1542.40,now(),now()),
('de000005-de00-4000-8000-de0000000002','de000004-de00-4000-8000-de0000000001','1.2',24,100,4452.00,now(),now()),
('de000005-de00-4000-8000-de0000000003','de000004-de00-4000-8000-de0000000001','1.3',6,100,1874.40,now(),now()),
('de000005-de00-4000-8000-de0000000004','de000004-de00-4000-8000-de0000000001','2.1',85,100,3585.30,now(),now()),
('de000005-de00-4000-8000-de0000000005','de000004-de00-4000-8000-de0000000001','2.2',12.5,100,4820.00,now(),now()),
('de000005-de00-4000-8000-de0000000006','de000004-de00-4000-8000-de0000000001','2.3',980,100,9653.00,now(),now()),
('de000005-de00-4000-8000-de0000000007','de000004-de00-4000-8000-de0000000001','2.4',42,100,22192.80,now(),now()),
('de000005-de00-4000-8000-de0000000008','de000004-de00-4000-8000-de0000000001','3.1',380,100,18525.00,now(),now()),
('de000005-de00-4000-8000-de0000000009','de000004-de00-4000-8000-de0000000001','3.2',2850,100,28072.50,now(),now()),
('de000005-de00-4000-8000-de0000000010','de000004-de00-4000-8000-de0000000001','3.3',95,100,50844.00,now(),now()),
('de000005-de00-4000-8000-de0000000011','de000004-de00-4000-8000-de0000000001','3.4',285,100,40555.50,now(),now())
ON CONFLICT (id) DO NOTHING;

-- ETAPA 2G: Itens 2ª medição
INSERT INTO public.medicao_items (id, medicao_id, item_code, qtd, pct, total, created_at, updated_at)
VALUES
('de000006-de00-4000-8000-de0000000001','de000004-de00-4000-8000-de0000000002','4.1',520,100,27248.00,now(),now()),
('de000006-de00-4000-8000-de0000000002','de000004-de00-4000-8000-de0000000002','4.2',85,100,5797.00,now(),now()),
('de000006-de00-4000-8000-de0000000003','de000004-de00-4000-8000-de0000000002','5.1',1850,100,34040.00,now(),now()),
('de000006-de00-4000-8000-de0000000004','de000004-de00-4000-8000-de0000000002','5.2',320,100,31520.00,now(),now()),
('de000006-de00-4000-8000-de0000000005','de000004-de00-4000-8000-de0000000002','5.3',85,100,5295.50,now(),now()),
('de000006-de00-4000-8000-de0000000006','de000004-de00-4000-8000-de0000000002','6.1',185,100,2294.00,now(),now()),
('de000006-de00-4000-8000-de0000000007','de000004-de00-4000-8000-de0000000002','6.2',120,100,2232.00,now(),now()),
('de000006-de00-4000-8000-de0000000008','de000004-de00-4000-8000-de0000000002','6.3',2,100,2570.00,now(),now())
ON CONFLICT (id) DO NOTHING;
