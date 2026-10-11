# Auditoria da tela `/auth` e proposta de neutralização SaaS

## Resultado da análise somente leitura

A tela real em `/auth` é funcional, mas sua apresentação ainda é fortemente vinculada à Defensoria Pública de Mato Grosso. A captura renderizada confirma essas referências tanto no painel visual quanto no formulário. Nenhuma alteração foi feita.

## Arquivos e componentes envolvidos

- `src/App.tsx:119`: registra a rota `/auth` e renderiza `AuthPage` quando não há usuário autenticado.
- `src/pages/AuthPage.tsx`: concentra toda a composição visual, o formulário de login e a seleção das etapas de recuperação.
- `src/contexts/AuthContext.tsx`: sessão, login e tratamento do modo de recuperação do Supabase.
- `src/components/ForgotPasswordForm.tsx`: solicitação do código de recuperação.
- `src/components/VerifyCodeForm.tsx`: validação do código.
- `src/components/ResetPasswordForm.tsx`: definição da nova senha.
- `src/lib/validations.ts`: validação e higienização dos dados do login.
- `supabase/functions/request-password-reset/index.ts`: conteúdo e envio do e-mail de recuperação; também contém referências explícitas à DPE-MT.
- `supabase/functions/verify-reset-code/index.ts` e `supabase/functions/reset-password/index.ts`: validação do código e troca da senha.

## Assets e elementos visuais

- `src/assets/sidif-logo-oficial.png`: logo SiDIF exibido no painel esquerdo e no cabeçalho móvel. É neutro e pode permanecer.
- `src/assets/e01.png.asset.json`: aponta para `e01.png`, descrita no código como foto principal de fachada.
- `src/assets/bb2.png.asset.json`: aponta para `bb2.png`, descrita como entrada/marquise.
- `src/assets/econucleo3.jpg.asset.json`: aponta para `econucleo3.jpg`, usada na composição inferior.
- As três fotos são exclusivas desta tela no código atual e aparecem em camadas monocromáticas. Não carregaram como imagem na captura local auditada; a interface mostrou apenas o fundo verde e a planta técnica. Mesmo sem texto institucional embutido confirmado, os nomes e comentários indicam imagens de instalações específicas e convém substituí-las numa versão SaaS.
- `AuthPage.tsx:343-446`: planta arquitetônica criada diretamente em SVG, com “SALA 01”, “SALA 02”, “CORREDOR”, cotas e bússola. É visualmente neutra, exceto pelo watermark `DPMT` nas linhas 429-438.
- A paleta verde, a composição editorial e a ideia de desenho técnico não dependem da Defensoria e podem ser preservadas como linguagem do SiDIF.

## Referências específicas à DPE-MT na tela

| Local | Conteúdo específico |
|---|---|
| `AuthPage.tsx:227` | Placeholder `usuario@defensoria.mt.gov.br` |
| `AuthPage.tsx:429-438` | Watermark grande `DPMT` dentro do SVG |
| `AuthPage.tsx:463-468` | `Defensoria Pública de Mato Grosso` |
| `AuthPage.tsx:470-475` | `Diretoria de Infraestrutura Física` |
| `AuthPage.tsx:488-491` | `Gestão técnica de ativos, manutenções e projetos da Defensoria Pública do Estado de Mato Grosso.` |
| `AuthPage.tsx:499-501` | `MT-DIF / DPMT-0042` |
| `AuthPage.tsx:510-516` | `Defensoria Pública de Mato Grosso` na versão móvel |
| `AuthPage.tsx:518-523` | `DPMT / Sistema Corporativo` |
| `AuthPage.tsx:551-560` | `Diretoria de TI` e link `ti@defensoria.mt.gov.br` |
| `AuthPage.tsx:566-570` | `SiDIF © 2025 — DPMT` |

Também há conteúdo específico fora da tela, no e-mail de recuperação:

- `Defensoria Pública do Estado de Mato Grosso — DPE-MT`.
- Remetente/nome `SiDIF - DPE-MT`.
- Assinatura textual `SiDIF - Defensoria Pública do Estado de Mato Grosso (DPE-MT)`.

Há ainda uma inconsistência de siglas: a tela usa `DPMT`, enquanto o e-mail de recuperação usa `DPE-MT`.

## Elementos que já são neutros

- Logo e nome `SiDIF`.
- `Sistema de Gestão de Infraestrutura`.
- Headline `Infraestrutura pública gerida com mais controle.`
- `Acesso ao sistema`, `Entre com suas credenciais`, campos e botão de entrada.
- Link `Conhecer planos e solicitar proposta`.
- `Acesso Institucional`.
- Planta arquitetônica, cotas, salas e bússola, desde que removido o watermark `DPMT`.
- Todo o comportamento de login, limite de tentativas, sessão e recuperação de senha.

## O que pode ser neutralizado sem afetar a autenticação

Pode-se trocar ou remover com segurança toda a camada de apresentação listada abaixo, sem alterar chamadas ao Supabase, validações, sessão ou recuperação:

1. Textos da Defensoria, DPMT, MT-DIF e diretorias.
2. Placeholder do e-mail institucional.
3. Endereço de suporte da Diretoria de TI.
4. Watermark `DPMT` e código `MT-DIF / DPMT-0042`.
5. Rodapé `SiDIF © 2025 — DPMT`.
6. As três fotos institucionais por uma imagem neutra de infraestrutura pública.
7. Textos institucionais do template de e-mail de recuperação, mantendo intactos código, validade e link.

A neutralização deve preservar sem mudanças funcionais: `handleLogin`, `signIn`, rate limiter, `resetFlow`, leitura dos tokens, `setSession`, `updateUser` e os três componentes de recuperação.

## Versão SaaS neutra sugerida

### Painel visual

- Manter o logo SiDIF e `Sistema de Gestão de Infraestrutura Pública`.
- Manter a headline `Infraestrutura pública gerida com mais controle.`
- Substituir o texto da Defensoria por: `Gestão integrada de obras, medições, manutenção e ativos para instituições públicas.`
- Substituir `Diretoria de Infraestrutura Física` por `Gestão de infraestrutura pública` ou destacar `Medição de obras` para reforçar o produto prioritário.
- Remover o watermark institucional ou trocá-lo por `SiDIF` em baixa opacidade.
- Usar uma foto neutra de obra ou edifício público sem identificação de cliente, preservando a planta técnica como sobreposição.
- Trocar a faixa inferior por `Plataforma SiDIF · Ambiente seguro · Acesso institucional`.

### Área de acesso

- Remover `DPMT / Sistema Corporativo`; usar `SiDIF / Plataforma institucional`.
- Manter `E-mail institucional`, mas usar placeholder neutro como `nome@instituicao.gov.br`.
- Trocar o suporte por `Problemas de acesso? Fale com o administrador da sua instituição.` e, se necessário, incluir um canal geral do SiDIF que ainda precisa ser definido.
- Rodapé sugerido: `SiDIF © 2026`.
- Preservar o link para planos e proposta.

### Recuperação de senha

- Neutralizar remetente, cabeçalho e assinatura para `SiDIF` e `Plataforma de gestão de infraestrutura pública`.
- Não alterar código de verificação, prazo, validação, funções ou segurança do fluxo.

## Resultado esperado de uma futura implementação

A mesma rota `/auth` continuaria atendendo todos os órgãos, sem aparência exclusiva da DPE-MT. A organização do usuário seria reconhecida apenas depois do login, enquanto a tela pública manteria somente a marca SiDIF e a proposta de gestão de infraestrutura pública.
