# Ajustes Lote 3 — Design

## 1. Impressão multi-cartão (CART-01..05)

- **Seleção** (`/admin/membros`): coluna de checkbox client-side (novo
  `MembroSelecaoCheckbox` + estado no client wrapper da toolbar). Máx. 4:
  5ª marcação bloqueada com aviso inline. Botão "Imprimir cartões (N)" →
  `router.push(/admin/membros/imprimir?ids=a,b,c)`.
- **Página** `/admin/membros/imprimir`: server component; `getMembro` por id
  (≤4, ids inválidos → aviso; >4 → corta em 4). Renderiza pares
  `MemberCard` + `MemberCardBack` empilhados verticalmente.
- **Print CSS**: A4 portrait; `#cartao-print` vira coluna (`flex-direction:
  column`), gap ~8mm entre pares; cada par = row frente+verso (171,2mm).
  4 pares ≈ 216mm + gaps < 297mm → cabe.
- **Escala +2px/lado**: faces impressas de 85,6×53,98mm → ~86,7×55,0mm
  (≈ +2px cada lado a 96dpi, proporção mantida). No preview de tela, o
  container do card cresce ~4px (max-w).

## 2. Eventos parity (EVT-01..02)

- Migration `0027_event_status_parity.sql`: converter ATIVO→EM ABERTO,
  INATIVO→CONCLUIDO; drop `events_status_check` antigo; recriar com
  `('EM ABERTO','CONCLUIDO')`. Aplicar em dev e prod (prod: 0 linhas hoje).

## 3. Aniversário (ANI-01..06)

- **RPC** `aniversariantes_do_dia()` SECURITY DEFINER: nomes de membros
  ATIVO com `EXTRACT(MONTH/DAY FROM nascimento)` = hoje em
  `America/Fortaleza`. Retorna `text[]`. `GRANT EXECUTE` a `anon`.
- **Componente** `BirthdayBanner` (client): recebe `aniversariantes` como
  prop; busca via RPC anon feita no RSC da home (`page.tsx`, com try/catch
  → lista vazia degrada para banner ausente); `useState` de dismiss (X).
  Se vazio/erro → renderiza nada.
- **Visual**: card flutuante sob o navbar, gradiente `hero-background-lite`,
  borda dourada `accent`, ícone `Cake` (lucide), título "🎉 Hoje tem
  aniversário!" + nomes em destaque + mensagem de carinho
  ("Que Deus abençoe você, Fulano, com muita saúde e alegria!").
  Responsivo 360px+; animação sutil de entrada.

## 4. Senhas (SEN-01..06)

- **Fluxo e-mail** (Supabase nativo, sem Resend):
  - `/alterar-senha`: página com botão "Enviar link de confirmação" →
    `supabase.auth.resetPasswordForEmail(email, { redirectTo:
    ${origin}/atualizar-senha })` + estado "confira seu e-mail".
    Entradas: botão no navbar do painel membro e no admin (link).
  - `/atualizar-senha`: form nova senha + confirmação (client); detecta
    session de recovery (`PASSWORD_RECOVERY`/detectSessionInUrl); sucesso →
    updateUser({password}) + limpa `force_password_change` + redirect
    login; sem session válida → erro + ação pedir novo link.
  - **Deploy manual**: adicionar URLs de redirect do Auth no dashboard
    Supabase (`[REDACTED_DOMAIN]/**`, `software-ivc.vercel.app/**`).
- **Redefinir senha membro** (ADMIN/SUPER_ADMIN):
  - `POST /api/admin/membros/[id]/redefinir-senha` com
    `requireAdministrar("membros")`; gera senha temporária (padrão
    `gerarSenhaId`); `updateUserById(password + force_password_change:
    true)`; retorna `{ senha }` UMA vez; auditoria `redefinir_senha`.
  - UI: botão "Redefinir senha" no detalhe (guardado por
    `can(role,'membros','administrar')`) → modal exibe senha + copiar +
    aviso "entregue ao membro; será obrigado a trocar".
- **Ver senha** (SEN-06): componente `PasswordInput` (client) com olho
  (Eye/EyeOff), `aria-label`, sem alterar `name`/value. Aplicado em:
  login admin, login membro, trocar-senha, atualizar-senha.
