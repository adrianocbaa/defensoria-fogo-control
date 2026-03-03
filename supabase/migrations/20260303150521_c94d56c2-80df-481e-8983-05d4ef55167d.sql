
-- ============================================================
-- ETAPA 2B: Planilha orçamentária SINAPI para obra demo
-- ============================================================
INSERT INTO public.orcamento_items (id, obra_id, item, codigo, descricao, unidade, quantidade, valor_unitario, valor_total, total_contrato, banco, origem, nivel, eh_administracao_local, created_at, updated_at)
VALUES
-- GRUPO 1: SERVIÇOS PRELIMINARES
('de010001-de00-4000-8000-de0000000001','de000002-de00-4000-8000-de0000000002','1','','SERVIÇOS PRELIMINARES','vb',1,0,0,0,'SINAPI','contratual',1,false,now(),now()),
('de010002-de00-4000-8000-de0000000002','de000002-de00-4000-8000-de0000000002','1.1','74209/001','Locação e nivelamento de obras','m²',320,4.82,1542.40,1542.40,'SINAPI','contratual',2,false,now(),now()),
('de010003-de00-4000-8000-de0000000003','de000002-de00-4000-8000-de0000000002','1.2','73964/001','Barracão de obra c/ sanitário','m²',24,185.50,4452.00,4452.00,'SINAPI','contratual',2,false,now(),now()),
('de010004-de00-4000-8000-de0000000004','de000002-de00-4000-8000-de0000000002','1.3','90763','Placa de obra em chapa galvanizada','m²',6,312.40,1874.40,1874.40,'SINAPI','contratual',2,false,now(),now()),
-- GRUPO 2: INFRAESTRUTURA / FUNDAÇÃO
('de020001-de00-4000-8000-de0000000001','de000002-de00-4000-8000-de0000000002','2','','INFRAESTRUTURA E FUNDAÇÃO','vb',1,0,0,0,'SINAPI','contratual',1,false,now(),now()),
('de020002-de00-4000-8000-de0000000002','de000002-de00-4000-8000-de0000000002','2.1','74136/001','Escavação manual de vala h<1,5m','m³',85,42.18,3585.30,3585.30,'SINAPI','contratual',2,false,now(),now()),
('de020003-de00-4000-8000-de0000000003','de000002-de00-4000-8000-de0000000002','2.2','73895/001','Concreto magro para lastro fck=15MPa','m³',12.5,385.60,4820.00,4820.00,'SINAPI','contratual',2,false,now(),now()),
('de020004-de00-4000-8000-de0000000004','de000002-de00-4000-8000-de0000000002','2.3','73971/002','Armação aço CA-50 p/ fundação','kg',980,9.85,9653.00,9653.00,'SINAPI','contratual',2,false,now(),now()),
('de020005-de00-4000-8000-de0000000005','de000002-de00-4000-8000-de0000000002','2.4','73971/003','Concreto fck=25MPa p/ fundação','m³',42,528.40,22192.80,22192.80,'SINAPI','contratual',2,false,now(),now()),
-- GRUPO 3: ESTRUTURA
('de030001-de00-4000-8000-de0000000001','de000002-de00-4000-8000-de0000000002','3','','ESTRUTURA','vb',1,0,0,0,'SINAPI','contratual',1,false,now(),now()),
('de030002-de00-4000-8000-de0000000002','de000002-de00-4000-8000-de0000000002','3.1','74157/001','Forma p/ estrutura c/ reaproveitamento','m²',380,48.75,18525.00,18525.00,'SINAPI','contratual',2,false,now(),now()),
('de030003-de00-4000-8000-de0000000003','de000002-de00-4000-8000-de0000000002','3.2','73971/004','Armação aço CA-50 p/ estrutura','kg',2850,9.85,28072.50,28072.50,'SINAPI','contratual',2,false,now(),now()),
('de030004-de00-4000-8000-de0000000004','de000002-de00-4000-8000-de0000000002','3.3','73971/005','Concreto fck=25MPa p/ pilares/vigas','m³',95,535.20,50844.00,50844.00,'SINAPI','contratual',2,false,now(),now()),
('de030005-de00-4000-8000-de0000000005','de000002-de00-4000-8000-de0000000002','3.4','73971/006','Laje pré-moldada c/ EPS','m²',285,142.30,40555.50,40555.50,'SINAPI','contratual',2,false,now(),now()),
-- GRUPO 4: ALVENARIA
('de040001-de00-4000-8000-de0000000001','de000002-de00-4000-8000-de0000000002','4','','ALVENARIA','vb',1,0,0,0,'SINAPI','contratual',1,false,now(),now()),
('de040002-de00-4000-8000-de0000000002','de000002-de00-4000-8000-de0000000002','4.1','87451','Alvenaria bloco cerâmico 9x14x19cm e=14cm','m²',520,52.40,27248.00,27248.00,'SINAPI','contratual',2,false,now(),now()),
('de040003-de00-4000-8000-de0000000003','de000002-de00-4000-8000-de0000000002','4.2','87532','Alvenaria bloco concreto e=14cm área molhada','m²',85,68.20,5797.00,5797.00,'SINAPI','contratual',2,false,now(),now()),
-- GRUPO 5: COBERTURA
('de050001-de00-4000-8000-de0000000001','de000002-de00-4000-8000-de0000000002','5','','COBERTURA','vb',1,0,0,0,'SINAPI','contratual',1,false,now(),now()),
('de050002-de00-4000-8000-de0000000002','de000002-de00-4000-8000-de0000000002','5.1','74078/001','Estrutura metálica p/ telhado','kg',1850,18.40,34040.00,34040.00,'SINAPI','contratual',2,false,now(),now()),
('de050003-de00-4000-8000-de0000000003','de000002-de00-4000-8000-de0000000002','5.2','88482','Telha termoacústica e=30mm','m²',320,98.50,31520.00,31520.00,'SINAPI','contratual',2,false,now(),now()),
('de050004-de00-4000-8000-de0000000004','de000002-de00-4000-8000-de0000000002','5.3','73952/002','Calha em chapa galvanizada n 24','m',85,62.30,5295.50,5295.50,'SINAPI','contratual',2,false,now(),now()),
-- GRUPO 6: INSTALAÇÕES HIDROSSANITÁRIAS
('de060001-de00-4000-8000-de0000000001','de000002-de00-4000-8000-de0000000002','6','','INSTALAÇÕES HIDROSSANITÁRIAS','vb',1,0,0,0,'SINAPI','contratual',1,false,now(),now()),
('de060002-de00-4000-8000-de0000000002','de000002-de00-4000-8000-de0000000002','6.1','89817','Tubulação PVC 25mm - água fria','m',185,12.40,2294.00,2294.00,'SINAPI','contratual',2,false,now(),now()),
('de060003-de00-4000-8000-de0000000003','de000002-de00-4000-8000-de0000000002','6.2','89818','Tubulação PVC 50mm - esgoto','m',120,18.60,2232.00,2232.00,'SINAPI','contratual',2,false,now(),now()),
('de060004-de00-4000-8000-de0000000004','de000002-de00-4000-8000-de0000000002','6.3','73968/002','Caixa dagua fibra 1000L c/ instalação','un',2,1285.00,2570.00,2570.00,'SINAPI','contratual',2,false,now(),now()),
('de060005-de00-4000-8000-de0000000005','de000002-de00-4000-8000-de0000000002','6.4','89819','Louças e metais - conjunto banheiro','cj',4,1850.00,7400.00,7400.00,'SINAPI','contratual',2,false,now(),now()),
-- GRUPO 7: INSTALAÇÕES ELÉTRICAS
('de070001-de00-4000-8000-de0000000001','de000002-de00-4000-8000-de0000000002','7','','INSTALAÇÕES ELÉTRICAS','vb',1,0,0,0,'SINAPI','contratual',1,false,now(),now()),
('de070002-de00-4000-8000-de0000000002','de000002-de00-4000-8000-de0000000002','7.1','91920','Eletroduto PVC 25mm embutido','m',380,8.90,3382.00,3382.00,'SINAPI','contratual',2,false,now(),now()),
('de070003-de00-4000-8000-de0000000003','de000002-de00-4000-8000-de0000000002','7.2','91921','Fio cabo flexível 2,5mm2','m',850,4.20,3570.00,3570.00,'SINAPI','contratual',2,false,now(),now()),
('de070004-de00-4000-8000-de0000000004','de000002-de00-4000-8000-de0000000002','7.3','91922','Quadro distribuição 12 disjuntores','un',3,485.00,1455.00,1455.00,'SINAPI','contratual',2,false,now(),now()),
('de070005-de00-4000-8000-de0000000005','de000002-de00-4000-8000-de0000000002','7.4','91923','Tomada 2P+T embutida com caixa','un',45,52.40,2358.00,2358.00,'SINAPI','contratual',2,false,now(),now()),
-- GRUPO 8: REVESTIMENTOS E ACABAMENTOS
('de080001-de00-4000-8000-de0000000001','de000002-de00-4000-8000-de0000000002','8','','REVESTIMENTOS E ACABAMENTOS','vb',1,0,0,0,'SINAPI','contratual',1,false,now(),now()),
('de080002-de00-4000-8000-de0000000002','de000002-de00-4000-8000-de0000000002','8.1','87529','Chapisco emboço reboco paredes int.','m²',940,28.50,26790.00,26790.00,'SINAPI','contratual',2,false,now(),now()),
('de080003-de00-4000-8000-de0000000003','de000002-de00-4000-8000-de0000000002','8.2','87533','Revestimento cerâmico 30x30 paredes','m²',185,72.40,13394.00,13394.00,'SINAPI','contratual',2,false,now(),now()),
('de080004-de00-4000-8000-de0000000004','de000002-de00-4000-8000-de0000000002','8.3','93358','Contrapiso concreto e=5cm','m²',320,32.80,10496.00,10496.00,'SINAPI','contratual',2,false,now(),now()),
('de080005-de00-4000-8000-de0000000005','de000002-de00-4000-8000-de0000000002','8.4','96527','Piso cerâmico PEI-4 45x45cm','m²',285,68.90,19636.50,19636.50,'SINAPI','contratual',2,false,now(),now()),
-- GRUPO 9: PINTURA
('de090001-de00-4000-8000-de0000000001','de000002-de00-4000-8000-de0000000002','9','','PINTURA','vb',1,0,0,0,'SINAPI','contratual',1,false,now(),now()),
('de090002-de00-4000-8000-de0000000002','de000002-de00-4000-8000-de0000000002','9.1','88496','Massa PVA paredes internas','m²',940,8.40,7896.00,7896.00,'SINAPI','contratual',2,false,now(),now()),
('de090003-de00-4000-8000-de0000000003','de000002-de00-4000-8000-de0000000002','9.2','88497','Tinta látex PVA paredes internas 2 demaos','m²',940,12.80,12032.00,12032.00,'SINAPI','contratual',2,false,now(),now()),
('de090004-de00-4000-8000-de0000000004','de000002-de00-4000-8000-de0000000002','9.3','88498','Tinta acrílica fachada 2 demaos','m²',285,18.50,5272.50,5272.50,'SINAPI','contratual',2,false,now(),now()),
-- GRUPO 10: ESQUADRIAS E VIDROS
('de100001-de00-4000-8000-de0000000001','de000002-de00-4000-8000-de0000000002','10','','ESQUADRIAS E VIDROS','vb',1,0,0,0,'SINAPI','contratual',1,false,now(),now()),
('de100002-de00-4000-8000-de0000000002','de000002-de00-4000-8000-de0000000002','10.1','74096/001','Porta madeira maciça 0,80x2,10m c/ batente','un',12,685.00,8220.00,8220.00,'SINAPI','contratual',2,false,now(),now()),
('de100003-de00-4000-8000-de0000000003','de000002-de00-4000-8000-de0000000002','10.2','74096/002','Janela alumínio correr 1,20x1,20m c/ vidro','un',18,485.00,8730.00,8730.00,'SINAPI','contratual',2,false,now(),now()),
('de100004-de00-4000-8000-de0000000004','de000002-de00-4000-8000-de0000000002','10.3','74097/001','Porta alumínio entrada c/ vidro temperado','un',2,1285.00,2570.00,2570.00,'SINAPI','contratual',2,false,now(),now())
ON CONFLICT (id) DO NOTHING;
