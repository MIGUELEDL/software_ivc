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

### AD-015
- **Decision**: RBAC fino (RF-032) passa a ser definido pela **tabela `permissions` no banco** (PK `(role, module)`, nível `ler`/`escrever`/`administrar` hierárquicos), fonte única consultada por `can(papel, modulo, nivel)` na aplicação e por `can_access(module, nivel)` (SECURITY DEFINER, papel do JWT via `auth_role()`) nas policies RLS. Fail-closed: papel sem linha ou erro de leitura → nega. O proxy mantém `isAdminRole` como gate grosseiro de roteamento (decisão fina no servidor + RLS). UI de gestão da matriz fica na RF-028; escrita na tabela só `SUPER_ADMIN`.
- **Reason**: Role-lists duplicadas entre TS e SQL se provaram frágeis (mutante M4b da RF-022); decisão do usuário em 2026-09-12 (matriz no banco para editar sem deploy). Matriz-default confirmada: `SUPER_ADMIN`/`ADMIN` administram tudo; `SECRETARIA` escreve membros/eventos (lê demais); `FINANCEIRO` escreve financeiro/relatórios; `PATRIMONIAL` escreve patrimônio; `LIDER` lê; `usuarios`/`configuracoes`/`auditoria` só `ADMIN`/`SUPER_ADMIN`; `MEMBRO` sem acesso admin (dados próprios via policies de 0001, intactas).
- **Trade-off**: Camada de consulta extra (tabela ~48 linhas) e escrita via SQL até a RF-028; `permissions` é dado não-sensível (SELECT liberado a authenticated para o app decidir sem service-role).
- **Scope**: Controle de acesso por módulo em todas as features admin futuras; piloto inicial no módulo membros (substitui `isAdminWriterRole`/`isHardDeleteRole` e as policies de 0006 por `can_access`).
- **Date**: 2026-09-12
- **Status**: active

### AD-016
- **Decision**: O módulo financeiro (RF-026) implementa **filtro e busca de lançamentos com re-render server-side via `searchParams` (GET)** — chips de `tipo`/`status` usam `next/link` (navegação client-side sem reload de página); `busca` e período (`data_inicio`/`data_fim`) usam formulário GET que recarrega a página — em vez de busca/filtros puramente client-side com fetch.
- **Reason**: Alinhamento com as features admin pré-existentes (membros, eventos, patrimônio, liderança), todas com o mesmo padrão GET + `searchParams` + re-render server-side; o volume esperado é baixo (~30 lançamentos/mês, AD-001) e o padrão já é provado pelos probes; AC-26 (filtros cumulativos) e AC-29 (empty state) são atendidos, e os chips de tipo/status atendem o "sem recarregar" da AC-28.
- **Trade-off**: `busca` e período forçam reload de página (parcialmente divergente da redação literal da AC-28 "update the list without page reload"); custo de GET server-rendered é baixo no volume do projeto. Evolução futura possível: debounce client-side mantendo mesma API.
- **Scope**: `src/app/admin/financeiro/page.tsx` (listagem + filtros). A redação da AC-28 é interpretada como "atualizar a lista de forma cumulativa sem formulários adicionais/duplicados", satisfeita com chips `Link` (client) + GET (server).
- **Date**: 2026-09-15
- **Status**: active

### AD-017
- **Decision**: O snapshot de fechamento de caixa (`cash_closes`, RF-026) **não possui coluna `status`**; a lista de fechamentos ("date, totals" da AC-20) satisfaz a apresentação sem coluna de status porque um fechamento executado é **imutável** (não existe estado intermediário — o row é criado apenas quando o fechamento é confirmado e todos os totais estão resolvidos).
- **Reason**: A migration 0014 modelou `cash_closes` como snapshot puro (data_abertura, data_fechamento, total_receitas, total_despesas, saldo, qtd_transacoes) sem enum de status; adicionar coluna `status` seria dead data dentro do MVP (o único estado possível é "fechado"). A AC-20 pede "date, totals, and status", mas a semântica de snapshot torna o status implícito.
- **Trade-off**: Divergência pequena de literalidade vs. design (spec diz "status", tabela não tem a coluna). Registrado como AD para o Verifier reconciliar; se futuramente houver estados (ex.: fechamento em rascunho), a coluna pode ser adicionada via migration.
- **Scope**: `supabase/migrations/0014_financeiro.sql`, `src/app/api/admin/financeiro/fechamento/route.ts` (GET retorna os totais + datas), página de fechamento.
- **Date**: 2026-09-15
- **Status**: active

