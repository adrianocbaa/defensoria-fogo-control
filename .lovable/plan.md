## Objetivo

Implementar a experiência de "Ver detalhes do núcleo" no módulo Preventivos com fidelidade às referências INC 02 (drawer lateral de resumo) e INC 03 (página completa de detalhes), preservando dados, rotas e permissões existentes.

## Dados disponíveis (Supabase) — não precisa criar nada

- `nucleos_central` → `nome`, `cidade`, `endereco`, `telefones`, `email`.
- `nuclei` (mesmo id) → `fire_department_license_valid_until`, `fire_department_license_document_url`.
- `fire_extinguishers` (por `nucleus_id`) → `type`, `capacity`, `location`, `expiration_date`, `hydrostatic_test`, `status`.
- `documents` (por `nucleus_id`) → `name`, `type`, `url`, `uploaded_at`, `size`, `mime_type`.
- `hydrants` (por `nucleus_id`).
- Status (verde/âmbar/vermelho/cinza) já calculado em `MapViewPreventivos` a partir de extintores + alvará; será reaproveitado via `statusMap` já exposto pela página.

## Campos que NÃO existem no banco (informar, não migrar)

- **Última inspeção** do núcleo: não há coluna dedicada. Fallback: usar o maior `hydrostatic_test`/`last_inspection` dos extintores; se ausente, exibir "Não informada".
- **Próxima ação recomendada**: será derivada, não persistida:
  - alvará vencido → "Alvará vencido — regularizar";
  - alvará vencendo (≤60 dias) → "Alvará vence em N dias — agendar renovação";
  - extintor vencido → "Substituir extintor(es) vencido(s)";
  - sem extintor / sem alvará cadastrado → "Cadastrar dados de prevenção";
  - tudo ok → "Certificado válido";
  - sem dados suficientes → "Próxima ação não informada".

Nenhuma migração será feita.

## Alterações

### 1. Seleção e drawer lateral (INC 02)

- `**src/pages/Preventivos.tsx**`: abre um drawer sempre que `selectedId` mudar (via mapa OU lista). Fecha ao clicar no X, no backdrop ou Esc.
- `**src/components/MapViewPreventivos.tsx**`: nenhuma mudança de lógica; já emite `onSelectNucleus`. Garantir centralização via `flyTo` já existente.
- `**src/components/preventivos/NucleiList.tsx**`: clique único agora seleciona + abre drawer (hoje precisa duplo clique para detalhes). Mantém destaque do item ativo.

### 2. Novo componente — `NucleusDetailsDrawer`

Arquivo novo: `src/components/preventivos/NucleusDetailsDrawer.tsx`.

- Sheet lateral direita (usar `@/components/ui/sheet` com `side="right"`), largura `sm:max-w-[440px]`, altura total, backdrop, `Esc` e X para fechar.
- Busca próprios dados (mesmas queries do `PreventivosDetails`) por `nucleoId`, com estados de loading/erro/vazio.
- Conteúdo: `StatusBadge`, nome, "Cidade - UF" (UF virá da `cidade` quando existir; se não, só cidade), Validade do certificado, Última inspeção (fallback ou "Não informada"), Próxima ação (derivada, cor conforme status).
- Botões: **Ver detalhes** → `navigate('/preventivos/'+id)`; **Atualizar situação** → `navigate('/preventivos/'+id+'/editar')` (fluxo já existente). Ocultar "Atualizar situação" para quem não tem `canEdit`.

### 3. Página de detalhes (INC 03) — reescrever `PreventivosDetails.tsx`

- Envolver em `PreventivosLayout` (mesma sidebar verde do módulo) em vez do `SimpleHeader` genérico.
- Usar `PreventivosPageHeader` com breadcrumb "Dashboard / Preventivos / [Nome]" e ação **Voltar**.
- Header do conteúdo: nome grande + `StatusBadge`, subtítulo "Cidade - Endereço", botões **Editar** (contorno verde) e **Excluir** (contorno vermelho, oculto para não-editores).
- Layout desktop `grid lg:grid-cols-2 gap-6`:
  - Coluna esquerda: `ContactCard` (novo) + `FireLicenseCard` (novo).
  - Coluna direita: `FireExtinguisherList` (novo) com badge de contagem e itens compactos separados por divisor (ícones de relógio/escudo, cores por vencimento).
- Abaixo, largura total: `DocumentsSection` (novo) com badge de quantidade, ícone tipado, "Visualizar" (nova aba) e "Download" (via signed URL para bucket privado / URL pública caso já pública).
- Estados: loading skeleton, "Núcleo não encontrado", empty states para extintores/documentos com botão "Adicionar" apenas para `canEdit`.

### 4. Excluir com confirmação

- Novo `DeleteNucleusDialog.tsx` usando `AlertDialog` (sem `window.confirm`), citando o nome, avisando sobre dados vinculados (extintores/documentos), botão destrutivo, tratamento de erro com toast.
- Chamado tanto na página de detalhes quanto (opcionalmente) via ação do drawer somente para admin — por padrão manter só na página de detalhes para não desviar do escopo.

### 5. Componentes reutilizáveis novos

Todos em `src/components/preventivos/`:

- `NucleusDetailsDrawer.tsx`
- `NucleusHeader.tsx` (título + status + endereço + ações)
- `ContactCard.tsx`
- `FireLicenseCard.tsx`
- `FireExtinguisherList.tsx` + `FireExtinguisherItem.tsx`
- `DocumentsSection.tsx` + `DocumentItem.tsx`
- `DeleteNucleusDialog.tsx`
- `EmptyState.tsx`
- Utilitário `nucleusStatus.ts` centralizando cálculo de status + próxima ação (compartilhado com o mapa se possível; caso contrário duplicar de forma mínima para não mexer no mapa).

### 6. Arquivos NÃO alterados

Autenticação, Supabase (nenhuma migração), permissões (reutiliza `useUserRole`), rotas (`/preventivos/:id` e `/preventivos/:id/editar` já existem), páginas de outros módulos, `PreventivosEdit`, módulos públicos (`PublicPreventivos*`).

## Arquivos envolvidos

Editar:

- `src/pages/Preventivos.tsx` (abrir drawer ao selecionar)
- `src/pages/PreventivosDetails.tsx` (reescrever visualmente)
- `src/components/preventivos/NucleiList.tsx` (clique único abre drawer)

Criar (em `src/components/preventivos/`):

- `NucleusDetailsDrawer.tsx`, `NucleusHeader.tsx`, `ContactCard.tsx`, `FireLicenseCard.tsx`, `FireExtinguisherList.tsx`, `FireExtinguisherItem.tsx`, `DocumentsSection.tsx`, `DocumentItem.tsx`, `DeleteNucleusDialog.tsx`, `EmptyState.tsx`, `nucleusStatus.ts`.

## Validação após implementação

Selecionar via mapa e via lista → drawer abre; fechar por X e Esc; navegar para detalhes; validar breadcrumb, contato, alvará, extintores, documentos (Visualizar/Download); testar Editar; testar Excluir (dialog, cancelar/confirmar); verificar permissões (`canEdit`); testar desktop/tablet/mobile; verificar console sem erros; confirmar que nenhum dado fictício foi introduzido.  
  
Plano aprovado. Implemente o painel lateral e a página de detalhes conforme as referências e regras descritas, preservando integralmente os dados, permissões e rotas existentes.

&nbsp;