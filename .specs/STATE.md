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

## Handoff

- **Feature**: (nenhuma em andamento — Fase 8 concluída)
- **Phase / Task**: Fase 8 (Fundação) — concluída: requisitos aprovados + ADR-009 + docs detalhadas
- **Completed** (adicionado em 2026-09-08): revisão do `docs/REQUIREMENTS.md` aprovada (RF-016 removido; RF-032, RNF-001, RNF-012, RC-003, R-001 → ✅); ADR-009 (PIX apenas no lançamento, RN-001.1); `coverage-matrix.md` com inventário F9 `pending`; docs detalhadas escritas e commitadas: `PROJECT_OVERVIEW.md` (fc1946a), `ARCHITECTURE.md` (c94c34e), `DATABASE.md` (22f0cc8), `SECURITY.md` (b204061), `LGPD.md` (6fbb549), `API.md` (2fcb703), `TESTING.md` (7cd7a14), `OBSERVABILITY.md` (4b7d294), `DEPLOYMENT.md` (2651823), `COSTS.md` (a981284); índice e ROADMAP atualizados (1fc2188) — gates lint/typecheck/build verdes
- **In-progress**: nenhum
- **Next step**: Fase 9 (MVP) — especificar features do portal público (Sobre/Liderança/Localização/Cultos/Redes), Eventos→WhatsApp, Doação QR PIX, painel do membro (login+ID, avisos, QR dízimo, cartão, perfil/foto) e painel admin (RBAC, membros, eventos, financeiro PIX, configurações, auditoria) com escopo priorizado; registrar AD Rs pendentes (WhatsApp D4, MVV final) quando o administrador fornecer os dados
- **Blockers**: número de WhatsApp (D4) em aberto; CNPJ/credenciais Mercado Pago pendentes (bloqueiam apenas o financeiro da F9 — MVP é PIX, AD-009); MVV final a confirmar; sub-agentes só ativos após RESTART do opencode
- **Uncommitted files**: none (working tree limpo)
- **Branch**: main