# Plano: SiDIF como produto SaaS vendável

## Objetivo
Transformar o SiDIF (hoje usado por um único órgão) em um produto SaaS multi-cliente, vendável para prefeituras e órgãos públicos, com: multi-tenancy robusto, cadastro self-service, pagamento e planos, e página comercial.

## Decisões já tomadas
- **Clientes-alvo:** prefeituras e órgãos públicos (transparência pública continua sendo requisito).
- **Modelo:** recomendação técnica abaixo.
- **Escopo:** plano detalhado aprovado antes de codar; execução em lotes, como na auditoria.

## Recomendação de modelo: Multi-tenant por órgão (não instância dedicada)

**Recomendo multi-tenant em um único sistema/banco**, com isolamento por `organizacao` (tenant). Motivos:
- Uma base de código e um banco para manter — atualizações chegam a todos os clientes de uma vez.
- Custo de infraestrutura compartilhado; instância dedicada multiplicaria custo e trabalho de operação a cada cliente.
- O SiDIF já tem RLS maduro (431 policies) — o caminho natural é estender esse isolamento por organização, não reescrever.
- Instância dedicada só faria sentido se um órgão exigisse contratualmente banco próprio (pode virar plano "Enterprise" no futuro).

**Impacto na memória do projeto:** a regra atual "Multi-tenancy usa RLS com coluna `is_demo`; não usar `tenant_id`" precisará evoluir — `is_demo` isola demonstração, mas não isola clientes pagantes entre si. A arquitetura nova terá `organizacao_id` nas tabelas de dados.

## Fases (executadas em lotes, nesta ordem)

### Fase 0 — Fundações de produto (decisões com você)
- Definir planos comerciais (ex.: por número de obras ativas, por módulos, ou preço fixo por órgão).
- Definir nome/domínio comercial (sidif.com.br já existe — decidir se vira a página de vendas).
- Definir quem é o "dono" comercial (CNPJ, contrato de uso, termo de serviço, LGPD).

### Fase 1 — Multi-tenancy (a maior e mais crítica)
1. Criar tabela `organizacoes` (órgão cliente: nome, CNPJ, plano, status da assinatura).
2. Adicionar `organizacao_id` às tabelas de dados (obras, medições, RDO, manutenção, etc.) — migração em etapas, começando pelas tabelas-raiz (`obras`, `nuclei`, `maintenance_tickets`) e propagando.
3. Migrar o órgão atual como "organização 1" (dados existentes recebem esse ID — nada se perde).
4. Reescrever as políticas RLS para isolar por organização (além das regras de papel já existentes).
5. Vincular `profiles`/`user_roles` à organização; usuário só enxerga a própria organização.
6. Painel "super-admin" seu: listar organizações, suspender/reativar, ver uso.
7. Portal público de transparência passa a ser por organização (cada prefeitura tem sua página pública).

**Risco:** é a fase mais longa e delicada — ~106 tabelas e 431 policies. Faremos em lotes por módulo, validando cada um com o órgão atual antes de seguir.

### Fase 2 — Cadastro self-service
1. Página de cadastro: interessado cria a organização + primeiro usuário administrador.
2. Período de teste (trial) com dados de demonstração (aproveitando a infraestrutura `is_demo`).
3. Fluxo de convite: o admin da organização convida seus fiscais/usuários.
4. Onboarding guiado: cadastrar primeira obra, importar planilha, configurar RDO.

### Fase 3 — Pagamento e planos
**Restrição técnica importante:** a cobrança integrada da Lovable (Stripe/Paddle gerenciados) exige Lovable Cloud, e este projeto usa Supabase externo. Opções:
- **(a) Stripe com conta própria** (recomendado): você cria uma conta Stripe, eu integro checkout + webhooks via edge functions. Funciona com o Supabase externo atual.
- **(b) Cobrança manual no início** (mais simples): planos e limites controlados pelo sistema, cobrança por boleto/PIX fora do app — comum em venda para prefeitura, que paga por processo administrativo/licitação, não cartão.
- **Recomendação:** começar com (b) — prefeituras raramente pagam SaaS com cartão — e adicionar (a) quando houver demanda.

Implementação:
1. Tabela `planos` e `assinaturas` (plano, limites: nº de obras, nº de usuários, módulos).
2. Enforcement de limites no app (ex.: bloquear criar 6ª obra no plano de 5).
3. Telas de "minha assinatura" para o admin da organização.
4. Se (a): checkout Stripe + webhook atualizando assinatura.

### Fase 4 — Página comercial
1. Landing page pública (fora da área logada): proposta de valor, módulos, capturas de tela, planos/preços, formulário de contato/cadastro.
2. Aproveita o portal de transparência como vitrine ao vivo do produto.
3. SEO básico (título, descrição, og tags) — domínio sidif.com.br.

### Fase 5 — Operação
1. E-mails transacionais por organização (já existe Resend; revisar remetentes).
2. Métricas de uso por organização (para cobrança e saúde do produto).
3. Runbook de suporte: como criar/suspender organização, redefinir acessos.

## O que NÃO muda
- Regras de negócio atuais (cálculo financeiro em centavos, RDO sequencial, permissões de fiscal, etc.).
- Portal público de transparência — vira recurso por organização.
- Banco de produção atual — o órgão atual vira a primeira organização, sem migração de dados destrutiva.

## Ordem sugerida de execução
Fase 0 (decisões) → Fase 1 em lotes por módulo → Fase 2 → Fase 3(b) → Fase 4 → Fase 3(a) quando houver demanda.

## Primeiro passo após aprovação
Eu detalho a Fase 1 (modelo de dados da organização + estratégia de migração das policies) em um plano técnico próprio, e começamos pelo Lote 1 da Fase 1.