## Handoff

- **Feature**: `admin-configuracoes` (RF-029) — **EM IMPLEMENTAÇÃO** — 6/6 tasks commitadas + 6 post-verifier fixes (2 rounds), aguardando verifier final.
- **O que foi entregue**: Tabela `settings` (key-value JSONB, RLS `can_access('configuracoes', 'administrar')`, seed 18 configs de `constants.ts`). Service `configuracoes.ts` (`obterConfiguracoes` com fallback + flag `fromDb`, `atualizarConfiguracoes` com validacao de whitelist). Rotas `GET/PATCH /api/admin/configuracoes` com guards `authAdmin`/`requireAdministrar`. Pagina `/admin/configuracoes` com 5 secoes (Dados da Igreja com valores editaveis, WhatsApp com link wa.me, PIX com instrucoes, Horarios, Redes Sociais), modo view/edit, badge "(padrao)" quando fallback constants.ts, reload apos save, form client `ConfiguracoesForm`, guard RBAC `configuracoes:ler`. Card "Configuracoes" no dashboard com icone `Settings`.
- **DB**: migration `0016_settings.sql` aplicada no dev `[REDACTED_PROJECT_REF]`.
- **Probes**: `scripts/probes-admin-configuracoes.sh` **33 ok / 0 falhas** — service (3 exports + fromDb), routes (GET/PATCH com guards), pages (page + form com 5 secoes + edit/save/cancel + wa.me + PIX instructions + padrao badge + valores), dashboard card, migration (table/RLS/seed). Gates lint/typecheck/build verdes.
- **Commits** (10, `624a938..f84c4fe`): migration, service, routes, page, dashboard+probes, docs, fix round 1 (CFG-03/04/24), docs, fix round 2 (CFG-02/10/24), docs.
- **Verifier**: pendente — sub-agente `tlc-verifier` deve rodar.
- **Próximos passos**: rodar verifier; `git push origin main` (commits locais; **nunca sem autorização**); próxima feature (RF-030 auditoria).
- **Open decisions**: nenhuma em aberto.
- **Uncommitted files**: `.specs/STATE.md` (este Handoff), `.specs/features/admin-configuracoes/{spec.md,design.md,tasks.md,validation.md}` (a commitar); `next-env.d.ts`/`opencode.json`/`tsconfig.tsbuildinfo` (untracked, NUNCA commitar).
- **Branch**: main (commits locais; `git push` pendente — nunca sem autorização).

## Handoff — feature CONCLUÍDA (2026-09-12)

<!-- CHECKPOINT-PAUSA: painel-membro round4 -->
- **Feature**: painel-membro — status: **fix P1 aplicado + verde live (27 ok / 0 falhas)**.
- **O que foi resolvido (rounds 3→4)**: bug real de produção — autocadastro válido retornava **409 permanente** (cadastro_duplicado). Causa: `generateMatricula` fazia `select max(matricula)+1` como **client autenticado**, sob RLS `members_select_own` → user sem row via `[]` → sempre `IVC-0001` → colisão com seed (unique 23505 → 409).
- **Fix commitado**: RPC `proxima_matricula()` **security definer** (`supabase/migrations/0005_proxima_matricula_rpc.sql`, commit `20a60a3`) imune a RLS via sequence versionada; `src/lib/painel/members.ts:57` via `supabase.rpc`. Probe round 4 (`350c9cb`) asserta 201 real + matrícula derivada (regex, ≠ seed) + guard de resíduo re-runnable.
- **Evidence**: probe live 27/0; mutation M9 (remover RPC) killed; rodada 4 do verifier prescreveu 3 fixes de higiene no probe — TODOS aplicados e commitados (`350c9cb`).
- **Próxima ação na retomada**: **re-despachar verifier round 5** — rodada final de confirmação da fix P1. Prescrição técnica já cumprida; nada em aberto.
- **Tests**: `BASE_URL=http://localhost:3000 bash scripts/probes-painel.sh` → 27 ok, 0 falhas (servidor dev :3000 no ar).
## Handoff — feature painel-membro CONCLUÍDA (2026-09-12)

