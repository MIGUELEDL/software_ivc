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

## Handoff

- **Feature**: (nenhuma em andamento — iniciando Fase 9 / MVP)
- **Phase / Task**: Fase 9 (MVP) — especificação da primeira leva de features
- **Completed** (em 2026-09-08): push `origin/main` atualizado (f53ecb2..e73c09a); feature `sobre-dados-institucionais` revalidada PASS (11/11 ACs, ADR-010/011) com consumidores na UI (Sobre/Cultos); docs da Fase 8 completas; requisitos aprovados
- **In-progress**: Fase 9 — decomposição do MVP em features prioritizadas (proposta em andamento)
- **Next step**: aprovar a ordem das frentes do MVP; especificar a 1ª feature (spec.md em EARS) → validate_spec → design/tasks → execute → verifier
- **Blockers**: **credenciais Mercado Pago em aberto** (não fornecem pela liderança) — **não bloqueia o início da F9**: doação QR PIX é estática (RN-001), financeiro usa `paymentGateway` Port com Adapter MP a plugar depois (AD-009); sem outros blockers de código
- **Uncommitted files**: none (working tree limpo)
- **Branch**: main