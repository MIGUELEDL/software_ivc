# STATE

## Decisions

### AD-001
- **Decision**: Produto = plataforma web institucional (portal público multirrota + portal de membro + painel administrativo com RBAC) para 1 templo da Igreja Virtude Cristã (Santa Luzia - PB).
- **Reason**: Projeto real com volumes baixos (30-50 membros, ~30 lançamentos/mês, ~20 doações/mês); escopo único templo governa a simplicidade da solução.
- **Trade-off**: Abrimos mão de multitenancy e de módulos corporativos complexos (contabilidade, CAC) em favor de clareza e custo mínimo.
- **Scope**: Todos os módulos futuros (portal, membros, eventos, financeiro, conteúdo, administrativo).
- **Date**: 2026-09-06
- **Status**: active

### AD-002
- **Decision**: Arquitetura = monólito modular com Next.js 16 (App Router + Route Handlers), camadas por domínio (app / features) e Ports & Adapters para serviços externos (Supabase, Resend, pagamentos).
- **Reason**: 1 templo → 1 deploy simples; modularização preserva fronteiras de domínio e testabilidade sem custo de microserviços.
- **Trade-off**: Escala vertical limitada; deploy único = mudanças afetam todo o app.
- **Scope**: Camadas de aplicação, estrutura de pastas, integração externa.
- **Date**: 2026-09-06
- **Status**: active

### AD-003
- **Decision**: Banco de dados = PostgreSQL via Supabase (Auth + Storage incluídos), modelado com Drizzle ORM.
- **Reason**: PostgreSQL p/ integridade financeira; Supabase começa em plano free; Drizzle tem tipagem first-class e migrações SQL.
- **Trade-off**: Dependência de um provedor gerenciado (lock-in moderado); RLS do Supabase adiciona camada de segurança a dominar.
- **Scope**: Persistência, migrações, RLS, storage de arquivos (foto membro, documentos).
- **Date**: 2026-09-06
- **Status**: active

### AD-004
- **Decision**: Autenticação = Auth.js (NextAuth) com sessões separadas para membro e para administrador, primeiro acesso por senha-ID (hash) com troca obrigatória.
- **Reason**: Controle fino de sessão por perfil no mesmo app; fluxo de primeiro acesso exigido pela liderança p/ ~50 membros.
- **Trade-off**: Mais código próprio de verificação de identidade vs. serviço externo pronto (Clerk etc.).
- **Scope**: Login de membro e de admin, RBAC (MEMBRO, SECRETARIA, LIDER, FINANCEIRO, PATRIMONIAL, ADMIN, SUPER_ADMIN).
- **Date**: 2026-09-06
- **Status**: superseded by AD-013

### AD-013
- **Decision**: Autenticação = **Supabase Auth nativo (GoTrue) via `@supabase/ssr`** com sessão server-side e cookies httpOnly; papel do usuário em `app_metadata.role` (não-editável, lido server-side via `getClaims()`); logins separados `/login` (membro) e `/login/admin`; primeiro acesso por senha-ID temporária com troca obrigatória (flag `app_metadata.force_password_change`); 1º admin via script seed local `seed:admin` (service-role); destino pós-login = landings mínimos `/painel` e `/admin`; entrega de senha-ID manual pela liderança. **Supersede AD-004.**
- **Reason**: Decisão do usuário em 2026-09-10 após análise (MCP Supabase ativo; projeto `[REDACTED_PROJECT_NAME]` criado). GoTrue entrega pronto hash/sessão/refresh/rate limit (cobre RNF-004 parcial) e evitar código próprio de Auth.js; papel em `app_metadata` não é editável pelo usuário → RBAC de decisão exclusiva no servidor (SECURITY.md).
- **Trade-off**: Dependência do Supabase Auth em vez de Auth.js (lock-in moderado com AD-003); flag `force_password_change` em app_metadata substitui mecanismo nativo inexistente de expiração de senha (RN-002); resets/envio de e-mail fora do MVP (senha-ID entregue manualmente, D2).
- **Scope**: Login membro/admin, RBAC de rotas (MEMBRO, SECRETARIA, LIDER, FINANCEIRO, PATRIMONIAL, ADMIN, SUPER_ADMIN), primeiro acesso/troca obrigatória da senha-ID. Painéis reais e gestão de papéis (RF-028/RF-032) ficam para features futuras.
- **Date**: 2026-09-10
- **Status**: active

### AD-005
- **Decision**: Adoção do kit Spec-Driven TLC Spec-Driven v3.3.0 como processo padrão de features (`.opencode/skills/tlc-spec-driven/`), com formato de specs em EARS sob `.specs/features/` e decisões em `.specs/STATE.md`; OpenSpec usado como formato de referência nas docs.
- **Reason**: Projeto dirigido por especificação e auditoria (fonte única de verdade RF→spec→teste→aceite); skill roda em markdown+python3 sem dependência de Node; verifier independente dá qualidade.
- **Trade-off**: Overhead de processo vs. escrever direto; requer disciplina de runbooks (verificador e commits atômicos).
- **Scope**: Processo de desenvolvimento de todas as features; reprovado → nova ADR.
- **Date**: 2026-09-06
- **Status**: active

