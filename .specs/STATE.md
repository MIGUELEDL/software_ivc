# STATE

## Decisions

### AD-001
- **Decision**: Produto = plataforma web institucional (portal pÃºblico multirrota + portal de membro + painel administrativo com RBAC) para 1 templo da Igreja Virtude CristÃ£ (Santa Luzia - PB).
- **Reason**: Projeto real com volumes baixos (30-50 membros, ~30 lanÃ§amentos/mÃªs, ~20 doaÃ§Ãµes/mÃªs); escopo Ãºnico templo governa a simplicidade da soluÃ§Ã£o.
- **Trade-off**: Abrimos mÃ£o de multitenancy e de mÃ³dulos corporativos complexos (contabilidade, CAC) em favor de clareza e custo mÃ­nimo.
- **Scope**: Todos os mÃ³dulos futuros (portal, membros, eventos, financeiro, conteÃºdo, administrativo).
- **Date**: 2026-09-06
- **Status**: active

### AD-002
- **Decision**: Arquitetura = monÃ³lito modular com Next.js 16 (App Router + Route Handlers), camadas por domÃ­nio (app / features) e Ports & Adapters para serviÃ§os externos (Supabase, Resend, pagamentos).
- **Reason**: 1 templo â 1 deploy simples; modularizaÃ§Ã£o preserva fronteiras de domÃ­nio e testabilidade sem custo de microserviÃ§os.
- **Trade-off**: Escala vertical limitada; deploy Ãºnico = mudanÃ§as afetam todo o app.
- **Scope**: Camadas de aplicaÃ§Ã£o, estrutura de pastas, integraÃ§Ã£o externa.
- **Date**: 2026-09-06
- **Status**: active

### AD-003
- **Decision**: Banco de dados = PostgreSQL via Supabase (Auth + Storage incluÃ­dos), modelado com Drizzle ORM.
- **Reason**: PostgreSQL p/ integridade financeira; Supabase comeÃ§a em plano free; Drizzle tem tipagem first-class e migraÃ§Ãµes SQL.
- **Trade-off**: DependÃªncia de um provedor gerenciado (lock-in moderado); RLS do Supabase adiciona camada de seguranÃ§a a dominar.
- **Scope**: PersistÃªncia, migraÃ§Ãµes, RLS, storage de arquivos (foto membro, documentos).
- **Date**: 2026-09-06
- **Status**: active

### AD-004
- **Decision**: AutenticaÃ§Ã£o = Auth.js (NextAuth) com sessÃµes separadas para membro e para administrador, primeiro acesso por senha-ID (hash) com troca obrigatÃ³ria.
- **Reason**: Controle fino de sessÃ£o por perfil no mesmo app; fluxo de primeiro acesso exigido pela lideranÃ§a p/ ~50 membros.
- **Trade-off**: Mais cÃ³digo prÃ³prio de verificaÃ§Ã£o de identidade vs. serviÃ§o externo pronto (Clerk etc.).
- **Scope**: Login de membro e de admin, RBAC (MEMBRO, SECRETARIA, LIDER, FINANCEIRO, PATRIMONIAL, ADMIN, SUPER_ADMIN).
- **Date**: 2026-09-06
- **Status**: superseded by AD-013

### AD-013
- **Decision**: AutenticaÃ§Ã£o = **Supabase Auth nativo (GoTrue) via `@supabase/ssr`** com sessÃ£o server-side e cookies httpOnly; papel do usuÃ¡rio em `app_metadata.role` (nÃ£o-editÃ¡vel, lido server-side via `getClaims()`); logins separados `/login` (membro) e `/login/admin`; primeiro acesso por senha-ID temporÃ¡ria com troca obrigatÃ³ria (flag `app_metadata.force_password_change`); 1Âº admin via script seed local `seed:admin` (service-role); destino pÃ³s-login = landings mÃ­nimos `/painel` e `/admin`; entrega de senha-ID manual pela lideranÃ§a. **Supersede AD-004.**
- **Reason**: DecisÃ£o do usuÃ¡rio em 2026-09-10 apÃ³s anÃ¡lise (MCP Supabase ativo; projeto `[REDACTED_PROJECT_NAME]` criado). GoTrue entrega pronto hash/sessÃ£o/refresh/rate limit (cobre RNF-004 parcial) e evitar cÃ³digo prÃ³prio de Auth.js; papel em `app_metadata` nÃ£o Ã© editÃ¡vel pelo usuÃ¡rio â RBAC de decisÃ£o exclusiva no servidor (SECURITY.md).
- **Trade-off**: DependÃªncia do Supabase Auth em vez de Auth.js (lock-in moderado com AD-003); flag `force_password_change` em app_metadata substitui mecanismo nativo inexistente de expiraÃ§Ã£o de senha (RN-002); resets/envio de e-mail fora do MVP (senha-ID entregue manualmente, D2).
- **Scope**: Login membro/admin, RBAC de rotas (MEMBRO, SECRETARIA, LIDER, FINANCEIRO, PATRIMONIAL, ADMIN, SUPER_ADMIN), primeiro acesso/troca obrigatÃ³ria da senha-ID. PainÃ©is reais e gestÃ£o de papÃ©is (RF-028/RF-032) ficam para features futuras.
- **Date**: 2026-09-10
- **Status**: active

### AD-005
- **Decision**: AdoÃ§Ã£o do kit Spec-Driven TLC Spec-Driven v3.3.0 como processo padrÃ£o de features (`.opencode/skills/tlc-spec-driven/`), com formato de specs em EARS sob `.specs/features/` e decisÃµes em `.specs/STATE.md`; OpenSpec usado como formato de referÃªncia nas docs.
- **Reason**: Projeto dirigido por especificaÃ§Ã£o e auditoria (fonte Ãºnica de verdade RFâspecâtesteâaceite); skill roda em markdown+python3 sem dependÃªncia de Node; verifier independente dÃ¡ qualidade.
- **Trade-off**: Overhead de processo vs. escrever direto; requer disciplina de runbooks (verificador e commits atÃ´micos).
- **Scope**: Processo de desenvolvimento de todas as features; reprovado â nova ADR.
- **Date**: 2026-09-06
- **Status**: active

### AD-006
- **Decision**: Ambiente de desenvolvimento usa Node.js 22 LTS via nvm (`.nvmrc` = 22), com gates de cÃ³digo locais `npm run lint`, `npm run typecheck` (tsc --noEmit) e `npm run build`; runner de testes entra na F10.
- **Reason**: Node nÃ£o estava no PATH do shell; nvm versiona por projeto; script `typecheck` foi adicionado (nÃ£o existia no package.json).
- **Trade-off**: DependÃªncia do desenvolvedor ativar nvm por sessÃ£o (documentado no AGENTS.md).
- **Scope**: Tooling local e CI.
- **Date**: 2026-09-06
- **Status**: active

### AD-007
- **Decision**: CI/CD = GitHub Actions com gate duplo (job `tests`: lintâtypecheckâbuild em node 22; job `specs`: validaÃ§Ã£o estrutural python3 dos `.specs/features/*`) + deploy em Vercel (plano Hobby); commits atÃ´micos em Conventional Commits via `check_commit.py`.
- **Reason**: Custo zero (liberado no plano gratuito do GitHub), dupla verificaÃ§Ã£o mÃ¡quina+verifier, deploy contÃ­nuo no Hobby.
- **Trade-off**: Limites do plano Hobby (10 deployments/dia mÃ¡x.) â aceitÃ¡vel para escala do projeto.
- **Scope**: RepositÃ³rio git, pipeline de PR, deploy.
- **Date**: 2026-09-06
- **Status**: active

### AD-008
- **Decision**: Dados institucionais reais (endereÃ§o, cidade, pastor presidente, e-mail, redes sociais, horÃ¡rios de culto) vivem em `src/lib/constants.ts` como fonte Ãºnica, consumidos pelos componentes.
- **Reason**: A landing page atual usa placeholders ("Sua Cidade", "Em breve", e-mail genÃ©rico); dados confirmados nas descobertas F0-F2 precisam de fonte Ãºnica antes do MVP.
- **Trade-off**: Dados estÃ¡ticos no bundle (nÃ£o editÃ¡veis sem deploy) â aceitÃ¡vel para portal institucional da F9.
- **Scope**: Portal pÃºblico; painel admin pode posteriormente editar (nova ADR se decidir persistir em DB).
- **Date**: 2026-09-06
- **Status**: active