- **Estado**: feature **fechada e provada** — round 5 FINAL PASS (verifier independente). Nada em aberto.
- **O que foi entregue**: autocadastro de membro gerando **201 real + matrícula derivada** (nunca hardcoded), perfil com validação real de nascimento (400 discriminado), avisos filtrados/ordenados, PIX pessoal com txid=matrícula + chave institucional.
- **Bug P1 que a verificação matou**: autocadastro válido devolvia **409 permanente** (cadastro_duplicado) — causa: `max(matricula)+1` via client autenticado sob RLS cego → sempre IVC-0001 → colisão com seed. **Fix**: RPC `proxima_matricula()` **security definer** imune a RLS (migration 0005 commitada `20a60a3` + `members.ts` via RPC `8244c8b`) — provado 2× : 27/0 live, mutações M9a/M9b mortas.
- **Lessons L-004/L-005** (probe re-runnable + RPC imune a RLS) promovidas no LESSONS.md.
- **Póximos passos (qualquer sessão nova)**: começar pelo `validation.md` round 5 PASS já persistido; considerar promover os lessons como L-004/L-005 confirmados (recurrence>1) e em seguida abrir a próxima feature já com probes discriminativos re-runnáveis desde o round 1.

## Handoff — feature admin-membros CONCLUÍDA (2026-09-12)

- **Feature**: admin-membros (RF-022) — **fechada e provada** — Verifier round 1 PASS (0 gaps abertos).
- **O que foi entregue**: CRUD de membros no painel admin com conta auth nativa (criação → `auth.users` papel `MEMBRO` + `force_password_change`, senha-ID temporária exibida 1×), listagem com busca/filtro/ordenação `nome asc`, edição de dados, ciclo de vida ATIVO/INATIVO/TRANSFERIDO com transições validadas, "remover" = inativar, hard-delete restrito (ADMIN/SUPER_ADMIN, sem documentos), documentos (metadados, P2), RBAC escritor (SECRETARIA/ADMIN/SUPER_ADMIN) vs leitor (FINANCEIRO/PATRIMONIAL/LIDER), cartão do membro no admin reusando `MemberCard`.
- **Arquitetura**: RSC lê (server client, RLS) + Route Handlers escrevem (`POST /api/admin/membros...`), `src/lib/admin/http.ts` guards 401/403, `createAdminClient` service-role só p/ auth ops, `src/lib/admin/membros.ts` service layer com rollback 2-passos no criar.
- **DB**: migrations `0006_admin_membros.sql` (status/endereço/`member_documents` + 7 policies RLS + helper `auth_role()`) e `0007_seed_admin.sql` (admin.teste/leitor.teste, senha `senha-teste`) aplicadas no dev `[REDACTED_PROJECT_REF]`.
- **Verificação**: `scripts/probes-admin-membros.sh` **106 ok / 0 falhas × 2 runs live** + regressões painel 27/0 e auth 19/0; sensor 7/7 mutantes mortos (incl. M4b role lists RLS — fix F1); `validate_spec.py`, `validate_tasks.py`, `validate_state.py` todos verdes.
- **Loop verifier**: round 0 FAIL (1 mutante sobrevivente + AC38/39 sem evidência + flakiness login) → 6 fix tasks `f832f3f..84d2757` → round 1 PASS.
- **Lessons candidatas novas**: L-006 (role lists de policies por policy), L-007 (assert redirect target em login), L-008 (propriedades negativas precisam de assert explícito).
- **Próximos passos**: `git push origin main` (se autorizado); próxima feature da Fase 9 — recomendado: painel admin base (RF-021 dashboard) ou RF-028/029 usuários/config (RF-032 matriz de permissões refina o RBAC já rascunhado em admin-membros).
- **Open decisions**: nenhuma em aberto (verbos HTTP da spec re-alinhados aos endpoints POST aprovados, commit `778944e`).
- **Uncommitted files**: `validation.md`, `docs/coverage-matrix.md`, `.specs/STATE.md` (a commitar agora); `next-env.d.ts`/`opencode.json`/`tsconfig.tsbuildinfo` (untracked, não commitados); `.specs/LESSONS.md`/`lessons.json` (gerados, não commitados).
- **Branch**: main (commits locais; `git push` pendente — nunca sem autorização).

