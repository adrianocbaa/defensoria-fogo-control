# Roadmap

- [x] Centralizar no banco a numeração sequencial diária de RDO por obra
- [x] Bloquear saltos, duplicidades e sobrescritas de número
- [x] Preservar sequência em fins de semana e dias sem expediente
- [x] Adequar todos os fluxos de criação do RDO
- [x] Validar banco, tipos e fluxo na interface
- [x] Alinhar os totais da Planilha PDF e do Relatório de Medição aos cartões da tela
- [x] Homologar o Lote 1 (public.profiles) no ambiente isolado — suíte 22/22
- [x] Aplicar e validar o Lote 1 em produção
- [x] Aplicar e validar o Lote 2 em produção
- [x] Concluir o Lote 3 — jobs v2 criados (7 e 8) e funções publicadas; falta confirmar e-mails de RDO após 08:00 UTC e trocar a senha exposta
- [x] Lote 4 — revogar acesso anônimo às 94 tabelas (aplicado); views só leitura (aplicado)
- [ ] Lote 4c — reparo do portal público: usuário aplica lote4c_portal_publico.sql, roda lote4c_verificacao.sql e testa as páginas em janela anônima
- [ ] Republicar o SiDIF após o Lote 4c (o site publicado usa páginas públicas antigas que não funcionam para visitantes)
- [ ] Decidir se as páginas públicas de Medição e RDO devem mostrar dados a visitantes (hoje: fechadas)
- [ ] Regenerar a service_role (sb_secret) do sidif-homologacao (higiene pós-testes)
- [x] Restaurar no topo do resumo público os indicadores de andamento físico, valor pago e tempo restante
- [ ] Alinhar os indicadores do resumo público aos registros atuais de RDO e medição das obras exibidas no mapa