### AD-009
- **Decision**: Financeiro do MVP (Fase 9) utiliza **apenas PIX** â QR PIX pÃºblico no portal + webhook Mercado Pago para recebimentos; conciliaÃ§Ã£o e fechamento de caixa obrigatÃ³rios. CartÃ£o de crÃ©dito entra em iteraÃ§Ã£o futura. (**RN-001.1**) A Ã¡rvore oficial prevÃª PIX+cartÃ£o, mas a doaÃ§Ã£o pÃºblica foi priorizada como PIX/QR e o cartÃ£o exige CNPJ + checkout Mercado Pago ainda indisponÃ­veis.
- **Reason**: Desbloqueia a Fase 9 imediatamente sem depender de CNPJ/checkout de cartÃ£o; reduz complexidade inicial; alinha com a prioridade da doaÃ§Ã£o pÃºblica por PIX/QR.
- **Trade-off**: Menos opÃ§Ãµes de pagamento no lanÃ§amento vs. lanÃ§amento mais rÃ¡pido e simples; cartÃ£o fica para uma nova iteraÃ§Ã£o (nova ADR quando o CNPJ estiver pronto).
- **Scope**: MÃ³dulo financeiro; cardÃ¡pio de meios de pagamento do MVP.
- **Date**: 2026-09-08
- **Status**: active

### AD-010
- **Decision**: NÃºmero oficial de WhatsApp da igreja (decisÃ£o D4 resolvida): **(83) 99945-0781**. `SOCIAL.whatsapp` em `src/lib/constants.ts` passa de placeholder `"#"` para `"https://wa.me/5583999450781"`.
- **Reason**: LideranÃ§a informou o nÃºmero em 2026-09-08; destrava o requisito RN-003 ("inscrever-se" em evento â WhatsApp) e remove o placeholder sem fabricar dado.
- **Trade-off**: NÃºmero Ãºnico oficial; eventuais mudanÃ§as exigem atualizaÃ§Ã£o da constante (fonte Ãºnica, AD-008).
- **Scope**: Portal pÃºblico (links sociais), painel administ (configuraÃ§Ã£o de WhatsApp RF-029 posterior).
- **Date**: 2026-09-08
- **Status**: active

### AD-011
- **Decision**: Dados oficiais de constituiÃ§Ã£o registrados em `src/lib/constants.ts`: **fundaÃ§Ã£o em 07/09/2025** (primeiro culto) e **CNPJ 68.683.917/0001-71** (criado em 03/08/2026).
- **Reason**: Informados pela lideranÃ§a em 2026-09-08 (substitui `"Em breve"` e o placeholder anterior); o CNPJ Ã© prÃ©-requisito do Mercado Pago (RC-002) para o financeiro da Fase 9 â MVP segue PIX apenas (AD-009).
- **Trade-off**: Data de fundaÃ§Ã£o adotada = primeiro culto (07/09/2025), nÃ£o a data de registro do CNPJ (03/08/2026), conforme esclarecido pela lideranÃ§a.
- **Scope**: Portal pÃºblico (seÃ§Ã£o Sobre/HistÃ³ria), docs institucionais; CNPJ alimenta contratos Mercado Pago.
- **Date**: 2026-09-08
- **Status**: active

### AD-012
- **Decision**: DoaÃ§Ã£o PIX do portal (RF-007) usa **QR PIX estÃ¡tico gerado no app** a partir da chave CNPJ oficial `68.683.917/0001-71` (Confirmed em 2026-09-08): payload BR Code montado em `src/lib/pix.ts` (`buildBrCode`, MAI `BR.GOV.BCB.PIX01<chave>`, MCC 0000, moeda 986, paÃ­s BR, nome/cidade projetados sem acentos atÃ© 25/15, TXID `***`, CRC-16/CCITT-FALSE em `6304`) + renderizaÃ§Ã£o com `qrcode.react@4.2.0` (nova dependÃªncia). PÃ¡gina `/doacao` mostra o QR e o cÃ³digo copia-e-cola com botÃ£o "Copiar" (clipboard + fallback acessÃ­vel).
- **Reason**: Admin omitiu chave oficial (CNPJ) em 2026-09-08; sem lib de QR instalada; QR estÃ¡tico (sem campo 54/valor fixo) alinha com RN-001 e AD-009 (PIX apenas no MVP); renderizaÃ§Ã£o no app permite trocar chave no deploy sem imagem estÃ¡tica.
- **Trade-off**: Nova dependÃªncia (`qrcode.react`); QR sem valor fixo (o app bancÃ¡rio define) â escolha explÃ­cita do admin; MM 'copia-e-cola' fixo com TXID `***`.
- **Scope**: Portal pÃºblico `/doacao`; fonte Ãºnica `PIX.key` aponta `CHURCH.cnpj`.
- **Date**: 2026-09-08
- **Status**: active

> **CorreÃ§Ã£o 2026-09-08 (commit `bb3a62f`)**: Manual de PadrÃµes do PIX/BCB exige CNPJ **sem formataÃ§Ã£o** no BR Code (somente os 14 dÃ­gitos). `PIX.key` passou a derivar de `CHURCH.cnpj` via `replace(/\D/g, "")` (â `68683917000171`).

### AD-014
- **Decision**: MigraÃ§Ãµes de banco do projeto sÃ£o **SQL puro versionado em `supabase/migrations/`** (aplicadas via Supabase CLI/MCP no dev e em produÃ§Ã£o), iniciando com a feature painel-membro (`members`, `event_notices`). **Drizzle ORM permanece como evoluÃ§Ã£o futura** (AD-003 mantida em status active, mas a materializaÃ§Ã£o inicial nÃ£o depende dela).
- **Reason**: DecisÃ£o do usuÃ¡rio em 2026-09-11 (painel-membro, discussÃ£o opÃ§Ã£o A): sem tooling novo no MVP; trilha de migraÃ§Ã£o versionada no repo desde o inÃ­cio; nÃ£o bloqueia a AD-003 (Drizzle pode ser adotado ao migrar schema tipado).
- **Trade-off**: SQL puro = tipos/validadores hand-written em `src/lib/painel/*`; Drizzle adiado evita dependÃªncia+config hoje.
- **Scope**: Todas as features que tocarem banco (members, avisos, futuras: financeiro, eventos em DB, etc.).
- **Date**: 2026-09-11
- **Status**: active

### AD-015
- **Decision**: RBAC fino (RF-032) passa a ser definido pela **tabela `permissions` no banco** (PK `(role, module)`, nÃ­vel `ler`/`escrever`/`administrar` hierÃ¡rquicos), fonte Ãºnica consultada por `can(papel, modulo, nivel)` na aplicaÃ§Ã£o e por `can_access(module, nivel)` (SECURITY DEFINER, papel do JWT via `auth_role()`) nas policies RLS. Fail-closed: papel sem linha ou erro de leitura â nega. O proxy mantÃ©m `isAdminRole` como gate grosseiro de roteamento (decisÃ£o fina no servidor + RLS). UI de gestÃ£o da matriz fica na RF-028; escrita na tabela sÃ³ `SUPER_ADMIN`.
- **Reason**: Role-lists duplicadas entre TS e SQL se provaram frÃ¡geis (mutante M4b da RF-022); decisÃ£o do usuÃ¡rio em 2026-09-12 (matriz no banco para editar sem deploy). Matriz-default confirmada: `SUPER_ADMIN`/`ADMIN` administram tudo; `SECRETARIA` escreve membros/eventos (lÃª demais); `FINANCEIRO` escreve financeiro/relatÃ³rios; `PATRIMONIAL` escreve patrimÃ´nio; `LIDER` lÃª; `usuarios`/`configuracoes`/`auditoria` sÃ³ `ADMIN`/`SUPER_ADMIN`; `MEMBRO` sem acesso admin (dados prÃ³prios via policies de 0001, intactas).
- **Trade-off**: Camada de consulta extra (tabela ~48 linhas) e escrita via SQL atÃ© a RF-028; `permissions` Ã© dado nÃ£o-sensÃ­vel (SELECT liberado a authenticated para o app decidir sem service-role).
- **Scope**: Controle de acesso por mÃ³dulo em todas as features admin futuras; piloto inicial no mÃ³dulo membros (substitui `isAdminWriterRole`/`isHardDeleteRole` e as policies de 0006 por `can_access`).
- **Date**: 2026-09-12
- **Status**: active

### AD-016
- **Decision**: O mÃ³dulo financeiro (RF-026) implementa **filtro e busca de lanÃ§amentos com re-render server-side via `searchParams` (GET)** â chips de `tipo`/`status` usam `next/link` (navegaÃ§Ã£o client-side sem reload de pÃ¡gina); `busca` e perÃ­odo (`data_inicio`/`data_fim`) usam formulÃ¡rio GET que recarrega a pÃ¡gina â em vez de busca/filtros puramente client-side com fetch.
- **Reason**: Alinhamento com as features admin prÃ©-existentes (membros, eventos, patrimÃ´nio, lideranÃ§a), todas com o mesmo padrÃ£o GET + `searchParams` + re-render server-side; o volume esperado Ã© baixo (~30 lanÃ§amentos/mÃªs, AD-001) e o padrÃ£o jÃ¡ Ã© provado pelos probes; AC-26 (filtros cumulativos) e AC-29 (empty state) sÃ£o atendidos, e os chips de tipo/status atendem o "sem recarregar" da AC-28.
- **Trade-off**: `busca` e perÃ­odo forÃ§am reload de pÃ¡gina (parcialmente divergente da redaÃ§Ã£o literal da AC-28 "update the list without page reload"); custo de GET server-rendered Ã© baixo no volume do projeto. EvoluÃ§Ã£o futura possÃ­vel: debounce client-side mantendo mesma API.
- **Scope**: `src/app/admin/financeiro/page.tsx` (listagem + filtros). A redaÃ§Ã£o da AC-28 Ã© interpretada como "atualizar a lista de forma cumulativa sem formulÃ¡rios adicionais/duplicados", satisfeita com chips `Link` (client) + GET (server).
- **Date**: 2026-09-15
- **Status**: active