### AD-006
- **Decision**: Ambiente de desenvolvimento usa Node.js 22 LTS via nvm (`.nvmrc` = 22), com gates de código locais `npm run lint`, `npm run typecheck` (tsc --noEmit) e `npm run build`; runner de testes entra na F10.
- **Reason**: Node não estava no PATH do shell; nvm versiona por projeto; script `typecheck` foi adicionado (não existia no package.json).
- **Trade-off**: Dependência do desenvolvedor ativar nvm por sessão (documentado no AGENTS.md).
- **Scope**: Tooling local e CI.
- **Date**: 2026-09-06
- **Status**: active

### AD-007
- **Decision**: CI/CD = GitHub Actions com gate duplo (job `tests`: lint→typecheck→build em node 22; job `specs`: validação estrutural python3 dos `.specs/features/*`) + deploy em Vercel (plano Hobby); commits atômicos em Conventional Commits via `check_commit.py`.
- **Reason**: Custo zero (liberado no plano gratuito do GitHub), dupla verificação máquina+verifier, deploy contínuo no Hobby.
- **Trade-off**: Limites do plano Hobby (10 deployments/dia máx.) — aceitável para escala do projeto.
- **Scope**: Repositório git, pipeline de PR, deploy.
- **Date**: 2026-09-06
- **Status**: active

### AD-008
- **Decision**: Dados institucionais reais (endereço, cidade, pastor presidente, e-mail, redes sociais, horários de culto) vivem em `src/lib/constants.ts` como fonte única, consumidos pelos componentes.
- **Reason**: A landing page atual usa placeholders ("Sua Cidade", "Em breve", e-mail genérico); dados confirmados nas descobertas F0-F2 precisam de fonte única antes do MVP.
- **Trade-off**: Dados estáticos no bundle (não editáveis sem deploy) — aceitável para portal institucional da F9.
- **Scope**: Portal público; painel admin pode posteriormente editar (nova ADR se decidir persistir em DB).
- **Date**: 2026-09-06
- **Status**: active

### AD-009
- **Decision**: Financeiro do MVP (Fase 9) utiliza **apenas PIX** — QR PIX público no portal + webhook Mercado Pago para recebimentos; conciliação e fechamento de caixa obrigatórios. Cartão de crédito entra em iteração futura. (**RN-001.1**) A árvore oficial prevê PIX+cartão, mas a doação pública foi priorizada como PIX/QR e o cartão exige CNPJ + checkout Mercado Pago ainda indisponíveis.
- **Reason**: Desbloqueia a Fase 9 imediatamente sem depender de CNPJ/checkout de cartão; reduz complexidade inicial; alinha com a prioridade da doação pública por PIX/QR.
- **Trade-off**: Menos opções de pagamento no lançamento vs. lançamento mais rápido e simples; cartão fica para uma nova iteração (nova ADR quando o CNPJ estiver pronto).
- **Scope**: Módulo financeiro; cardápio de meios de pagamento do MVP.
- **Date**: 2026-09-08
- **Status**: active

### AD-010
- **Decision**: Número oficial de WhatsApp da igreja (decisão D4 resolvida): **(83) 99945-0781**. `SOCIAL.whatsapp` em `src/lib/constants.ts` passa de placeholder `"#"` para `"https://wa.me/5583999450781"`.
- **Reason**: Liderança informou o número em 2026-09-08; destrava o requisito RN-003 ("inscrever-se" em evento → WhatsApp) e remove o placeholder sem fabricar dado.
- **Trade-off**: Número único oficial; eventuais mudanças exigem atualização da constante (fonte única, AD-008).
- **Scope**: Portal público (links sociais), painel administ (configuração de WhatsApp RF-029 posterior).
- **Date**: 2026-09-08
- **Status**: active

### AD-011
- **Decision**: Dados oficiais de constituição registrados em `src/lib/constants.ts`: **fundação em 07/09/2025** (primeiro culto) e **CNPJ 68.683.917/0001-71** (criado em 03/08/2026).
- **Reason**: Informados pela liderança em 2026-09-08 (substitui `"Em breve"` e o placeholder anterior); o CNPJ é pré-requisito do Mercado Pago (RC-002) para o financeiro da Fase 9 — MVP segue PIX apenas (AD-009).
- **Trade-off**: Data de fundação adotada = primeiro culto (07/09/2025), não a data de registro do CNPJ (03/08/2026), conforme esclarecido pela liderança.
- **Scope**: Portal público (seção Sobre/História), docs institucionais; CNPJ alimenta contratos Mercado Pago.
- **Date**: 2026-09-08
- **Status**: active