## Handoff — feature admin-lideranca CONCLUÍDA (2026-09-14)

- **Feature**: admin-lideranca (RF-023, IGR-01..25) — **fechada e provada** — Verifier PASS (25/25 ACs, sensor 3/3 killed).
- **O que foi entregue**: Full CRUD de igrejas (DELETE só SUPER_ADMIN via app+RLS) e líderes (soft-delete ATIVO/INATIVO, sem DELETE), foto de líder (upsert 2MB, bucket público `fotos-lideranca`), portal DB-driven (home RSC `listarLideresAtivos` + `Leadership.tsx`), páginas admin de lista/nova/detalhe com gestão de líderes, tudo sob `can_access('igrejas', ...)` da matriz (RF-032).
- **DB**: migration `0011_igrejas_lideranca.sql` aplicada no dev `[REDACTED_PROJECT_REF]` + seeds (igreja IVC `…00d`, Pastor Ernandes `…00e`, usuario superadmin.teste `…00c`).
- **Bug real matado na verificação**: foto de líder falhava com "new row violates row-level security policy" — causa: upload com `x-upsert:true` do storage exige **policy de SELECT** em `storage.objects` (motor consulta existencia antes de INSERT/UPDATE); `0011` nao tinha. Fix: policy `lideranca_fotos_select` (leitura publica do bucket), commit `2737ca0`, aplicada no dev.
- **Probe novo**: `scripts/probes-admin-lideranca.sh` (102 ok/0 falhas) — estático (migration/RLS/guards/portal) + runtime com sessões reais (ADMIN/leitor/MEMBRO/SUPER_ADMIN), trap de cleanup, discriminadores por papel.
- **Verificação**: Verifier independente — 25/25 ACs com evidência file:line; sensor 3 mutações mortas (DELETE SUPER_ADMIN, 400 foto, filtro ATIVO portal); gates: 287 probes ok/0 falhas (102+139+27+19), lint/typecheck/build verdes; `validate_state.py admin-lideranca` 0 erros.
- **Observação infra (não-bloqueante)**: objetos de foto de probes acumulam no bucket dev `fotos-lideranca` entre rodadas (padrão `fotos-membros`); não afeta re-runs (upsert). IGR-23 (estado vazio) e ordenação visual com 2+ líderes só verificados por código/estática (seed tem 1 líder ATIVO).
- **Próximos passos**: `git push origin main` (RF-023 está local — 15 commits `a6588c0..HEAD`; **nunca sem autorização**) + escolher próximo módulo da Fase 9 (RF-024 eventos, RF-025 patrimônio, RF-026 financeiro, RF-027 relatórios, RF-021 dashboard) — nascem já com matriz (guardas/can()).
- **Open decisions**: nenhuma em aberto.
- **Uncommitted files**: `.specs/STATE.md` (este Handoff — a commitar agora); `validation.md`/`docs/coverage-matrix.md`/`.specs/features/admin-lideranca/tasks.md` (a commitar agora); `next-env.d.ts`/`opencode.json`/`tsconfig.tsbuildinfo` (untracked, não commitados).
- **Branch**: main (commits locais do RF-023; `git push` pendente — nunca sem autorização).

## Handoff — feature rbac-matriz CONCLUÍDA (2026-09-13)