### AD-017
- **Decision**: O snapshot de fechamento de caixa (`cash_closes`, RF-026) **nÃ£o possui coluna `status`**; a lista de fechamentos ("date, totals" da AC-20) satisfaz a apresentaÃ§Ã£o sem coluna de status porque um fechamento executado Ã© **imutÃ¡vel** (nÃ£o existe estado intermediÃ¡rio â o row Ã© criado apenas quando o fechamento Ã© confirmado e todos os totais estÃ£o resolvidos).
- **Reason**: A migration 0014 modelou `cash_closes` como snapshot puro (data_abertura, data_fechamento, total_receitas, total_despesas, saldo, qtd_transacoes) sem enum de status; adicionar coluna `status` seria dead data dentro do MVP (o Ãºnico estado possÃ­vel Ã© "fechado"). A AC-20 pede "date, totals, and status", mas a semÃ¢ntica de snapshot torna o status implÃ­cito.
- **Trade-off**: DivergÃªncia pequena de literalidade vs. design (spec diz "status", tabela nÃ£o tem a coluna). Registrado como AD para o Verifier reconciliar; se futuramente houver estados (ex.: fechamento em rascunho), a coluna pode ser adicionada via migration.
- **Scope**: `supabase/migrations/0014_financeiro.sql`, `src/app/api/admin/financeiro/fechamento/route.ts` (GET retorna os totais + datas), pÃ¡gina de fechamento.
- **Date**: 2026-09-15
- **Status**: active

### AD-018
- **Decision**: O cÃ³digo de barras do cartÃ£o de membro passa a ser um **Code 128 real (Code Set B, payload = `member.matricula`)** via encoder puro prÃ³prio `src/lib/barcode/code128.ts` (tabela canÃ´nica de 107 sÃ­mbolos, start B = 104, checksum **mod 103** com pesos posicionais 1-based antes do stop + barra de terminaÃ§Ã£o) e render **vetorial/proporcional por mÃ³dulo** no `MemberCard`, substituindo o gradiente decorativo fixo. Sem dependÃªncia nova; degradaÃ§Ã£o: `RangeError` fora de ASCII 32â126 â bloco sem barras, matrÃ­cula legÃ­vel mantida.
- **Reason**: O gradiente anterior codificava dÃ­gitos de um hash nÃ£o escaneÃ¡veis; a portaria precisa ler a matrÃ­cula (`IVC-NNNN`, dentro do Code Set B). Nenhuma biblioteca injetada (jspdf/qrcode.react jÃ¡ presentes mas desnecessÃ¡rias); tabela conferida em crifan.com e barcodesinc.com. OpÃ§Ã£o QR de validaÃ§Ã£o fica para feature futura (qrcode.react jÃ¡ Ã© dependÃªncia).
- **Trade-off**: Encode sÃ³ Code Set B (sem otimizaÃ§Ã£o automÃ¡tica A/B/C) Ã© suficiente para `IVC-NNNN` e mantÃ©m o encoder simples; quiet zone de ~8 mÃ³dulos torna o token levemente mais longo, mas a Ã¡rea do card comporta.
- **Scope**: `src/lib/barcode/code128.ts`, `Code128Barcode` em `src/components/MemberCard.tsx`, `scripts/probe-barcode.sh`, spec `barcode-membro` (BRC-01..05).
- **Date**: 2026-09-22
- **Status**: active

### AD-019
- **Decision**: O autoedit de perfil **nÃ£o** pode escrever a linha inteira. `members_update_own` (RLS) restringe a **linha**, nÃ£o as **colunas**, entÃ£o um `update` com o objeto do form inteiro escreveria `status`, `matricula` e `criado_em` â escalonamento de privilÃ©gio. Os trÃªs services (`painel/members.ts`, `admin/membros.ts` e as rotas) passam a montar explicitamente apenas `{...payload, ...colunasDocumento(dados)}`; nada mais da linha entra no update.
- **Reason**: A RLS Ã© o Ãºnico controle entre o token do membro e a prÃ³pria linha dele, e ela nÃ£o conhece colunas. Sem whitelist no service, qualquer campo novo adicionado ao objeto do form viraria escrita em massa. `colunasDocumento` tambÃ©m usa `||` e nÃ£o `??`: `""` tambÃ©m Ã© ausÃªncia de dado, e `''` e `NULL` sÃ£o estados distintos na coluna.
- **Trade-off**: Campo novo exige tocar o service; Ã© o custo de nÃ£o confiar na RLS para granularidade. Ganho: `status` e `matricula` ficam fora do alcance do autoedit por construÃ§Ã£o, nÃ£o por convenÃ§Ã£o.
- **Scope**: `src/lib/painel/documento.ts` (`colunasDocumento`), `src/lib/painel/members.ts`, `src/lib/admin/membros.ts`, `src/app/api/painel/perfil/route.ts`, `src/app/api/admin/membros/route.ts`, `src/app/api/admin/membros/[id]/dados/route.ts`.
- **Date**: 2026-09-23
- **Status**: active

### AD-020
- **Decision**: A validade Ã© calculada no **calendÃ¡rio civil fixo `America/Sao_Paulo`**, tanto no TypeScript (`civilDe`) quanto no SQL (`at time zone`), e nÃ£o no fuso da mÃ¡quina/sessÃ£o.
- **Reason**: A spec original pedia "data civil local do servidor", mas o servidor de produÃ§Ã£o roda em UTC: `criado_em = 2026-09-13T02:01Z` (IVC-0001) seria lido como 13/09 em UTC e como 12/09 no Brasil, e o cartÃ£o impresso erraria o dia da validade conforme o ambiente. Fixar o fuso tambÃ©m elimina a divergÃªncia entre o cÃ¡lculo da aplicaÃ§Ã£o e o `timestamptz` gravado pelo trigger. O probe fixa `hoje` e roda em vÃ¡rios `TZ` para provar que o resultado nÃ£o depende do ambiente.
- **Trade-off**: Um membro no exterior tem o aniversÃ¡rio avaliado no calendÃ¡rio da igreja â que Ã© o comportamento desejado para um documento civil em papel. O custo Ã© que `America/Sao_Paulo` aparece em trÃªs lugares (TS, migration, spec) e precisa continuar alinhado.
- **Scope**: `src/lib/painel/validade.ts`, `supabase/migrations/0024_validade_cartao.sql`, spec/design de `cartao-valididade-anual` (CART-16).
- **Date**: 2026-09-23
- **Status**: active

### AD-021
- **Decision**: O probe sÃ³ aceita guard **estrutural**, nÃ£o de presenÃ§a de token: para o caminho de escrita, o identificador vinculado ao retorno da composiÃ§Ã£o tem de ser **literalmente o Ãºltimo argumento de todos** os serviÃ§os de gravaÃ§Ã£o da rota, a guarda de 400 (`temErros`) tem de consultÃ¡-lo e tem de vir **antes** deles. Para o cartÃ£o, o retorno do mapper tem de estar ligado ao JSX. Caractere de controle Ã© conferido na entrada **crua**, antes de qualquer `trim`.
- **Reason**: TrÃªs rodadas de Verifier foram gastas com a mesma classe de falha: o arquivo continha o sÃ­mbolo, o efeito sumia. `comporDadosDocumento` chamada e descartada, `updateMember(..., base.dados)` com `createMember` ainda correto, `{...dadosDocumento, rg: null}` no lugar do argumento, `Object.keys(campos).length > 0` trocado por `=== 0` â todos passavam typecheck, lint, build e as probes. O ponto nÃ£o era a ausÃªncia de teste, era o teste nÃ£o conseguir distinguir a barreira da sua remoÃ§Ã£o. E o `trim()` antes de `temControle` era um **bug real**: `
`, `
` e `	` sÃ£o whitespace, entÃ£o `"12345678909\n"` entrava limpo (medido pelo Verifier), violando P1/5.
- **Trade-off**: Um alias semanticamente correto (`const alias = dados; service(..., alias)`) Ã© reprovado, e a tier de banco reprova o snapshot se alguma coluna citada nÃ£o existir na tabela mÃ­nima. O preÃ§o Ã© uma refatoraÃ§Ã£o de uma linha virar alteraÃ§Ã£o de gate; a alternativa jÃ¡ custou trÃªs rodadas.
- **Scope**: `scripts/probe-cartao-validade.sh` (guard `persistido`), `src/lib/painel/documento.ts` (`temErros` + ordem da checagem de controle), `src/app/api/painel/perfil/route.ts` (`validarCamposBase` separado da composiÃ§Ã£o), `src/lib/painel/cartao.ts` (`criado_em` anulÃ¡vel).
- **Date**: 2026-10-01
- **Status**: superseded (parcialmente) por **AD-024** â `temErros` nÃ£o existe mais (`a4a39d1`), e a guarda de 400 deixou de ser um sÃ­mbolo observÃ¡vel: passou a ser o estreitamento de `Pronto<T>`, que quebra a compilaÃ§Ã£o. O texto acima fica como registro do que se decidiu na Ã©poca; a parte ainda vigente Ã© o guard `persistido`, o `FormData` como 3Âº argumento, o mapa de erros da rota como 2Âº argumento, e o controle conferido antes do `trim`.