### AD-012
- **Decision**: Doação PIX do portal (RF-007) usa **QR PIX estático gerado no app** a partir da chave CNPJ oficial `68.683.917/0001-71` (Confirmed em 2026-09-08): payload BR Code montado em `src/lib/pix.ts` (`buildBrCode`, MAI `BR.GOV.BCB.PIX01<chave>`, MCC 0000, moeda 986, país BR, nome/cidade projetados sem acentos até 25/15, TXID `***`, CRC-16/CCITT-FALSE em `6304`) + renderização com `qrcode.react@4.2.0` (nova dependência). Página `/doacao` mostra o QR e o código copia-e-cola com botão "Copiar" (clipboard + fallback acessível).
- **Reason**: Admin omitiu chave oficial (CNPJ) em 2026-09-08; sem lib de QR instalada; QR estático (sem campo 54/valor fixo) alinha com RN-001 e AD-009 (PIX apenas no MVP); renderização no app permite trocar chave no deploy sem imagem estática.
- **Trade-off**: Nova dependência (`qrcode.react`); QR sem valor fixo (o app bancário define) — escolha explícita do admin; MM 'copia-e-cola' fixo com TXID `***`.
- **Scope**: Portal público `/doacao`; fonte única `PIX.key` aponta `CHURCH.cnpj`.
- **Date**: 2026-09-08
- **Status**: active

> **Correção 2026-09-08 (commit `bb3a62f`)**: Manual de Padrões do PIX/BCB exige CNPJ **sem formatação** no BR Code (somente os 14 dígitos). `PIX.key` passou a derivar de `CHURCH.cnpj` via `replace(/\D/g, "")` (→ `68683917000171`).

### AD-014
- **Decision**: Migrações de banco do projeto são **SQL puro versionado em `supabase/migrations/`** (aplicadas via Supabase CLI/MCP no dev e em produção), iniciando com a feature painel-membro (`members`, `event_notices`). **Drizzle ORM permanece como evolução futura** (AD-003 mantida em status active, mas a materialização inicial não depende dela).
- **Reason**: Decisão do usuário em 2026-09-11 (painel-membro, discussão opção A): sem tooling novo no MVP; trilha de migração versionada no repo desde o início; não bloqueia a AD-003 (Drizzle pode ser adotado ao migrar schema tipado).
- **Trade-off**: SQL puro = tipos/validadores hand-written em `src/lib/painel/*`; Drizzle adiado evita dependência+config hoje.
- **Scope**: Todas as features que tocarem banco (members, avisos, futuras: financeiro, eventos em DB, etc.).
- **Date**: 2026-09-11
- **Status**: active

## Handoff

- **Feature**: `auth` (autenticação + RBAC) — **IMPLEMENTADA e VERIFICADA** (validation.md PASS, `validate_state.py auth` 0 errors)
- **Phase / Task**: Fase 9 (MVP) — `RF-008/RF-011/RF-031/RN-002/AD-013` — fundação de sessão para os painéis
- **Done até agora**: spec `AUTH-01..19` aprovada; design + tasks aprovados; 22 commits `444949f^..HEAD`;
  - Código: `src/lib/auth/{claims,rbac}.ts`, `src/lib/supabase/server.ts`, `src/app/api/auth/{login,login/admin,logout,trocar-senha}/route.ts`, páginas `/login`, `/login/admin`, `/trocar-senha`, `/painel`, `/admin`, `src/proxy.ts`, `scripts/seed-admin.mjs`.
  - Fixes no loop verifier (it-1 FAIL → it-4 PASS): AUTH-15 spec align (`5f50cac`), AUTH-18 logout área (`6856d00`), probe commitado `scripts/probes-auth.sh` (`e0feecb`) com discriminação AUTH-11 via `?error=auth_required` (`8612778`) + logout e rotas públicas (`78d3832`). **19 probes ok / 0 falhas**, sensor 5 killed + 1 equivalente.
  - `docs/coverage-matrix.md` linha `auth` = ✅ verified.
- **In-progress**: nada em aberto no auth — gate PASS; matrícula na matriz feita.
- **Next step**: persistir estado (este commit) + `git push origin main`. Depois: próxima feature da Fase 9 — painel membro real (RF-012 avisos, RF-013 QR dízimo, RF-014 cartão, RF-015 perfil) ou painel admin (RF-021..030), usando `src/lib/auth/getClaims()` já pronto.
- **Blockers**: **`SUPABASE_SERVICE_ROLE_KEY` pendente** — bloqueia `npm run seed:admin`, probe runtime AUTH-10/AUTH-12 e sessões reais (TCM `none` até F10, AD-006). **Nota**: chave anterior fornecida pelo usuário decodifica ref `[REDACTED_PROJECT_REF]` ≠ projeto `[REDACTED_PROJECT_NAME]` (`[REDACTED_PROJECT_REF]`) — rejeitada como segredo de outro ambiente (`.env.local` mantém comentada). Credenciais Mercado Pago e imagens novas seguem pendentes (não bloqueiam auth).
- **Open decisions**: nenhuma — todas resolvidas/registradas (AD-004 superseded por AD-013; D1..D7 em context.md).
- **Uncommitted files**: `.specs/STATE.md` (este Handoff), `.specs/features/auth/context.md`, `validation.md` (a commitar aqui), `opencode.json` (untracked, não commitado)
- **Branch**: main (commits locais; `git push` pendente)