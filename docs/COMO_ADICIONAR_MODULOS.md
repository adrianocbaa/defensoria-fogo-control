# Como Adicionar Novos Módulos ao Sistema

Este guia explica como adicionar novos módulos ao sistema DPE-MT. Quando você adiciona um módulo seguindo estes passos, ele aparecerá automaticamente no **Painel Administrativo** e no **Dashboard principal**.

## Passos para Adicionar um Novo Módulo

### 1. Adicionar o Setor ao Banco de Dados

Crie uma migration para adicionar o novo valor ao enum `sector_type`:

```sql
-- Exemplo: adicionar módulo "contratos"
ALTER TYPE sector_type ADD VALUE IF NOT EXISTS 'contratos';
```

### 2. Atualizar o Tipo TypeScript

Em `src/hooks/useUserSectors.ts`, adicione o novo setor ao tipo `Sector`:

```typescript
export type Sector = 
  | 'manutencao' 
  | 'obra' 
  | 'preventivos' 
  | 'ar_condicionado' 
  | 'projetos' 
  | 'almoxarifado'
  | 'nucleos'
  | 'nucleos_central'
  | 'contratos';  // <- Adicione aqui
```

### 3. Configurar Label e Ícone

Em `src/hooks/useAvailableSectors.ts`:

#### a) Adicione o label do módulo:

```typescript
const sectorLabels: Record<string, string> = {
  'preventivos': 'Preventivos',
  'manutencao': 'Manutenção',
  // ... outros módulos
  'contratos': 'Contratos',  // <- Adicione aqui
};
```

#### b) Adicione o ícone do módulo:

```typescript
import { FileText } from 'lucide-react';  // Importe o ícone desejado

const sectorIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'preventivos': Shield,
  'manutencao': Wrench,
  // ... outros módulos
  'contratos': FileText,  // <- Adicione aqui
};
```

> 💡 **Dica**: Pesquise ícones disponíveis em [Lucide Icons](https://lucide.dev/icons/)

### 4. Configurar Rota e Cores (Dashboard)

Em `src/pages/MainDashboard.tsx`:

#### a) Adicione a rota do módulo:

```typescript
const sectorPaths: Record<string, string> = {
  'preventivos': '/preventivos',
  'manutencao': '/maintenance',
  // ... outros módulos
  'contratos': '/contratos',  // <- Adicione aqui (ou '#' se ainda não implementado)
};
```

#### b) Adicione as cores do módulo:

```typescript
const sectorColors: Record<string, { text: string; bg: string }> = {
  'preventivos': { text: 'text-blue-600', bg: 'bg-blue-50 hover:bg-blue-100 border-blue-200' },
  'manutencao': { text: 'text-orange-600', bg: 'bg-orange-50 hover:bg-orange-100 border-orange-200' },
  // ... outros módulos
  'contratos': { text: 'text-rose-600', bg: 'bg-rose-50 hover:bg-rose-100 border-rose-200' },  // <- Adicione aqui
};
```

### 5. Adicionar o Setor aos Perfis de Usuário

Para que os usuários tenham acesso ao novo módulo, adicione-o aos perfis via migration ou pelo Painel Administrativo:

```sql
-- Exemplo: adicionar módulo "contratos" aos administradores
UPDATE profiles 
SET sectors = array_append(sectors, 'contratos'::sector_type)
WHERE role = 'admin' 
AND NOT ('contratos'::sector_type = ANY(sectors));
```

## Cores Disponíveis (Sugestões)

```typescript
// Azul
{ text: 'text-blue-600', bg: 'bg-blue-50 hover:bg-blue-100 border-blue-200' }

// Laranja
{ text: 'text-orange-600', bg: 'bg-orange-50 hover:bg-orange-100 border-orange-200' }

// Verde
{ text: 'text-green-600', bg: 'bg-green-50 hover:bg-green-100 border-green-200' }

// Roxo
{ text: 'text-purple-600', bg: 'bg-purple-50 hover:bg-purple-100 border-purple-200' }

// Rosa
{ text: 'text-rose-600', bg: 'bg-rose-50 hover:bg-rose-100 border-rose-200' }

// Amarelo
{ text: 'text-yellow-600', bg: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200' }

// Ciano
{ text: 'text-cyan-600', bg: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200' }

// Âmbar
{ text: 'text-amber-600', bg: 'bg-amber-50 hover:bg-amber-100 border-amber-200' }

// Índigo
{ text: 'text-indigo-600', bg: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200' }
```

## Resultado

Após seguir todos os passos:

✅ O módulo aparecerá no **Painel Administrativo** com switch de ativação por usuário  
✅ O módulo aparecerá no **Dashboard principal** para usuários com permissão  
✅ O ícone e cores serão aplicados automaticamente  
✅ As permissões poderão ser gerenciadas pelo Admin

## Checklist

- [ ] Migration criada para adicionar setor ao enum
- [ ] Tipo `Sector` atualizado em `useUserSectors.ts`
- [ ] Label adicionado em `sectorLabels` (useAvailableSectors.ts)
- [ ] Ícone adicionado em `sectorIcons` (useAvailableSectors.ts)
- [ ] Rota adicionada em `sectorPaths` (MainDashboard.tsx)
- [ ] Cores adicionadas em `sectorColors` (MainDashboard.tsx)
- [ ] Setor adicionado aos perfis de usuário (se necessário)
- [ ] Páginas/rotas do módulo criadas no App.tsx

---

**Dúvidas?** Consulte os módulos existentes como exemplo (ex: `nucleos_central`)