### AD-022
- **Decision**: O backfill da migration Ã© provado por **snapshot de todas as outras colunas** antes e depois, e a **reexecuÃ§Ã£o tem o exit code conferido** â nÃ£o sÃ³ a contagem e o valor de uma linha. A tabela mÃ­nima do probe passou a ter `nascimento`, `cpf`, `rg` e `data_batismo`, e o snapshot Ã© validado como legÃ­vel antes de ser comparado.
- **Reason**: O Verifier provou que ambos os testes passavam vazios. Um backfill que tambÃ©m escrevesse `nome` e `atualizado_em` mantinha contagem e `validade_cartao` iguais. E o primeiro snapshot que escrevi citava colunas inexistentes na tabela mÃ­nima: `valor()` devolvia o texto do erro nas duas leituras, e o gate comparava o erro com ele mesmo â verde para qualquer coisa. Pior, remover `drop trigger if exists` deixava a tier sozinha em 18 ok / 0: a reexecuÃ§Ã£o falhava e ninguÃ©m olhava o cÃ³digo de saÃ­da.
- **Trade-off**: O gate de banco depende de Docker e de `pgvector/pgvector:pg16`. Sem isso a tier faz SKIP com **exit 2** e o wrapper transforma em falha, em vez de sumir: cobertura perdida tem de aparecer.
- **Scope**: `scripts/probe-cartao-db.sh`, `supabase/migrations/0024_validade_cartao.sql` (sem mudanÃ§a no arquivo), tasks da feature (T9 deixa de ser `Tests: none`).
- **Date**: 2026-10-01
- **Status**: active

### AD-023
- **Decision**: Probes de feature **nÃ£o entram no CI** neste momento; ficam como gate local declarado no `tasks.md` de cada feature.
- **Reason**: `.github/workflows/ci.yml` roda lint/typecheck/build e os validadores estruturais, e nenhum `scripts/probe*.sh` â condiÃ§Ã£o **prÃ©-existente do projeto**, nÃ£o introduzida aqui. Colocar o probe de uma feature no CI do repo tornaria a pipeline dependente de Docker e imporia a ordem de merge de features sem decisÃ£o do usuÃ¡rio. Registrado como pendÃªncia em vez de silenciosamente aceito.
- **ConsequÃªncia**: "gate verde" existe apenas localmente. Ã o ponto 5 de precisÃ£o do 3o Verifier, e Ã© a origem da fragilidade histÃ³rica deste gate: probes locais que ninguÃ©m roda nÃ£o sÃ£o barreira.
- **Pendente de**: decisÃ£o do usuÃ¡rio sobre (a) rodar probes no CI e (b) ordem de merge.
- **Date**: 2026-10-01
- **Status**: active

### AD-024
- **Decision**: `comporDadosDocumento` devolve uma **uniÃ£o discriminada** (`Pronto<T>`), e `criarMembro`/`atualizarDadosMembro` recebem `DadosProntos<T>` â nÃ£o o tipo de entrada da rota.
- **Reason**: o par `{ dados, campos }` era indistinguÃ­vel: os dois ramos existiam sempre, entÃ£o ler `.dados` sem estreitar nada compilava. Um mutante que trocava o `return` do 400 por um `console.error` gravava a row com campo invÃ¡lido e mantinha typecheck, lint, build e todas as probes verdes â sobreviveu a **quatro rodadas de Verifier** (R4: V1/V2/V3). Com `ok: false` sÃ³ existente quando hÃ¡ erro, `.dados` sÃ³ existe no ramo vÃ¡lido: remover o `return` quebra a compilaÃ§Ã£o. `DadosProntos<T> = Readonly<T & DadosDocumento>` torna as trÃªs chaves de documento obrigatÃ³rias no service (o mutante "payload sem o trio" morre em `TS2345`) e impede reescrita pÃ³s-composiÃ§Ã£o.
- **ConsequÃªncia**: `temErros` foi removido â era a barreira fraca que a uniÃ£o substitui, mantida viva sÃ³ por uma asserÃ§Ã£o de probe. `Readonly` **nÃ£o** impede `{ ...pronto.dados }`, entÃ£o o guard `persistido` do probe continua sendo a barreira dessa classe; a assinatura do service fecha a omissÃ£o silenciosa, nÃ£o a reescrita via spread.
- **Date**: 2026-10-01
- **Status**: active

### AD-025
- **Decision**: TS e SQL passam a concordar no **ano de 5 dÃ­gitos** (`criado_em` de 9999 â ciclo-base `10000-12-31`). `FORMATO_DATA` aceita 4 a 6 dÃ­gitos e a comparaÃ§Ã£o de datas Ã© **numÃ©rica** por ano/mes/dia, nÃ£o lexical. `infinity` permanece `null` no TS.
- **Reason**: medido no Postgres efÃªmero â o trigger grava `make_date(ano+1, â¦)` e devolvia `10000-12-31`, enquanto o TS devolvia `â`. Duas causas independentes: o formato recusava 5 dÃ­gitos, e a comparaÃ§Ã£o era lexical, onde `"10000-12-31" >= "2026-01-01"` Ã© **falso** porque `"1"` ordena antes de `"2"` (o candidato era sempre considerado passado, o laÃ§o de 200 anos rodava inteiro e devolvia `null`). DivergÃªncia sobre dado jÃ¡ gravado: o cartÃ£o de um membro real mostrava uma coisa e a coluna outra. DecisÃ£o do usuÃ¡rio entre trÃªs saÃ­das possÃ­veis: alinhar o TS ao SQL.
- **ConsequÃªncia**: `infinity` diverge de propÃ³sito â o SQL **erra** (`cannot convert infinity to integer`), o que aborta o INSERT, entÃ£o nÃ£o existe linha persistida com `infinity` e o `null` do TS Ã© a degradaÃ§Ã£o segura do mesmo evento. O gate prende o caso alcanÃ§Ã¡vel (ano de 5 dÃ­gitos), nÃ£o o inalcanÃ§Ã¡vel.
- **Janela residual â NÃO Ã UM INTERVALO** (R5, R6 e R7 documentaram por texto e **as trÃªs erraram**): `diasNoMes` pergunta o *Ãºltimo dia do mÃªs*, entÃ£o o `Date` quebra no **mÃªs** em que esse Ãºltimo dia passa do teto, nÃ£o no ano. Regra medida: `Date` vai atÃ© `+275760-09-13T00:00:00.000Z`, e no ano 275760 os meses **1..8 passam, 9..12 nÃ£o**. Do lado do Postgres, `criado_em` Ã© `timestamptz` e aceita atÃ© `294276-12-31` (o `5874897` que eu citei duas vezes Ã© o teto do `date`, que o `make_date` alcanÃ§a mas nÃ£o Ã© o gargalo). Onde divergem, o TS devolve `null` por nÃ£o poder representar a data. **NÃ£o fechÃ¡vel** sem trocar o transporte (texto civil). Por isso `probe-cartao-validade.sh` agora **mede a transiÃ§Ã£o** e `validade.ts` escreve a **regra**, nÃ£o a faixa: o gate se move se a semÃ¢ntica do `Date` mudar, o texto nÃ£o.
- **O relatÃ³rio da R7 errou os dois lados e foi medido**: ele afirma que o Postgres para em `294275-12-01` (medi: `294276-12-31 00:00:00+00` **Ã©** aceito) e que "o ano 275760 inteiro Ã© rejeitado" (sÃ³ setembro em diante). Nenhum nÃºmero de relatÃ³rio foi aceito sem refazer a mediÃ§Ã£o.
- **Display alinhado** (lacuna 4 da R6): `fmtData` exigia `\d{4}` fixo, entÃ£o o cartÃ£o imprimia `â` para `10000-12-31` â a data que a coluna **tem** por esta mesma AD. Mesma divergÃªncia sobre dado gravado, agora na display. `fmtData` aceita 4 a 6 dÃ­gitos; o round-trip em UTC continua sendo o Ãºnico que pode recusar.
- **Janela BAIXA â fechada** (R5): o laÃ§o de candidatos tinha teto fixo de **200 anos**, entÃ£o um `criado_em` mais antigo devolvia `null` enquanto o trigger jÃ¡ tinha gravado o ciclo-base â divergÃªncia sobre dado **jÃ¡ persistido**, do mesmo tipo da do ano de 5 dÃ­gitos, e fechÃ¡vel (Ã© aritmÃ©tica, nÃ£o teto de runtime). Medido: `1800-06-01` â TS `null` / SQL `1801-06-01`. O nÃºmero de passos agora Ã© derivado (`anoHoje - anoCivil + 1`, exato: o aniversÃ¡rio k tem ano `anoCivil + k`). Esta era a omissÃ£o real da AD-025: ela falava da janela alta e calava da baixa.
- **Date**: 2026-10-01
- **Status**: active