- **Feature**: rbac-matriz (RF-032, AD-015) — **fechada e provada** — PASS (20/20 ACs; verificação inline, v. validation.md).
- **O que foi entregue**: fonte única da matriz de permissões na tabela `permissions` (PK `(role,module)`, check `nivel`, seed 48 pares idempotente, RLS: SELECT authenticated / escrita só SUPER_ADMIN); função `public.can_access(module,nivel)` SECURITY DEFINER (hierarquia ler<escrever<administrar, fail-closed) decidindo as 7 policies de `members`/`member_documents` (0008 dropa e recria as `*_admin` de 0006 via `can_access('membros',...)`); app com `getMatriz()` (`React.cache`) + `can(papel,modulo,nivel)` (`src/lib/auth/rbac.ts`); guardas module-aware `authAdmin`/`requireEscrita`/`requireAdministrar` (`src/lib/admin/http.ts`) e remoção de `isAdminWriterRole`/`isHardDeleteRole`/`ADMIN_WRITER_ROLES`/`requireWriter`/`requireHardDelete`; piloto completo no módulo membros (6 rotas + 3 páginas); log de negativa (MATRIZ-20).
- **DB**: migrations `0008_permissions_matriz.sql`, `0009_seed_secretaria.sql` (secretaria.teste SECRETARIA — ramo `escrever` do can()), `0010_seed_membro.sql` (re-seed membro.teste + linha members IVC-0001 — drift do dev) aplicadas no dev `[REDACTED_PROJECT_REF]`.
- **Verificação**: `scripts/probes-admin-membros.sh` **139 ok / 0 falhas** (ampliada p/ matriz: policies exatas por policy, ausência das role-lists, SECRETARIA 201/403, MEMBRO 403, FINANCEIRO 200/403) + regressões painel **27/0** e auth **19/0** (servidor **produção** `next start` :3000 — dev morto); gates lint/typecheck/build verdes; sensor 5/5 mutantes mortos (policies `administrar`, log negativa, guard rota, seed 47, hierarquia) em scratch `/tmp/opencode/verif-rf032`.
- **Loop verifier**: sub-agente `tlc-verifier` **travou e foi cancelado pelo usuário** → verificação executada **inline** na sessão (protocolo evidence-or-zero + sensor manual), registrada no validation.md. Mitigação de processo: rodar suítes contra `next start` (prod), runner único (`scripts/probes-all.sh` novo) e limpeza idempotente de resíduo (`scripts/reset-probe-residue.sql` novo) — recomendações em validation.md Residual. **L-006..L-008 promovidas a confirmed** (recurrence=2 via `lessons.py add --feature rbac-matriz`).
- **Drift de dados encontrado e corrigido**: seed `membro.teste` do 0002 tinha sumido do dev (probes de sessão MEMBRO quebravam); 0010 restaura auth+membr re; resíduo `membro.semcadastro` do probes-painel requer limpeza MCP entre runs (pré-existente, coberta pelo reset idempotente).
- **Próximos passos**: `git push origin main` (RF-032 está local, se autorizado) + escolher próximo módulo da Fase 9 — RF-023..RF-030 nascem **já com a matriz** (guardas/`can()` por módulo e nova linha na tabela `permissions`); dashboard RF-021 ficou por último por decisão do usuário. Ao criar cada módulo, copiar o padrão do piloto (migration + guards + probes discriminativos); verificar se o módulo usa `ler`/`escrever`/`administrar` conforme o Anexo A e cobrir o papel e nível no seed.
- **Open decisions**: nenhuma em aberto (AD-015 active; matriz-default confirmada no spec).
- **Uncommitted files**: `.specs/STATE.md` (este Handoff — a commitar agora); `next-env.d.ts`/`opencode.json`/`tsconfig.tsbuildinfo` (untracked, não commitados).
- **Branch**: main (commits locais do RF-032; `git push` pendente — nunca sem autorização).

## Handoff — feature admin-eventos CONCLUÍDA (2026-09-14)

