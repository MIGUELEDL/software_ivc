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

## Handoff — feature admin-usuarios-matriz-revogar — Execute concluída, aguardando Verifier (2026-10-09)

- **Estado**: Spec escrita e validada (`validate_spec` 0/0); implementação feita (service + UI + probes) com gate verde: `lint`/`typecheck`/`build` exit 0 e probes `scripts/probes-admin-usuarios.sh` → **51 ok / 0 falhas** (USRREV-01..06 cobertos, incluindo round-trip revogar→403→restaurar→200).
- **Próximo passo**: Verifier independente (autor ≠ verificador) sobre o range da feature; se PASS, commitar `validation.md` e fechar.
- **Feature**: `.specs/features/admin-usuarios-matriz-revogar/spec.md` — 6 ACs `USRREV-01..06`.
- **Decisão**: AD-027 (revogar = delete da linha; sem guarda anti-lockout).
- **Sintoma original**: usuário não conseguia zerar células da matriz — salvamento retornava `nivel_invalido`.

## Handoff — feature admin-usuarios-exclusao — ✅ VERIFIED (2026-10-09)

- **Estado**: Spec → Design → Tasks → Execute (T1–T7) → hardening pós-Verifier (T8–T11) → **re-verificação PASS**. Feature **fechada**. `validation.md` (PASS) em `.specs/features/admin-usuarios-exclusao/`. Probes: `scripts/probes-admin-usuarios.sh` → **43 ok / 0 falhas**.
- **Verificação**: Verifier independente (autor ≠ verificador), range `159a526..5fc76ed`; 17/17 ACs com asserção discriminante; sensor re-executou os 4 mutantes antes sobreviventes → **4/4 mortos** (M5 auditoria, M6 404, M7 SUPER_ADMIN, M8 `deletable`).
- **Commits**: `1459cc6`, `8aa1785`, `6e99537`, `498e2ab`, `8d98397`, `50cfdc3` (T1–T6), `b53c14a` (T7 docs), `008159d`, `76b429d`, `be2f82e`, `d357f90` (T8–T11), `5fc76ed` (docs pós-hardening) + commit de validação/LESSONS. Nada pushed.
- **Gaps residuais (não-bloqueantes, registados em `validation.md` e LESSONS L-014/L-015)**: corpo dos 401/403 (USREX-08/09) e classe/label "red" do botão (USREX-13) não assertados; 3 edge cases com código correto sem probe (self+SUPER_ADMIN, lista vazia, `deleteUser`-failure→500); nuance de cache frio pós-build no assert de HTML.
- **Feature**: `.specs/features/admin-usuarios-exclusao/` — 17 ACs `USREX-01..17` Verified; design em `design.md`.
- **Decisão**: AD-026 (hard delete só de contas criadas pelo painel; 403 auto/SUPER/sistema; 409 vínculos; 204 + auditoria).
- **Descobertas operacionais**: probes autenticados exigem **cookie jar** (`curl -c/-b <arquivo>`), token inline dá 401 espúrio; rodar gate com **servidor de produção** (`npm run build && npm run start`) evita o `.next/dev/types` do `next dev` quebrar o `tsc`; o seed `superadmin.teste@ivc.local` (`…000c`) existe e é o alvo do 403 SUPER_ADMIN.
- **Árvore suja pré-existente** (não tocar): `next-env.d.ts`, `src/components/MemberCard.tsx`, `src/app/admin/membros/[id]/cartao/page.tsx`, `tsconfig.tsbuildinfo`.
- **Pendências herdadas**: cartão-valididade-anual aguarda R12 (handoff abaixo); `docs/coverage-matrix.md` sem linha para `barcode-membro`, `admin-auditoria` e `cartao-valididade-anual`.

## Handoff â PAUSA a pedido do usuario â cartao-valididade-anual (2026-10-04)

**Trabalho pausado por ordem do usuario. Retomar dqui.**

- **Estado**: as quatro lacunas da R11 estao **corrigidas e commitadas**, gates
  locais verdes, **ainda sem veredito PASS**. A proxima acao e a **R12**.
- **HEAD** = `bffe6c8`. Branch `main`, **nada pushed**. Commits desta sessao:
  - `fbd319a` â remove a asseveracao duplicada do ano zero
  - `7c0c566` â fecha as quatro lacunas da R11 (barreiras 1 e 2, fronteira do
    dia civil, guard de apostrofo)
  - `bffe6c8` â CI: `permissions`, fuso da igreja na matriz, `validate_tasks`
- **O que falta, em ordem**:
  1. **R12** â o Verifier independente reconcilia os 16 ACs e roda o sensor de
     mutacao contra `7c0c566`/`bffe6c8`. **Precisa de autorizacao explicita do
     usuario** (as R5..R11 ja sao excecoes do limite de 3 ciclos).
  2. Se PASS: `docs/coverage-matrix.md` ganha a linha da feature, junto com
     `barcode-membro` e `admin-auditoria` (lacuna pre-existente).
  3. So depois: `landing-visual-hero`, cujas specs existem e nunca comecaram.
- **Como retomar a R12**: despachar `tlc-verifier` com o estado acima. Medir
  de novo, sem confiar em numero nenhum deste arquivo: typecheck, lint (0 erros
  / 5 warnings), build, `probe:cartao` (37/0), `--domain` (4/0), `--com-db`
  (38/0, Postgres 24/0), os **6** fusos (4/0 cada), `validate_spec`,
  `validate_tasks`, 0 volumes dangling. Sensor com numeros concretos e a
  divisao probe/compilador/equivalente; nenhum "N" no lugar de contagem. E o
  veredito tem de estar **na primeira linha do `validation.md`** — a R11 gastou uma sessao inteira anunciando PASS no chat sem nunca gravar o arquivo,
 Wasteu uma sessao inteira anunciando PASS no chat sem nunca gravar o arquivo,
  e so o `validate_state.py` pegou.
- **Lacuna de escopo, declarada e nao bloqueante** (a R11 confirmou): o caminho
  de producao **sem `deps` injetado** nunca e executado pelo probe â
  `createServerClient`, `createAdminClient` e `auth.admin.createUser` reais, e
  o comportamento sob falha de rede do Supabase. Pertence a ADMINMEM-07..12,
  fora de CART-01..16. Fechar exigiria Supabase real em container.
- **DB**: migration `0024_validade_cartao.sql` aplicada no dev
  `[REDACTED_PROJECT_REF]`. **Nao reaplicar nem escrever remotamente.**
- **Pendencia de superficie, nao AC**: politica de `git push`.

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