### AD-026
- **Decisão**: Exclusão de usuários admin (feature `admin-usuarios-exclusao`) é **hard delete** via `admin.auth.admin.deleteUser`, restrita a quem tem `administrar` no módulo `usuarios` (`can(papel, "usuarios", "administrar")`). São excluíveis **apenas** contas com `app_metadata.criado_por_admin === true` (marcador durável gravado por `criarUsuario`); todos os usuários pré-existentes ficam protegidos (403 `usuario_protegido`), **sem backfill**. `SUPER_ADMIN` nunca é excluível e a auto-exclusão é bloqueada. Vínculos em `transactions.created_by`, `cash_closes.created_by`, `documents.uploaded_by` e `audit_logs.autor` bloqueiam a exclusão com 409 `usuario_com_vinculos` (preserva a auditoria append-only). Sucesso = 204 + log de auditoria (`acao: "excluir"`, `entidade: "usuarios"`).
- **Reason**: Decisão do usuário em 2026-10-08. Não existe flag de origem no Auth; `force_password_change` não serve (é limpo ao trocar senha, `trocar-senha/route.ts:62`). Os FKs citados não têm `ON DELETE`, então o hard-delete falharia; anonimizar destruiria a trilha de auditoria.
- **Trade-off**: Contas já criadas (inclusive a de teste "lider") não são removíveis pela UI — exigem re-criação para herdar o marcador. Exclusão futura exige que o usuário nunca tenha vínculos (senão 409). O marcador precisa ser preservado por `editarPapel` (espelhar `app_metadata`, como `redefinirSenha` já faz).
- **Scope**: `src/lib/admin/usuarios.ts` (marcador + `excluirUsuario`), `src/app/api/admin/usuarios/[id]/route.ts` (DELETE), `src/app/admin/usuarios/page.tsx` + novo client component. Sem migration. Não altera a feature `admin-usuarios`, que mantém exclusão em Out of Scope.
- **Date**: 2026-10-08
- **Status**: active

### AD-027
- **Decisão**: Na matriz de permissões, `nivel: ""` (rótulo "—" do editor) significa **revogar**: `atualizarMatriz` faz `DELETE` da linha `(role, module)` em `permissions` e a resposta passa a ser `{ ok, updated, removed }`. Níveis válidos (`ler`/`escrever`/`administrar`) seguem upsert; valor não-vazio fora do enum segue 400 `nivel_invalido`. **Sem guarda anti-lockout** (o super admin pode revogar `usuarios:administrar` de todos os papéis) — decisão do usuário.
- **Reason**: A UI já oferecia "—" (`matrix-editor.tsx`), mas o backend rejeitava `""` com `nivel_invalido`, porque o editor envia todas as células a cada save; uma célula vazia derrubava o salvamento inteiro. `can()` já trata linha ausente como negação (`rbac.ts:101`), então deletar é a semântica correta e mínima.
- **Trade-off**: Revogar é destrutivo no backend (a linha some); a restauração usa re-upsert do nível anterior. Não há auditoria das mudanças da matriz (fica para feature futura). Risco de auto-lockout aceito conscientemente.
- **Scope**: `src/lib/admin/permissoes.ts` (ramo de delete + `removed`), `src/app/admin/usuarios/permissoes/matrix-editor.tsx` (feedback), `scripts/probes-admin-usuarios.sh` (USRREV-01..06). Sem migration.
- **Date**: 2026-10-09
- **Status**: active

### AD-028
- **Decisão**: A feature `landing-visual-hero` está **cancelada**. As specs (`spec.md`, `design.md`, `tasks.md`) permanecem no repositório apenas como registro histórico e **não serão executadas nem verificadas**. A estilização da landing/hero e do painel foi resolvida manualmente pelo usuário, fora do fluxo SDD.
- **Reason**: O escopo da feature era a remodelagem visual da landing/hero; o usuário concluiu os ajustes por conta própria (2026-10-10), tornando-a sem trabalho pendente.
- **Trade-off**: O ajuste visual passa a viver no histórico de commits de estilo, sem spec/verificação associada (fora da rastreabilidade RF→spec→teste). Aceito pelo usuário.
- **Scope**: `.specs/features/landing-visual-hero/` (congelado, sem código novo); `docs/ROADMAP.md` e `docs/coverage-matrix.md` não ganham linha.
- **Date**: 2026-10-10
- **Status**: active

### AD-029
- **Decisão**: Os probes **sem dependência externa** (`scripts/probe-barcode.sh` e `scripts/probes-admin-auditoria.sh` — compilam módulos puros e os executam em Node com stubs, sem servidor/Docker/DB) entram no **CI**, como passos do job `tests` depois do `build` (`npm run probe:barcode`, `npm run probe:admin-auditoria`). Os probes com Docker/DB (cartao `--com-db`, `probe:cartao:db`) e os de servidor autenticado permanecem **locais**, pela regra do AD-018 (evitar CI dependente de Docker e ordem de merge).
- **Reason**: Ref. AD-018, pendência (a) — probes de uma feature fora do CI apodreciam em silêncio; a aplicação da regra dos sem-Docker adiciona evidência executável ao pipeline sem puxar Docker para dentro do CI.
- **Trade-off**: CI passa a depender de `npx tsc` compilar os módulos com alias `@/` não resolvido (emite apesar do TS2307) — aceito; a cobertura com Docker/DB e o e2e autenticado continuam só locais.
- **Scope**: `.github/workflows/ci.yml`, `package.json` (scripts `probe:barcode`, `probe:admin-auditoria`).
- **Date**: 2026-10-10
- **Status**: active

### AD-030
- **Decisão**: A partir da F10 (QA-001), o **framework de testes automatizados do projeto é Vitest** (`vitest@^5`, ambiente `node` para módulos puros, alias `@/*` via `vite-tsconfig-paths`), com scripts `test` (watch), `test:ci` (`vitest run`, usado no CI) e `test:mutate` (Stryker). **Stryker** (`@stryker-mutator/core` + `vitest-runner`, threshold high/low/break = 100 → 0 mutantes sobreviventes no subset) é o PIT contínuo da F10.
- **Reason**: QA-001 marcava o framework para a F10; decisões do usuário em 2026-10-10 (Vitest; piloto de domínio puro; Stryker no subconjunto migrado). Os ~16 probes bash (integração/SSR/DB) permanecem como estão; Vitest é a camada nova.
- **Trade-off**: Duplicação transitória bash+Vitest no domínio no início; fases seguintes migram o restante por camada. Vitest 5 exige Node ^22.12 (temos 22.23.2).
- **Scope**: `.specs/features/framework-testes/`, `vitest.config.ts`, `stryker.config.json`, suítes em `src/**/*.test.ts`, scripts `package.json`, step no CI job `tests`.
- **Date**: 2026-10-10
- **Status**: active

### AD-031
- **Decisão**: Os **probes bash permanecem no CI** (jobs `tests`/`cartao` intactos) mesmo após a migração do domínio para Vitest; o Vitest é camada **aditiva** de domínio, não substitutiva nesta fase. A remoção das tiers duplicadas (ex.: tier `node -e` do `probe-barcode.sh`, tier `--domain` do `probe-cartao-validade.sh`) fica para fase futura, quando a equivalência for atestada por rodadas.
- **Reason**: As tiers de integração/SSR/DB dos probes não têm equivalente no piloto — removê-las do CI perderia cobertura real. A duplicação custa ~4s de `npx tsc` por execução, custo aceito.
- **Trade-off**: Contagem de asserções do probe original permanece como gate (fonte histórica do Verifier); suíte Vitest precisa igualar/exceder por módulo (FWT-08). Divergência pontual da linha "CI não roda duplicado" do spec (registrada no design).
- **Scope**: CI `.github/workflows/ci.yml`; não altera probes nesse commit.
- **Date**: 2026-10-10
- **Status**: active