- **Feature**: admin-eventos (RF-024, EVT-01..16) — **fechada e provada** — Verifier PASS (16/16 ACs, sensor 6/6 killed, incl. re-run it-2), `validate_state.py admin-eventos` 0 erros.
- **O que foi entregue**: tabela `events` (0012) com RLS via `can_access('eventos',...)` (SELECT anon+authenticated, escrita `escrever`, sem DELETE policy), CRUD admin em `/admin/eventos` (lista/nova/detalhe) sob guards da matriz, `validarEvento`/`validarDataEvento` (400 discriminado por campo), soft-delete `status=INATIVO` + `visivel=false` ocultam do portal (sem hard-delete), portal `/eventos` e `/eventos/[id]` migrados para **RSC async DB-driven** (sem `generateStaticParams`, sem literal `EVENTS`) lendo `listarEventosPublicos`/`buscarEventoPublico` — lista visivel+ATIVO `date` asc, detalhe com `notFound()` 404 para ocultos/inexistentes/INATIVO e botão "Inscrever-se via WhatsApp" preservado (wa.me/5583999450781, RN-003), empty state "Em breve avisaremos os próximos eventos", nav "Eventos" preservada (EVT-16).
- **DB**: migration `0012_events.sql` aplicada no dev `[REDACTED_PROJECT_REF]` + seed idempotente "Clamor 12h" (`…00f`, 2026-10-01 12:00 Santa Luzia - PB), âncora do portal.
- **Probe novo**: `scripts/probes-admin-eventos.sh` (**71 ok/0 falhas**) — estático (migration/RLS/guards/service/páginas/sem literal EVENTS/sem generateStaticParams) + runtime com sessões reais (login 307 target; ADMIN cria/edita/toggles; SECRETARIA 201/200; leitor ler 200/escrita 403; MEMBRO proxy redirect + 403; portal contém/oculta seed+A por visivel/status; detalhe 404 para ocultos; **POST inválido → 400+`campos` (EVT-05); PATCH inexistente → 404+`nao_encontrado` (EVT-09)** — asserts de corpo, não só status), trap EXIT idempotente.
- **Loop Verifier (2 iterações)**: it-1 FAIL — 2 mutantes sobreviveram (M3 título-vazio → POST 201; M4 404-throw → PATCH 500) porque EVT-05/EVT-09 só tinham asserts estáticos; fix `28bca31` `test(eventos): probes runtime de 400 por campo e 404 inexistente` (+30 linhas, sessão ADMIN); it-2 PASS — M3/M4 KILLED + spot M1/M2 re-mortos (6/6 fault classes), 16/16 ACs com assert de valor/corpo, validation.md reescrito em `00ec050`.
- **Regressões**: liderança 102/0, membros 139/0, painel 27/0, auth 19/0 + gates lint/typecheck/build verdes (`/eventos` e `/eventos/[id]` `ƒ Dynamic`).
- **Infra p/ sensor it-2 (nota)**: Turbopack v16.2.12 **panica com symlink de node_modules escapando a raiz do projeto** — scratch usou cópia real de node_modules; worktrees removidos, tree real intacta, `:3000` serve build final.
- **Próximos passos**: `git push origin main` (RF-024 está local — 13 commits `24ea3c3..HEAD`: `fd98867`..`00ec050`; **nunca sem autorização**) + escolher próximo módulo da Fase 9 (RF-025 patrimônio, RF-026 financeiro, RF-027 relatórios, RF-021 dashboard, RF-028 usuários, RF-029 configurações, RF-030 auditoria).
- **Open decisions**: nenhuma em aberto.
- **Uncommitted files**: `.specs/STATE.md` (este Handoff — a commitar agora); `next-env.d.ts`/`opencode.json`/`tsconfig.tsbuildinfo` (untracked, não commitados).
- **Branch**: main (commits locais do RF-024; `git push` pendente — nunca sem autorização).

## Handoff — feature admin-patrimonio CONCLUÍDA (2026-09-14)