### AD-032
- **Decisão**: Manter `scripts/patch-stryker-vitest5.mjs` (invocado por `"postinstall"`) para corrigir o `@stryker-mutator/vitest-runner@10.0.0` sob Vitest 5: `collectTestName` monta o nome com `' '` em vez de `' > '`, então o filtro por-teste não casa e mutantes cobertos rodam 0 testes. O patch reescreve `nameParts.join(' ')` → `join(' > ')` em `dist/src/test-helpers.js` e `dist/src/stryker-setup.js` (idempotente), fazendo o run completo (~40s) e a discriminação por mutante funcionarem. O gate de mutação é **`break: 100`** e os **28 mutantes equivalentes/artefatos de carga** são anotados inline com `// Stryker disable next-line <Mutator>` (motivo em comentário); os **3 killables** são mortos por asserção. Resultado: **100.00% / 0 sobreviventes**, exit 0.
- **Reason**: Bug upstream (#6210; fix #6214 não publicado). Sem o patch, mutantes cobertos "sobrevivem" por 0 testes executados (score falso). O usuário rejeitou o encerramento com `break:0` (fuga nunca falhava) e exigiu **0 sobreviventes por mérito, sem enfraquecer testes**.
- **Trade-off**: `postinstall` roda um passo extra (inócuo se o upstream corrigir — o patch é idempotente e sai limpo quando o alvo já está corrigido). Anotações inline acoplam o código às mutações, mas cada uma é justificada em comentário e reversível.
- **Scope**: `scripts/patch-stryker-vitest5.mjs`, `"postinstall"` em `package.json`, `stryker.config.json` (`break:100`), diretivas inline em `src/lib/{painel,cartao,validade,documento}.ts` + `src/lib/pix.ts`, testes-matadores em `src/lib/painel/*.test.ts`.
- **Date**: 2026-10-10
- **Status**: active

### AD-033
- **Decisão**: Observabilidade (F11) = **Sentry manual errors-only** (`@sentry/nextjs`, inits `sentry.server/edge.config.ts` + `instrumentation-client.ts` + `src/instrumentation.ts` com `onRequestError`, sem wizard e sem `withSentryConfig` nesta fase) + convenção **`src/lib/observability/`** (`release.ts` fonte única do release, `logger.ts` JSON com sanitize PII recursivo + `reportError`, `sentry-options.ts` fábrica errors-only com `beforeSend`) + `GET /api/health` público e raso. DSN só em `.env.local` (gitignorado); sem DSN = NOOP. Tracing/replay desligados (quota free); Analytics na F12.
- **Reason**: Setup manual é mínimo, auditável e reversível; wrapper de build sem authToken agregava pouco para errors-only. Logger próprio porque `console.*` ad-hoc não garante anti-PII nem formato para os function logs.
- **Trade-off**: Sem upload de sourcemaps (sem authToken no repo) e sem túnel anti-adblock — reavaliar na F12 com URL de produção.
- **Scope**: Captura de erros server/client, health, logs; adoção mínima validada no webhook MP; demais rotas adotam o helper como evolução.
- **Date**: 2026-10-12
- **Status**: active

## Handoff — responsivo mobile slices pós-F12 (2026-10-13, em lote p/ push)

- **Entregue (commits locais, sem push até aqui)**: landing Parte 1 fechada e VERIFIED (`responsivo-mobile-landing`, RSP-01..12); fixes/bugfixes no caminho: foto do líder (cache-buster), Excluir evento (soft CONCLUIDO) + wipe dos exemplos no dev, validador de status EM ABERTO/CONCLUIDO, rename `church.mission`→`church.proposito` (migration 0025); slices admin: financeiro (filtros/tabela/datas), eventos (scroll-x), membros (busca/tabela), tabelas compactas + scroll estilizado (`tabela-scroll`), upload relatórios, drawer mobile hero-lite-admin.
- **Pendente de**: push em lote + CI + deploy (aval do operador em 2026-10-13) e frames finais no mobile pós-deploy.

## Handoff — feature responsivo-mobile-landing (Parte 1) — ✅ VERIFIED (2026-10-13)

- **Estado**: Spec → Tasks (4+1) → Execute → Verifier **PASS**. Feature **fechada**. `validation.md` (PASS) em `.specs/features/responsivo-mobile-landing/`. Slice 1/2 da responsividade (admin vem em slice futura).
- **Entregue**: 10 componentes da landing mobile-first aditivos (base menor + `sm:`/`lg:` restaurando ≥1024 idêntico); 2-col base nos grids + compactação (calibragem T5 do operador); 3 stales corrigidos (`text-1xl`, `md:text-1xl`, `text-landing-600`); zero texto/cor/fonte alterados.
- **Verificação**: Verifier independente, range `0e28cda..HEAD`; **12/12 ACs (RSP-01..12)**; sensor 0 mortos automatizados + 3 operator-covered (estilização pura, sem dente automatizado por construção); aceite visual do operador em 360px/320px.
- **Commits**: `b7c9dfa` (T1) → `5e950e5` (T2) → `c0f6ce3` (T3) → `d9a2976` (T4) → `3fb56f7` (T5) + este fechamento. Nada pushed.
- **Feature**: `.specs/features/responsivo-mobile-landing/spec.md` — 12 ACs Verified.

## Handoff — feature deploy-producao (Fase 12) — ✅ VERIFIED (2026-10-13)

- **Estado**: Spec → Design → Tasks (7 tasks) → Execute (com 2 pausas de operador: criar Supabase, importar Vercel) → Verifier **PASS de primeira**. Feature **fechada**. `validation.md` (PASS) em `.specs/features/deploy-producao/`. F12 (RNF-009/010, RC-003) concluída.
- **Entregue**: push total (história preservada) + CI verde; Supabase prod `[REDACTED_PROJECT_REF]` (19 migrations seletivas, zero demo/teste, textos alinhados); seed `admin@example.com` SUPER_ADMIN; Vercel `software-ivc` → `[REDACTED_DEPLOYMENT_URL]`; Analytics; fumaça 9/9; `DEPLOYMENT.md` fiel.
- **Verificação**: Verifier independente, range `d424fba..HEAD`; **15/15 ACs (DEP-01..15)**; sensor **4/4 mortos**. CI verde e release Sentry/pageviews confirmados pelo operador.
- **Commits**: `2c7d91b` (T1) → `b025d65` (mission) → `d435cb4` (landing) → `7ffbc9a`/`4fb6a15` (CI) → `df74970` (status) → `4f4a02f` (fallback) → `0333087` (email) → `558b62b` (smoke-fix) → `2603bff` (T6) → `147db9b` (T7) + este fechamento. Nada pushed após este.
- **Decisões**: nenhuma AD nova (usa AD-007/009/013/033). Identidade de commits corrigida para `author@example.com` (`AGENTS.md`).
- **Feature**: `.specs/features/deploy-producao/spec.md` — 15 ACs Verified. Gates: spec 0/0, tasks 0 erros.
- **Pendente do operador**: regra de alerta Sentry (passo no runbook F11) + trocar a senha temporária do superadmin (exigida no 1º login).

## Handoff — feature observabilidade (Fase 11) — ✅ VERIFIED (2026-10-12)

- **Estado**: Spec → Design → Tasks (7 tasks) → Execute → Verifier R1 FAIL (12/13, 1 sobrevivente) → hardening T8/T9 → Verifier R2 **PASS**. Feature **fechada**. `validation.md` (PASS) em `.specs/features/observabilidade/`. F11 (RNF-008) concluída.
- **Entregue**: `@sentry/nextjs@11.7.0` errors-only nos 3 runtimes (NOOP sem DSN) + `global-error.tsx` + `src/lib/observability/` (release/logger/reportError/sentry-options) + `GET /api/health` público e raso + webhook MP no logger + `docs/OBSERVABILITY.md` F11 ativa com runbook de alerta. Gates: `test:ci` **243/0**, `probe-observabilidade.sh` **13/0**, FIN 94 ok / 5 falhas pré-existentes do dashboard (restyle, não atribuíveis).
- **Verificação**: Verifier independente (autor ≠ verificador), range `23e99a3..fe60ea9`; **13/13 ACs (OBS-01..13)** com evidência `file:line`; sensor R2 **2/2 mortos**; chegada do evento `[prova-obs-f11]` **confirmada pelo operador no dashboard** em 2026-10-12. R1 honesto: teste novo da T9 pegou bug real (`reportError` propagava falha de envio).
- **Commits**: `3a5ff34` (T1 dep) → `4aaf79c` (T2 logger) → `b42f7bb` (T3 inits) → `246d317` (T4 boundary) → `9f5bf46` (T5 health) → `785766a` (T6 webhook) → `458088a` (T7 docs+prova) → `06a6b41` (T8 tier) → `fe60ea9` (T9 edge) + este fechamento. Nada pushed.
- **Decisões**: AD-033 (Sentry manual errors-only + convenção `src/lib/observability/`). Lições **L-019** (amarrar call sites da adoção) e **L-020** (greps de probe fora de comentários) como candidatas.
- **Feature**: `.specs/features/observabilidade/spec.md` — 13 ACs `OBS-01..13` Verified. `validate_spec.py` 0 erros / 0 warnings; `validate_tasks.py` 0 erros / 5 warnings (confirmados).
- **Pendente do operador**: criar o projeto já existe; falta a **regra de alerta no dashboard** (passo no runbook) + informar o **e-mail da liderança**; **Analytics** entra na F12 com URL de produção.

## Handoff — feature framework-testes — ✅ VERIFIED (2026-10-10)

- **Estado**: Spec → Execute (7 batches por sub-agente) → hardening do gate de mutação → **Verifier PASS**. Feature **fechada**. `validation.md` (PASS) em `.specs/features/framework-testes/`. F10 (QA-001) concluída.
- **Entregue**: Vitest 5 + `vite-tsconfig-paths` cobrindo o domínio puro (`code128`, `validade`, `cartao`, `documento`, `pix` + smoke de alias) — `npm run test:ci` → **220 passed / 0 failed**; **StrykerJS** (`@stryker-mutator/vitest-runner`) no subset migrado — `npm run test:mutate` → **100.00% / 0 sobreviventes** com **`break:100`** (falha real em fuga). Step `npm run test:ci` adicionado ao job `tests` do CI (diff aditivo; probes intactos — AD-031).
- **Verificação**: Verifier independente (autor ≠ verificador), range `5ada1c4..f3bdd90`; **12/12 ACs (FWT-01..12)** com evidência `file:line`; sensor em `git worktree` isolado → **5/5 mutantes mortos** (28/02 clamp, `FUSO_CIVIL`→UTC, CRC poly, `fmtData` drop-`$`, `colunasDocumento` `||`→`??`); real tree intacta. FWT-08 recôntagem independente: validade+cartao+documento = **225 ≥ 199**, code128 = 30 na base executada, pix = 30 (ad-hoc).
- **Hardening (R desta feature)**: o worker fechou T7 com `break:0` (gate verde por construção, nunca falhava) e 31 sobreviventes — **rejeitado**; exigiu-se **0 sobreviventes por mérito**: 3 killables mortos por asserção nova + 28 mutantes equivalentes/artefatos de carga anotados inline (`// Stryker disable next-line`, motivo em comentário) e `break:100`. O Verifier provou a barreira reabilitando um mutante → score 99.81 e exit 1.
- **Commits**: `73dc279` (T1 infra) … `ec4da7c` (T7 stryker) → `7119ce6` (T7 hardening: zera sobreviventes + `break:100`) → `f3bdd90` (T8 CI+docs) + este fechamento (T9: validation/traceability/STATE/ROADMAP/LESSONS). Nada pushed.
- **Descoberta técnica**: `@stryker-mutator/vitest-runner@10.0.0` tem bug com Vitest 5 (upstream #6210; fix #6214 não publicado) — `collectTestName` junta com `' '` em vez de `' > '`, o filtro por-teste não casa e mutantes cobertos rodam 0 testes. Corrigido por `scripts/patch-stryker-vitest5.mjs` reaplicado no `postinstall` (AD-032).
- **Decisões**: AD-030 (Vitest+Stryker = framework padrão da F10), AD-031 (probes bash permanecem no CI; Vitest aditivo), AD-032 (patch do vitest-runner + `break:100` + anotações inline). Lição **L-018** (threshold que não pode falhar não é gate).
- **Feature**: `.specs/features/framework-testes/spec.md` — 12 ACs `FWT-01..12` Verified. `validate_spec.py` 0 erros / 0 warnings; `validate_tasks.py` 0 erros / 8 warnings.

## Handoff — feature admin-auditoria — ✅ VERIFIED (2026-10-10)

- **Estado**: Execute → hardening pós-Verifier (2 voltas) → **re-verificação PASS**. Feature **fechada**. `validation.md` (PASS, substitui o relatório obsoleto de 2026-09-17) em `.specs/features/admin-auditoria/`. Probes `scripts/probes-admin-auditoria.sh` → **74 ok / 0 falhas** (`npm run probe:admin-auditoria`, ligado ao CI).
- **Verificação**: Verifier independente (autor ≠ verificador), range `661824f..HEAD`; **18/18 ACs (AUD-01..18) + 4 edge cases** com asserção discriminante; sensor **17/17 mutantes mortos** (service: insert removido, NULLs fixados, gte→gt, data_fim não-inclusiva, filtros swap/drop, limit 20→50, range off-by-one, guard RBAC desligado, instrumentação import-only; route: comparação de datas invertida, status 400→200, clamps de limit/offset removidos).
- **Rodadas**: 1ª verificação FAIL (12 gaps, 2/12 mortos) → 2ª verificação FAIL (3 sobreviventes na route layer) → harness route GET/POST com stubs → **PASS**. Dentro do limite de 3 ciclos.
- **Commits**: `661824f`..`4a5c37f` (feature) + hardening `ed2c626`, `cb2ac27` (harness service c/ stub Supabase), `c82b26c` (harness route GET/POST), `a518f1b` (aresta T14→T15 no grafo), `a16daf3` (CI). Nada pushed.
- **Descoberta técnica**: `extrairInfoRequest`/`registrarAuditoria`/`listarAuditoria` usam `createServerClient()` direto (não injetável) → o probe patcha `Module._resolveFilename` para um stub que grava as ops do builder e executa o service e o route handler compilados (`tsc` emite apesar do TS2307 do alias).
- **Feature**: `.specs/features/admin-auditoria/spec.md` — 18 ACs `AUD-01..18` Verified. `validate_tasks.py` 0 erros.

## Handoff — feature barcode-membro — ✅ VERIFIED (2026-10-10)

- **Estado**: Execute → hardening pós-Verifier (2 voltas) → **Verifier PASS**. Feature **fechada**. `validation.md` (PASS) em `.specs/features/barcode-membro/`. Probe `scripts/probe-barcode.sh` → **7 ok / 0 falhas** (`npm run probe:barcode`, ligado ao CI).
- **Verificação**: Verifier independente (autor ≠ verificador), range `88e3b11~1..HEAD`; **5/5 ACs (BRC-01..05) + 2/2 edge cases** com asserção discriminante; sensor **5/5 mutantes mortos** (re-throw no catch, orientação barra/espaço invertida, payload fixo, gradiente reintroduzido, texto humano removido). Checksum de `IVC-0001` re-computado independentemente (=10).
- **Rodadas**: 1ª verificação FAIL (4 mutantes sobreviventes: payload M8/M9, orientação M7, gradiente M10; edge 1/2; probe fora do CI) → endurecimento → 2ª verificação FAIL (1 sobrevivente: degradação token-only) → tier SSR de render → **PASS**. Dentro do limite de 3 ciclos.
- **Commits**: `88e3b11` (feat), `65dda82` (probe BRC-04), `39d45bc` (hardening), `54fdaa5` (tier SSR), `a16daf3` (CI). Nada pushed.
- **Descoberta técnica**: `CardBackground` usa `linear-gradient`/`repeating-linear-gradient` legitimamente → anti-gradiente escopado ao corpo de `Code128Barcode` (linhas 8–35 do `MemberCard.tsx`). O componente agora é compilado tsx→commonjs e renderizado via `react-dom/server` com stubs (next/image, constants) para atestar a degradação (RangeError/matrícula ausente → rótulo "indisponível" sem crash).
- **Feature**: `.specs/features/barcode-membro/spec.md` — 5 ACs `BRC-01..05` Verified.

## Handoff — feature admin-usuarios-matriz-revogar — ✅ VERIFIED (2026-10-09)

- **Estado**: Spec → Execute → **Verifier PASS**. Feature fechada. `validation.md` (PASS) em `.specs/features/admin-usuarios-matriz-revogar/`. Probes `scripts/probes-admin-usuarios.sh` → **51 ok / 0 falhas**.
- **Verificação**: Verifier independente (autor ≠ verificador), range `159a526..0df16ee`; 6/6 ACs `USRREV-01..06` com asserção discriminante; sensor **4/4 mutantes mortos** (delete no-op, `removed` fixo 0, `=== " "` reintroduz o bug, nível inválido aceito). Matriz restaurada (`SECRETARIA:igrejas = ler`).
- **Commits**: `1b13d7c` (feat service+UI+spec), `0df16ee` (probes) + commit de validação/coverage/STATE/LESSONS. Nada pushed.
- **Gaps residuais (não-bloqueantes, em `validation.md` e LESSONS L-014..L-017)**: corpo completo de USRREV-01 (`ok:true`), corpo `nao_autorizado` de USRREV-05 e rótulo "—" de USRREV-06 não assertados; 3 edge cases (no-op `removed=0`, payload misto, enum inválido role/módulo) sem probe.
- **Feature**: `.specs/features/admin-usuarios-matriz-revogar/spec.md` — 6 ACs Verified.
- **Decisão**: AD-027 (revogar = delete da linha; sem guarda anti-lockout).
- **Sintoma original**: usuário não conseguia zerar células da matriz — salvamento retornava `nivel_invalido`.
- **Incidente operacional**: durante a limpeza do sensor, um `pkill` derrubou o servidor `:3000`; foi reiniciado (`next start`) e revalidado.

## Handoff — feature admin-usuarios-exclusao — ✅ VERIFIED (2026-10-09)

- **Estado**: Spec → Design → Tasks → Execute (T1–T7) → hardening pós-Verifier (T8–T11) → **re-verificação PASS**. Feature **fechada**. `validation.md` (PASS) em `.specs/features/admin-usuarios-exclusao/`. Probes: `scripts/probes-admin-usuarios.sh` → **43 ok / 0 falhas**.
- **Verificação**: Verifier independente (autor ≠ verificador), range `159a526..5fc76ed`; 17/17 ACs com asserção discriminante; sensor re-executou os 4 mutantes antes sobreviventes → **4/4 mortos** (M5 auditoria, M6 404, M7 SUPER_ADMIN, M8 `deletable`).
- **Commits**: `1459cc6`, `8aa1785`, `6e99537`, `498e2ab`, `8d98397`, `50cfdc3` (T1–T6), `b53c14a` (T7 docs), `008159d`, `76b429d`, `be2f82e`, `d357f90` (T8–T11), `5fc76ed` (docs pós-hardening) + commit de validação/LESSONS. Nada pushed.
- **Gaps residuais (não-bloqueantes, registados em `validation.md` e LESSONS L-014/L-015)**: corpo dos 401/403 (USREX-08/09) e classe/label "red" do botão (USREX-13) não assertados; 3 edge cases com código correto sem probe (self+SUPER_ADMIN, lista vazia, `deleteUser`-failure→500); nuance de cache frio pós-build no assert de HTML.
- **Feature**: `.specs/features/admin-usuarios-exclusao/` — 17 ACs `USREX-01..17` Verified; design em `design.md`.
- **Decisão**: AD-026 (hard delete só de contas criadas pelo painel; 403 auto/SUPER/sistema; 409 vínculos; 204 + auditoria).
- **Descobertas operacionais**: probes autenticados exigem **cookie jar** (`curl -c/-b <arquivo>`), token inline dá 401 espúrio; rodar gate com **servidor de produção** (`npm run build && npm run start`) evita o `.next/dev/types` do `next dev` quebrar o `tsc`; o seed `superadmin.teste@ivc.local` (`…000c`) existe e é o alvo do 403 SUPER_ADMIN.
- **Árvore suja pré-existente** (não tocar): `next-env.d.ts`, `src/components/MemberCard.tsx`, `src/app/admin/membros/[id]/cartao/page.tsx`, `tsconfig.tsbuildinfo`.
- **Pendências herdadas**: `docs/coverage-matrix.md` sem linha para `barcode-membro` e `admin-auditoria`.
## Handoff — feature cartao-valididade-anual — ✅ VERIFIED (2026-10-04)

- **Estado**: verificação PASS (R12). `validation.md` (PASS) em `.specs/features/cartao-valididade-anual/`. Gates locais verdes (typecheck/lint/build, probes cartao/domain/com-db, 6 fusos).
- **Verificação**: Verifier independente; 16 ACs CART-01..16 cobertos; sensor executado em worktree isolado.
- **Migration**: `0024_validade_cartao.sql` aplicada no dev.
- **Feature**: ✅ VERIFIED.
- **Lacuna não-bloqueante**: caminho de produção real sem deps não atestado (Supabase real).
- **Pendência de superfície**: política de git push.



> **NOTA (2026-10-10)**: o bloco `PAUSA` de `cartao-valididade-anual` abaixo foi **superado**
> em 2026-10-04 pela R12 — a feature esta VERIFIED (handoff acima). Removido no housekeeping;
> historico completo preservado em `git log`.

---

## Handoff â feature cartao-valididade-anual â a P0 da R10 fechada (2026-10-01)

- **Estado**: implementaÃ§Ã£o completa, gates locais verdes, **ainda sem veredito PASS**. A R10 foi FAIL com **16/16 ACs casando**; a lacuna P0 e as P3 foram corrigidas e falta re-verificaÃ§Ã£o. `validation.md` Ã© do Verifier â nÃ£o versionado, nÃ£o editado pelo autor.
- **Onde o cÃ³digo para**: Ãºltimo commit que toca `src/`, `scripts/` ou `supabase/` Ã© **`ea9c280`**. Branch `main`, **nada pushed**. `git rev-list --count aeda946..HEAD` = 29.
- **A P0, e por que doeu ler.** Trocar `process.exit(1)` por `console.log(TOKEN)` no `catch` da tier fazia a tier **certificar o prÃ³prio sucesso**: ela imprimia o token sem rodar uma Ãºnica asserÃ§Ã£o. Combinado com um mutante de produÃ§Ã£o, trÃªs mutantes que morrem com o harness intacto (rollback do auth removido, "auth nunca criado", verbo `insert`â`update`) viravam verdes. **O token sozinho Ã© barato demais para provar que a tier rodou atÃ© o fim.** Agora o `catch` deixa **veneno** antes de qualquer `exit`, e o shell rejeita o veneno **com ou sem token**. Um `node` que sai por qualquer caminho que nÃ£o seja "todas as asserÃ§Ãµes passaram" leva o corpo inteiro para trÃ¡s. Medido: a mutaÃ§Ã£o exata da R10, combinada com mutante de produÃ§Ã£o, agora morre.
- **P3 fechadas**:
  - **round-trip de ano** sem atestado em `fmtData` e `normalizarDataBatismo`. `02-30` pega pelo dia e `13-01` pelo mÃªs, entÃ£o nenhuma das duas comparaÃ§Ãµes revela a falta do ano. Witness: **ano zero** â `Date.UTC(0, â¦)` devolve 1900. Registrada tambÃ©m a janela **0000â0099 superestrita**: superestrita e documentada, nÃ£o "corrigida", porque mudar isso Ã© comportamento de produÃ§Ã£o para caso inalcanÃ§Ã¡vel.
  - **filtro de formato** nÃ£o segurava ano de 3 dÃ­gitos â `Date.UTC(999, â¦)` devolve 999, entÃ£o `999-12-31` passava pelo filtro *e* pelo round-trip e o cartÃ£o imprimiria `31/12/999`.
  - **relÃ³gio do `MemberCard`** nÃ£o atestado: `new Date(2030, 0, 1)` passava. Congelar a data Ã© o jeito mais barato de todo mundo ver a validade errada. NÃ£o dÃ¡ para executar JSX no probe, entÃ£o Ã© atestado em texto â e por isso exige `new Date()` **cru**, sem argumentos que sejam data fixa.
  - **os dois formatos, explicitados**: data de batismo Ã© digitada, `YYYY-MM-DD` (4 dÃ­gitos); `validade_cartao` Ã© **derivada** de `criado_em` e precisa de 4â6, senÃ£o `10000-12-31` sai da trigger e o cartÃ£o mostra `â` para uma data que a coluna tem (AD-025).
- **AD-023 fechado para esta feature.** A barreira de valor era a Ãºnica evidÃªncia executÃ¡vel do projeto e vivia **fora do CI** â foi isso que deixou a P0 apodrecer em silÃªncio. Agora: job `cartao` com domÃ­nio, Postgres efÃªmero, matriz de 4 fusos e checagem de volume vazado; scripts `probe:cartao` e `probe:cartao:db`.
- **MutaÃ§Ã£o medida neste HEAD** (worktree isolado, removido): P0a (a mutaÃ§Ã£o exata da R10) morre; P0b (veneno mascarado) morre; P0c (tier emitindo veneno) morre; P3a/P3b (fora a comparaÃ§Ã£o de ano) morrem; P3c/P3d (filtro de formato) morrem; P3e (relÃ³gio congelado) morre; P3f (relÃ³gio virando a prÃ³pria data) morre no compilador.
- **O que AINDA nÃ£o Ã© coberto, e Ã© decisÃ£o de quem mantÃ©m** (declarado pelo autor; a R10 classificou a P1 como fora de CART-01..16, pertencente a ADMINMEM-07..12): o **caminho de produÃ§Ã£o sem `deps` injetado**. O probe sempre injeta fake, entÃ£o `createServerClient`, `createAdminClient` e `auth.admin.createUser` reais nÃ£o sÃ£o atestados por execuÃ§Ã£o, nem o comportamento sob falha de rede do Supabase. Fechar exigiria Supabase real em container.
- **Gates medidos neste HEAD**: typecheck sem erros; lint 0 erros / 5 warnings prÃ©-existentes; build verde; probe **37 ok / 0**; `--com-db` **38 ok / 0** (**24 ok / 0** Postgres); TZ `UTC`, `Asia/Tokyo`, `Pacific/Kiritimati`, `Europe/Lisbon` **4 ok / 0** cada; **0 volumes vazados**.
- **Rodadas**: R1..R10, todas FAIL. R5..R10 sÃ£o exceÃ§Ãµes do usuÃ¡rio acima do limite de 3 ciclos.
- **DB**: migration `0024_validade_cartao.sql` aplicada no dev `[REDACTED_PROJECT_REF]`. **NÃ£o reaplicar nem escrever remotamente.**
- **PendÃªncias de superfÃ­cie, nÃ£o AC**: polÃ­tica de `git push`.
- **PendÃªncia de documentaÃ§Ã£o**: `docs/coverage-matrix.md` sem linha para esta feature. `barcode-membro` e `admin-auditoria` tambÃ©m â lacuna **prÃ©-existente**, corrigir as trÃªs juntas.