- **Feature**: admin-patrimonio (RF-025, PAT-01..12) — **fechada e provada** — Verifier PASS (12/12 ACs, sensor 3/3 killed), `validate_state.py admin-patrimonio` 0 erros.
- **O que foi entregue**: tabela `assets` (0013) com CHECK de categoria enum fixo (`AUDIO`/`VIDEO`/`INSTRUMENTO`/`MOBILIA`/`EQUIPAMENTO`/`RELIGIOSO`/`OUTRO`) e de status (`ATIVO`/`INATIVO`), índice único **parcial** no tombo (`numero_patrimonio` → 409 `numero_patrimonio_duplicado`), RLS via `can_access('patrimonio',...)` **sem `anon`** (SELECT authenticated ler; INSERT/UPDATE escrever; **sem policy DELETE** — baixa por soft-delete); CRUD admin em `/admin/patrimonio` (lista com tombo/local/valor/status, nova, detalhe) sob guards da matriz; `validateAsset` (400 discriminado por campo: nome/categoria enum/valor>=0/data/tombo/status); `PATCH [id]` parcial com toggle `status` (baixa preservando histórico); dashboard admin ganhou cards "Eventos" + "Patrimônio" (lacuna RF-024 corrigida, PAT-12).
- **DB**: migration `0013_assets.sql` aplicada no dev `[REDACTED_PROJECT_REF]` + seeds idempotentes: bem "Kit de Som" (`…0010`, AUDIO, PAT-0001, Templo, 2500.00, 2024-03-15, Equipe de Som) e usuário `patrimonial.teste@ivc.local` (`…0007`, papel PATRIMONIAL — ramo `escrever`).
- **Probe novo**: `scripts/probes-admin-patrimonio.sh` (**67 ok/0 falhas**) — estático (migration/CHECK/índice parcial/RLS sem anon/sem DELETE/guards/service/páginas/dashboard) + runtime com sessões reais (login 307 target; ADMIN cria/edita/409 duplicado/baixa; PATRIMONIAL 201/200; FINANCEIRO e SECRETARIA leem 200 e **escrita 403** (discriminador L-008: secretaria escreve eventos mas não patrimônio); MEMBRO proxy redirect + 403; anon API 401; **POST inválido → 400+`campos`; PATCH inexistente → 404+`nao_encontrado`**), trap EXIT idempotente.
- **Loop execução (2 batches → inline)**: Batch 1 `tlc-worker` **corrompeu `validacao.ts`** (novo código inserido como strings JS literais, imports no meio do arquivo) e parou no T2 → executado **inline** pelo orquestrador a partir daí: `validateAsset` reescrito de forma íntegra, módulo `src/lib/admin/asset-types.ts` extraído (constantes/tipos puros) porque `ASSET_CATEGORIES` importado em client component puxava server-only (bug de build); 3 falsos negativos de probe corrigidos (`1c21a64`: enum→asset-types, greps DELETE→regex `method|async function`, toggle status).
- **Regressões**: eventos **71/0**, liderança 102/0, membros 139/0, painel **27/0** (falhas iniciais eram resíduo pré-existente de `probes-painel` — `membro.semcadastro` tinha linha em `members`; limpo via MCP, re-run ok), auth 19/0 + gates lint/typecheck/build verdes.
- **Próximos passos**: `git push origin main` (RF-025 está local — commits `b758421`..`1c21a64`; **nunca sem autorização**) + escolher próximo módulo da Fase 9 (RF-026 financeiro, RF-027 relatórios, RF-021 dashboard, RF-028 usuários, RF-029 configurações, RF-030 auditoria).
- **Open decisions**: nenhuma em aberto (7 decisões do usuário registradas em `context.md`: inventário completo, soft-delete, admin-only, enum fixo, responsável texto, cards dashboard, tombo opcional-único).
- **Uncommitted files**: `.specs/STATE.md` (este Handoff — a commitar agora); `next-env.d.ts`/`opencode.json`/`tsconfig.tsbuildinfo` (untracked, não commitados); `validation.md` (a escrever pelo Verifier).
- **Branch**: main (commits locais do RF-025; `git push` pendente — nunca sem autorização).

## Handoff — feature admin-financeiro CONCLUÍDA (2026-09-15)

- **Feature**: admin-financeiro (RF-026, FIN-01..12, AC-01..31) — **fechada e provada** — Verifier PASS (31/31 ACs; sensor final 8/8 killed, 0 survivals — 3 sobreviventes do R1 mortos no R3; AD-016/017 resolvem desvios), `validate_state.py admin-financeiro` 0 erros.
- **O que foi entregue**: tabelas `transactions` (`transactions` + `webhook_events` + `cash_closes`, migration `0014_financeiro.sql` aplicada no dev `[REDACTED_PROJECT_REF]`): CHECKs `tipo ∈ {RECEITA,DESPESA}`, `metodo ∈ {PIX,CARTAO,DINHEIRO,TRANSFERENCIA}`, `status ∈ {PENDENTE,CONCILIADO,CANCELADO}`, `valor >= 0`; `cash_closes` com coluna **GENERATED** `saldo` e snapshot imutável (sem UPDATE/DELETE policy); RLS via `can_access('financeiro', ...)` **sem `anon`** e **sem DELETE** em transactions/cash_closes (soft-delete CANCELADO). Seeds idempotentes: 'Dízimo seed' (RECEITA 100.00 PIX PENDENTE), 'Aluguel seed' (DESPESA 500.00 PENDENTE) e usuário `financeiro.teste@ivc.local` (FINANCEIRO — ramo `escrever`).
- **API + service**: `src/lib/admin/financeiro-types.ts` (tipos puros), `validacao.ts::validarLancamento` (400 discriminado por campo), `src/lib/admin/financeiro.ts` (service: CRUD, cancelamento `LancamentoNaoCancelavelError`, `previewFechamentoCaixa`, `fecharCaixa` snapshot); rotas `POST+GET /api/admin/financeiro`, `GET+PATCH /api/admin/financeiro/[id]` (CONCILIADO → 400 `transacao_conciliada`), `POST [id]/cancelar`, `GET+POST /api/admin/financeiro/fechamento` (sem CONCILIADO → 400 `sem_transacoes_para_fechar`); webhook stub `POST /api/webhooks/mercadopago` (sem auth, loga em `webhook_events` sem RLS, idempotência por `event_id` (23505→200 ok:true), approved cria transação RECEITA/PIX/CONCILIADO via service-role com `external_reference=data.id`, não-approved apenas log).
- **UI**: `/admin/financeiro` (listagem com chips tipo/status `next/link` + busca/período GET form + empty state 'Nenhum lançamento encontrado'), `/nova` (7 campos validados), `/[id]` (detalhe + ações editar/cancelar), `/fechamento` (prévia server-side `data-testid="preview-fechamento"` com valores exatos + histórico de snapshots + botão 2-passos); card Financeiro + resumo no dashboard `/admin`.
- **Probes**: `scripts/probes-admin-financeiro.sh` (**99 ok/0 falhas** final; R1 89/0 tinha 3 sensores sobreviventes) — estático (migration/RLS/CHECK/service/rotas/páginas) + runtime: sessões reais por papel (ADMIN/FINANCEIRO 201, SECRETARIA lê 200/escreve 403, MEMBRO proxy redirect+403, anon 401), CRUD, 400 campos discriminado, 404, cancelar 2x→400, webhook approved/idempotência/não-approved (assert negativo por `external_reference`) /inválido 400, fechamento (POST absorve pendentes → snapshot exato **150/50/100/2** → 400 determinístico), PATCH CONCILIADO→400 e2e, filtros runtime cumulativos, preview exato no bloco isolado, empty state, dashboard RF-021.
- **Loop verifier (3 rodadas)**: R1 FAIL (8 sensores, 3 sobreviventes: M-E totals reduce, M-H webhook não-approved, M-F preview flip; + assert fracos). R2 `45fab1a` (preview server-side + asserts exatos + AD-016/017) → M-E morto, M-F/M-H vivos (greps casavam resíduo/tabela de histórico). R3 `e2cf1e7` (bloco preview isolado `data-testid`→`</dl>`; AC-17 assert por external_reference na lista sem filtro; tasks/cobertura) → **8/8 killed, veredicto PASS**.
- **Desvios resolvidos**: **AD-016** (AC-28 "sem recarregar": chips via Link client-side; busca/período GET reload — padrão das features admin), **AD-017** (AC-20 "status" na lista: `cash_closes` snapshot sem coluna status — semântica de fechado implícita).
- **Regressões**: eventos **71/0**, liderança 102/0, membros 139/0, patrimônio 67/0, painel 27/0 (1 falha no Full gate era resíduo pré-existente da suite painel — `membro.semcadastro` em members; limpo via MCP), auth 19/0 + gates lint/typecheck/build verdes e `validate_spec`/`validate_tasks`/`validate_state` 0 erros.
- **Notas de precisão não-bloqueantes (candidatos a fix task futura)**: ramo "update por external_reference" do AC-16 e edge `valor=0` cobertos só estaticamente; campos `categoria`/`observacoes` do AC-2 sem assert individual (via AC-3/4).
- **Próximos passos**: `git push origin main` (RF-026 está local — commits `b605061`..`e2cf1e7`; **nunca sem autorização**) + escolher próximo módulo da Fase 9 (RF-027 relatórios, RF-021 dashboard, RF-028 usuários, RF-029 configurações, RF-030 auditoria — ver ROADMAP).
- **Open decisions**: nenhuma em aberto (AD-016/017 ativas; R-003/PIX apenas ADP-009; webhook MP stub sem assinatura no MVP).
- **Uncommitted files**: `.specs/STATE.md` (este Handoff — a commitar agora com `design.md` + `validation.md`); `next-env.d.ts`/`opencode.json`/`tsconfig.tsbuildinfo` (untracked, não commitados).
- **Branch**: main (commits locais do RF-026; `git push` pendente — nunca sem autorização).
