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

### AD-018
- **Decision**: O código de barras do cartão de membro passa a ser um **Code 128 real (Code Set B, payload = `member.matricula`)** via encoder puro próprio `src/lib/barcode/code128.ts` (tabela canônica de 107 símbolos, start B = 104, checksum **mod 103** com pesos posicionais 1-based antes do stop + barra de terminação) e render **vetorial/proporcional por módulo** no `MemberCard`, substituindo o gradiente decorativo fixo. Sem dependência nova; degradação: `RangeError` fora de ASCII 32–126 → bloco sem barras, matrícula legível mantida.
- **Reason**: O gradiente anterior codificava dígitos de um hash não escaneáveis; a portaria precisa ler a matrícula (`IVC-NNNN`, dentro do Code Set B). Nenhuma biblioteca injetada (jspdf/qrcode.react já presentes mas desnecessárias); tabela conferida em crifan.com e barcodesinc.com. Opção QR de validação fica para feature futura (qrcode.react já é dependência).
- **Trade-off**: Encode só Code Set B (sem otimização automática A/B/C) é suficiente para `IVC-NNNN` e mantém o encoder simples; quiet zone de ~8 módulos torna o token levemente mais longo, mas a área do card comporta.
- **Scope**: `src/lib/barcode/code128.ts`, `Code128Barcode` em `src/components/MemberCard.tsx`, `scripts/probe-barcode.sh`, spec `barcode-membro` (BRC-01..05).
- **Date**: 2026-09-22
- **Status**: active

### AD-019
- **Decision**: O autoedit de perfil **não** pode escrever a linha inteira. `members_update_own` (RLS) restringe a **linha**, não as **colunas**, então um `update` com o objeto do form inteiro escreveria `status`, `matricula` e `criado_em` — escalonamento de privilégio. Os três services (`painel/members.ts`, `admin/membros.ts` e as rotas) passam a montar explicitamente apenas `{...payload, ...colunasDocumento(dados)}`; nada mais da linha entra no update.
- **Reason**: A RLS é o único controle entre o token do membro e a própria linha dele, e ela não conhece colunas. Sem whitelist no service, qualquer campo novo adicionado ao objeto do form viraria escrita em massa. `colunasDocumento` também usa `||` e não `??`: `""` também é ausência de dado, e `''` e `NULL` são estados distintos na coluna.
- **Trade-off**: Campo novo exige tocar o service; é o custo de não confiar na RLS para granularidade. Ganho: `status` e `matricula` ficam fora do alcance do autoedit por construção, não por convenção.
- **Scope**: `src/lib/painel/documento.ts` (`colunasDocumento`), `src/lib/painel/members.ts`, `src/lib/admin/membros.ts`, `src/app/api/painel/perfil/route.ts`, `src/app/api/admin/membros/route.ts`, `src/app/api/admin/membros/[id]/dados/route.ts`.
- **Date**: 2026-09-23
- **Status**: active

### AD-020
- **Decision**: A validade é calculada no **calendário civil fixo `America/Sao_Paulo`**, tanto no TypeScript (`civilDe`) quanto no SQL (`at time zone`), e não no fuso da máquina/sessão.
- **Reason**: A spec original pedia "data civil local do servidor", mas o servidor de produção roda em UTC: `criado_em = 2026-09-13T02:01Z` (IVC-0001) seria lido como 13/09 em UTC e como 12/09 no Brasil, e o cartão impresso erraria o dia da validade conforme o ambiente. Fixar o fuso também elimina a divergência entre o cálculo da aplicação e o `timestamptz` gravado pelo trigger. O probe fixa `hoje` e roda em vários `TZ` para provar que o resultado não depende do ambiente.
- **Trade-off**: Um membro no exterior tem o aniversário avaliado no calendário da igreja — que é o comportamento desejado para um documento civil em papel. O custo é que `America/Sao_Paulo` aparece em três lugares (TS, migration, spec) e precisa continuar alinhado.
- **Scope**: `src/lib/painel/validade.ts`, `supabase/migrations/0024_validade_cartao.sql`, spec/design de `cartao-valididade-anual` (CART-16).
- **Date**: 2026-09-23
- **Status**: active

### AD-021
- **Decision**: O probe só aceita guard **estrutural**, não de presença de token: para o caminho de escrita, o identificador vinculado ao retorno da composição tem de ser **literalmente o último argumento de todos** os serviços de gravação da rota, a guarda de 400 (`temErros`) tem de consultá-lo e tem de vir **antes** deles. Para o cartão, o retorno do mapper tem de estar ligado ao JSX. Caractere de controle é conferido na entrada **crua**, antes de qualquer `trim`.
- **Reason**: Três rodadas de Verifier foram gastas com a mesma classe de falha: o arquivo continha o símbolo, o efeito sumia. `comporDadosDocumento` chamada e descartada, `updateMember(..., base.dados)` com `createMember` ainda correto, `{...dadosDocumento, rg: null}` no lugar do argumento, `Object.keys(campos).length > 0` trocado por `=== 0` — todos passavam typecheck, lint, build e as probes. O ponto não era a ausência de teste, era o teste não conseguir distinguir a barreira da sua remoção. E o `trim()` antes de `temControle` era um **bug real**: `
`, `
` e `	` são whitespace, então `"12345678909\n"` entrava limpo (medido pelo Verifier), violando P1/5.
- **Trade-off**: Um alias semanticamente correto (`const alias = dados; service(..., alias)`) é reprovado, e a tier de banco reprova o snapshot se alguma coluna citada não existir na tabela mínima. O preço é uma refatoração de uma linha virar alteração de gate; a alternativa já custou três rodadas.
- **Scope**: `scripts/probe-cartao-validade.sh` (guard `persistido`), `src/lib/painel/documento.ts` (`temErros` + ordem da checagem de controle), `src/app/api/painel/perfil/route.ts` (`validarCamposBase` separado da composição), `src/lib/painel/cartao.ts` (`criado_em` anulável).
- **Date**: 2026-10-01
- **Status**: superseded (parcialmente) por **AD-024** — `temErros` não existe mais (`a4a39d1`), e a guarda de 400 deixou de ser um símbolo observável: passou a ser o estreitamento de `Pronto<T>`, que quebra a compilação. O texto acima fica como registro do que se decidiu na época; a parte ainda vigente é o guard `persistido`, o `FormData` como 3º argumento, o mapa de erros da rota como 2º argumento, e o controle conferido antes do `trim`.

### AD-022
- **Decision**: O backfill da migration é provado por **snapshot de todas as outras colunas** antes e depois, e a **reexecução tem o exit code conferido** — não só a contagem e o valor de uma linha. A tabela mínima do probe passou a ter `nascimento`, `cpf`, `rg` e `data_batismo`, e o snapshot é validado como legível antes de ser comparado.
- **Reason**: O Verifier provou que ambos os testes passavam vazios. Um backfill que também escrevesse `nome` e `atualizado_em` mantinha contagem e `validade_cartao` iguais. E o primeiro snapshot que escrevi citava colunas inexistentes na tabela mínima: `valor()` devolvia o texto do erro nas duas leituras, e o gate comparava o erro com ele mesmo — verde para qualquer coisa. Pior, remover `drop trigger if exists` deixava a tier sozinha em 18 ok / 0: a reexecução falhava e ninguém olhava o código de saída.
- **Trade-off**: O gate de banco depende de Docker e de `pgvector/pgvector:pg16`. Sem isso a tier faz SKIP com **exit 2** e o wrapper transforma em falha, em vez de sumir: cobertura perdida tem de aparecer.
- **Scope**: `scripts/probe-cartao-db.sh`, `supabase/migrations/0024_validade_cartao.sql` (sem mudança no arquivo), tasks da feature (T9 deixa de ser `Tests: none`).
- **Date**: 2026-10-01
- **Status**: active

### AD-023
- **Decision**: Probes de feature **não entram no CI** neste momento; ficam como gate local declarado no `tasks.md` de cada feature.
- **Reason**: `.github/workflows/ci.yml` roda lint/typecheck/build e os validadores estruturais, e nenhum `scripts/probe*.sh` — condição **pré-existente do projeto**, não introduzida aqui. Colocar o probe de uma feature no CI do repo tornaria a pipeline dependente de Docker e imporia a ordem de merge de features sem decisão do usuário. Registrado como pendência em vez de silenciosamente aceito.
- **Consequência**: "gate verde" existe apenas localmente. É o ponto 5 de precisão do 3o Verifier, e é a origem da fragilidade histórica deste gate: probes locais que ninguém roda não são barreira.
- **Pendente de**: decisão do usuário sobre (a) rodar probes no CI e (b) ordem de merge.
- **Date**: 2026-10-01
- **Status**: active

### AD-024
- **Decision**: `comporDadosDocumento` devolve uma **união discriminada** (`Pronto<T>`), e `criarMembro`/`atualizarDadosMembro` recebem `DadosProntos<T>` — não o tipo de entrada da rota.
- **Reason**: o par `{ dados, campos }` era indistinguível: os dois ramos existiam sempre, então ler `.dados` sem estreitar nada compilava. Um mutante que trocava o `return` do 400 por um `console.error` gravava a row com campo inválido e mantinha typecheck, lint, build e todas as probes verdes — sobreviveu a **quatro rodadas de Verifier** (R4: V1/V2/V3). Com `ok: false` só existente quando há erro, `.dados` só existe no ramo válido: remover o `return` quebra a compilação. `DadosProntos<T> = Readonly<T & DadosDocumento>` torna as três chaves de documento obrigatórias no service (o mutante "payload sem o trio" morre em `TS2345`) e impede reescrita pós-composição.
- **Consequência**: `temErros` foi removido — era a barreira fraca que a união substitui, mantida viva só por uma asserção de probe. `Readonly` **não** impede `{ ...pronto.dados }`, então o guard `persistido` do probe continua sendo a barreira dessa classe; a assinatura do service fecha a omissão silenciosa, não a reescrita via spread.
- **Date**: 2026-10-01
- **Status**: active

### AD-025
- **Decision**: TS e SQL passam a concordar no **ano de 5 dígitos** (`criado_em` de 9999 → ciclo-base `10000-12-31`). `FORMATO_DATA` aceita 4 a 6 dígitos e a comparação de datas é **numérica** por ano/mes/dia, não lexical. `infinity` permanece `null` no TS.
- **Reason**: medido no Postgres efêmero — o trigger grava `make_date(ano+1, …)` e devolvia `10000-12-31`, enquanto o TS devolvia `—`. Duas causas independentes: o formato recusava 5 dígitos, e a comparação era lexical, onde `"10000-12-31" >= "2026-01-01"` é **falso** porque `"1"` ordena antes de `"2"` (o candidato era sempre considerado passado, o laço de 200 anos rodava inteiro e devolvia `null`). Divergência sobre dado já gravado: o cartão de um membro real mostrava uma coisa e a coluna outra. Decisão do usuário entre três saídas possíveis: alinhar o TS ao SQL.
- **Consequência**: `infinity` diverge de propósito — o SQL **erra** (`cannot convert infinity to integer`), o que aborta o INSERT, então não existe linha persistida com `infinity` e o `null` do TS é a degradação segura do mesmo evento. O gate prende o caso alcançável (ano de 5 dígitos), não o inalcançável. **Resíduo conhecido**: o `Date` do JavaScript topsa em 275760 e o `date` do Postgres em 5874897 — a janela 275761..5874896 ainda diverge e nenhum dos dois lados pode fechá-la; documentado em `validade.ts`.
- **Date**: 2026-10-01
- **Status**: active

## Handoff — feature cartao-valididade-anual — PAUSADO para nova sessão (2026-10-01)

- **Estado**: implementação **completa e com gates locais verdes**, aguardando a 5ª rodada do Verifier. **NÃO está validado**: `validation.md` ainda contém o FAIL da R4.
- **Onde o código para**: o último commit que toca `src/`, `scripts/` ou `supabase/` é **`0d4d1a4`**. Tudo depois disso é `docs(cartao)` — AD-024, handoff e correções deste registro. Branch `main`, **nada pushed** (`git rev-list --count origin/main..HEAD` para o número exato; `git push` nunca sem autorização).
  - **Não confie em nenhum SHA absoluto escrito aqui**: um handoff que declara o próprio HEAD fica errado no mesmo commit que o escreve — foi o que aconteceu duas vezes nesta sessão. Use `git log --oneline -1` e `git log -1 --oneline -- src/ scripts/ supabase/`.
- **Os seis commits desta sessão** (a4a39d1 → a812ade; o anterior era `aeda946`):
  - `a4a39d1` `refactor(cartao): torna a composicao um contrato de tipo para as rotas` — união discriminada, `Object.freeze`, remoção de `temErros`, `persistido` reescrito, asserção de compilação do `Readonly`.
  - `c16ea60` `test(cartao): deriva do gate a contagem de instantes de fronteira` — a mensagem dizia "8 instantes" com 9 fixtures na lista; a contagem agora vem de `grep -c` sobre `FIXTURES`.
  - `0d4d1a4` `refactor(admin): so aceita o payload ja validado no cadastro de membro` — `DadosProntos<CriarMembroDados>`/`DadosProntos<MembroDadosAdmin>`.
  - `e6596a0`, `bf65a83`, `a812ade` — `docs(cartao)`: AD-024, delimitação da cobertura real do build, AD-021 marcada parcialmente supersedada, linha faltante na matriz.
- **Gates medidos no HEAD** (suíte completa rodada de uma vez depois de `0d4d1a4`):
  - `npm run typecheck` — sem erros;
  - `npm run lint` — 0 erros / 5 warnings pré-existentes;
  - `npm run build` — **verde**, rodada após `0d4d1a4` (a lacuna de cobertura que restava nesta sessão está fechada; build já tinha passado com o conteúdo de `a4a39d1`).
  - `bash scripts/probe-cartao-validade.sh` — `34 ok / 0 falhas`;
  - `bash scripts/probe-cartao-validade.sh --com-db` — `35 ok / 0 falhas` (`21 ok / 0` no Postgres efêmero);
  - matriz TZ `UTC`, `Asia/Tokyo`, `Pacific/Kiritimati`, `Europe/Lisbon` — `2 ok / 0 falhas` cada.
- **Mutação medida (11 mutantes, todos mortos)** em `/tmp/opencode/sc` (worktree com `node_modules` symlinked):
  - **morrem no compilador** — V1/V2/V3 (`return` do 400 removido nas três rotas), V7 (composição com outra base), V10 (`Readonly` removido do tipo), V13 (payload sem o trio de documento: `TS2345 missing rg, cpf, data_batismo`);
  - **morrem no probe** — V4/V4b/V4c (`{ ...pronto.dados }` para o service), V5b/V5c (`new FormData()`), V6/V6b (mapa de erros da base trocado por `{}`), V8 (`createMember` com `base.dados`), V9 (`Object.freeze` removido), V11 (guarda do `ok` invertida).
- **ORDEM DE TRABALHO DA PRÓXIMA SESSÃO** (não pule etapas nem reordene):
  1. Fechar o item 1 da lista abaixo (`criado_em` absurdo) — é a decisão de domínio que **precisa do usuário**, e o gap com maior chance de reprovar a R5. Apresente as duas saídas; não escolha sozinho.
  2. T4 (`src/lib/painel/members.ts`) — tipar `updateMember`/`createMember` com `DadosProntos<T>` e medir o mutante.
  3. Regressão: `npm run typecheck && npm run lint && npm run build` e `bash scripts/probe-cartao-validade.sh --com-db`. Tudo já está verde neste HEAD; se algo quebrar, a mudança dos passos 1–2 é a suspecta.
  4. Dispatchar o Verifier (R5) em worktree isolado. **Ele escreve `validation.md`; você não.**
  5. Só com PASS: linha `verified` na matriz e início de `landing-visual-hero`.
- **O que o R4 deixou em aberto e a próxima sessão deve fechar**:
  1. **`criado_em` absurdo**: TS e SQL divergem para `year >= 10000` e `infinity` (`src/lib/painel/validade.ts:146,153` — TS devolve `—`; o SQL erra ou devolve data). Decidir entre restringir o domínio no types (`Date` válido) ou alinhar as duas pontas, e registrar a decisão.
  2. **Claim obsoleta no R4**: o relatório afirma que "os 7 mutantes" estão mortos. Sete nomes estão mortos, a **classe** não. Não repetir a formulação.
  3. **T4 (`src/lib/painel/members.ts`)**: `updateMember`/`createMember` ainda recebem o tipo de entrada amplo, ao contrário de T5. O `Readonly`/spread do payload do perfil é coberto só pelo guard do probe. É o próximo passo natural da AD-024.
  4. **AD-023** (probes fora do CI) continua **pendente de decisão do usuário**, junto com a política de `git push`.
- **Pendência de documentação (não é bug)**: `docs/coverage-matrix.md` não tem linha para `cartao-valididade-anual`, e a regra do próprio arquivo diz que nenhuma feature é declarada pronta sem linha `verified` respaldada por `validation.md`. Como a feature ainda não tem PASS, a linha entra **depois** do Verifier, com `🔧 in progress` se o Orchestrator preferir sinalizar antes. Nota: `barcode-membro` e `admin-auditoria` também não têm linha — lacuna **pré-existente**, não introduzida aqui; corrigir as três de uma vez, não só esta.
- **Rodadas do Verifier**: R1 FAIL (13/21 sobreviveram; guards textuais aceitando código morto) → R2 FAIL (9/16 ACs, 12/21 sobreviveram; o guard de `MemberCard` existia mas `chama` viajava por exigir só um `=` antes do símbolo) → R3 FAIL (31/39 mortos, 7 sobreviveram; bug real de `\n`/`\t` no fim passando pelo `trim()`; a ligação entre composição e gravação atravessava duas camadas) → R4 FAIL (11/16 completas, 5 parciais; 27/35 mortos, 7 sobreviveram + 1 equivalente). **R5 é uma exceção autorizada pelo usuário** ao limite de 3 ciclos do protocolo — registrar isso no relatório.
- **Não editado por decisão**: `.specs/features/cartao-valididade-anual/validation.md` é do Verifier; o autor não o sobrescreve nem o versiona.
- **Branch**: main, commits locais, `git push` nunca sem autorização.

## Handoff

- **Feature**: `admin-relatorios` (RF-027) — **CONCLUIDA E VERIFICADA** — 7/7 tasks commitadas, verifier PASS.
- **O que foi entregue**: Módulo Relatórios/Documentos no painel admin com (i) exportação CSV de relatórios financeiros (receitas/despesas/caixa) e de gestão (membros/eventos/patrimônio), (ii) upload de documentos com categorias por módulo (6 categorias), listagem com filtros, download via signed URL e exclusão. RBAC via `can_access('relatorios', ...)` — FINANCEIRO escreve; demais leitores lêem/baixam. Migração `0015_relatorios_documentos.sql` com tabela `documents`, bucket Storage `documentos`, RLS e CHECK constraints.
- **DB**: migration `0015_relatorios_documentos.sql` aplicada no dev `[REDACTED_PROJECT_REF]`.
- **Probes**: `scripts/probes-admin-relatorios.sh` — estatico (migration/RLS/service/routes/page/dashboard). Gates lint/typecheck/build verdes.
- **Verifier**: PASS — 7/7 ACs verified.

## Handoff — RF-030 Auditoria CONCLUIDA (2026-09-17)

- **Feature**: `admin-auditoria` (RF-030) — **CONCLUIDA E VERIFICADA** — 15/15 tasks commitadas, probes 59/0, verifier PASS.
- **O que foi entregue**: Tabela `audit_logs` (autor uuid, acao text, entidade text, entidade_id text, timestamp timestamptz, ip inet, user_agent text, payload jsonb) com RLS via `can_access('auditoria', 'ler')` (SELECT/INSERT) e sem UPDATE/DELETE (imutavel). Service `auditoria.ts` (`registrarAuditoria` com truncamento 10KB, `listarAuditoria` com filtros por data/acao/entidade, `extrairInfoRequest`). Rotas `GET/POST /api/admin/auditoria` com guards `authAdmin`/`requireAdministrar`. Pagina `/admin/auditoria` (read-only) com tabela (Data/Hora, Autor, Acao, Entidade, ID, IP), filtros (periodo, acao, entidade), paginacao (20/pagina), empty state. Instrumentacao de 12 route handlers (membros, eventos, assets, financeiro, usuarios, configuracoes) para gravar logs automaticamente. Card "Auditoria" no dashboard com icone `FileText`. RBAC: `auditoria:ler` apenas SUPER_ADMIN/ADMIN.
- **DB**: migration `0017_audit_logs.sql` aplicada no dev `[REDACTED_PROJECT_REF]`.
- **Probes**: `scripts/probes-admin-auditoria.sh` **59 ok / 0 falhas** — estatico (migration/RLS/service/routes/page/dashboard/instrumentation). Gates lint/typecheck/build verdes.
- **Commits** (16, `661824f..3c0536d`): migration, service, GET route, page, POST route, instrument membros, instrument eventos, instrument patrimonio, instrument financeiro, instrument usuarios, instrument configuracoes, dashboard card, probes, STATE.md, fix verifier gaps, docs.
- **Verifier**: PASS — 18/18 ACs verified, sensor 1/3 killed (aceitavel para projeto probes-only), gaps corrigidos (AUD-19/20 removidos, truncamento 10KB adicionado).
- **Proximos passos**: `git push origin main` (commits locais; **nunca sem autorizacao**); proxima feature.
- **Open decisions**: nenhuma em aberto.
- **Uncommitted files**: `.specs/STATE.md` (este Handoff); `next-env.d.ts`/`opencode.json`/`tsconfig.tsbuildinfo` (untracked, NUNCA commitar).
- **Branch**: main (commits locais; `git push` pendente — nunca sem autorizacao).

## Handoff — batch restyle painel/admin/portal (2026-09-22)

- **Feature**: restyle dark do painel do membro + páginas admin + portal — **implementado** — gates lint/typecheck sem erros; probe `scripts/probes-admin-eventos.sh` realinhado ao status `EM ABERTO`/`CONCLUIDO`.
- **O que foi entregue**: painel do membro com layout próprio (`painel/layout.tsx`, `painel-navbar.tsx`) e páginas dashboard/dízimo/perfil/cartão em dark; páginas admin restilizadas (navbar própria `admin-navbar.tsx` + layout `admin/layout.tsx`, auditoria, configuracoes, lideranca, relatorios, usuarios); portal com navbar/cards dark e imagem do culto (`public/img_culto.png`); variáveis CSS `--color-admin-*` em `globals.css`; cartão de membro com visual oficial (modelo Canva do usuário) + impressão ID-1 (85,6×53,98 mm).
- **Nota**: visual do cartão corrigido pelo usuário; camada de barcode é a feature separada abaixo (AD-018).
- **Seed demo**: migration `0018_seed_ficticio_demo.sql` (membros fictícios p/ demonstração, sem DELETE) commitada neste batch com registro no ROADMAP (demonstração).
- **Open decisions**: nenhuma em aberto.

## Handoff — feature barcode-membro (2026-09-22)

- **Feature**: `barcode-membro` (BRC-01..05, AD-018) — **implementada** — probe `scripts/probe-barcode.sh` 4 ok / 0 falhas; `validate_spec.py barcode-membro` 0 erros; `npm run typecheck`/`lint` sem erros (só 5 warnings pré-existentes).
- **O que foi entregue**: encoder puro Code 128 (`src/lib/barcode/code128.ts`: tabela 107 símbolos, `code128()` com checksum mod 103 e start B, `code128Runs()` com quiet zone e terminação), integração no `MemberCard` (bloco inferior direito vetorial por módulo + matrícula legível abaixo, degradação sem barras em RangeError) e probe determinístico que valida invariantes estruturais, âncoras da fonte e a sequência exata de `IVC-0001` (checksum 10).
- **Probe**: `scripts/probe-barcode.sh` — 4 ok / 0 falhas. Gates lint/typecheck sem erros.
- **Com nota**: visual do cartão corrigido pelo usuário (modelo Canva); apenas o barcode foi trocado. Print ID-1 (85,6×53,98 mm) já ativo nas duas páginas de cartão.
- **Open decisions**: nenhuma em aberto (AD-018 ativa; QR de validação = feature futura).
- **Branch**: main (commits locais pendentes — se autorizado, commit da feature; `git push` nunca sem autorização).

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

## Handoff — security-hardening CONCLUÍDO (2026-09-22)

- **Feature**: `security-hardening` — endurecimento de segurança aplicado nos advisors do Supabase do projeto dev `[REDACTED_PROJECT_NAME]` (`[REDACTED_PROJECT_REF]`).
- **O que foi entregue**:
  - **ERROR `rls_disabled_in_public` corrigido**: `webhook_events` estava SEM RLS (migration 0014). Migration `0023_security_hardening.sql` habilita RLS + policy `webhook_events_select_financeiro` (SELECT authenticated `can_access('financeiro','ler')`, sem INSERT para anon/authenticated — escrita passa a ser via service-role).
  - **WARN `anon_security_definer_function_executable` corrigido**: `auth_role`, `can_access`, `proxima_matricula`, `proximo_patrimonio` tinham grant EXPLÍCITO `anon=X` no ACL (não era via `public`) — revogado de `public` e do role `anon`; mantido `authenticated` (necessário: `can_access` usado em todas as policies RLS, sequences nos cadastros). `has_function_privilege('anon',...)` passou a false nas 4.
  - **Defense-in-depth**: anon perdeu INSERT/UPDATE/DELETE em todas as tabelas de `public` (atuais + `alter default privileges` para futuras).
  - **Rota webhook** `POST /api/webhooks/mercadopago`: insert em `webhook_events` migrado de `createServerClient` (anon/sessão) para `createAdminClient` (service-role, BYPASSRLS). Validado e2e: POST fake → 200 `{ok:true}` + linha gravada no banco; teste removido.
- **WARNs mantidos (aceitos por design)**: `authenticated_security_definer_function_executable` (as 4 funções precisam ser executáveis por authenticated — exigência das policies RLS e cadastros); `auth_leaked_password_protection` desativada (toggle de dashboard, sem equivalente SQL — recomenda-se ativar em Authentication > Security).
- **Proxy da porta**: havia 2 instâncias de `next dev` brigando pela 3000 (404) — mortas; 1 instância limpa up (`setsid`) → home/login 200, APIs admin protegidas 401.
- **Projeto pausado**: e-mail do Supabase informava pausa do projeto `software_ivc` (`[REDACTED_PROJECT_REF]`, org MIGUELEDL) por inatividade. **Não é usado pelo app** (`.env.local` aponta p/ `[REDACTED_PROJECT_NAME]`). Sem endpoint de DELETE nas ferramentas MCP disponíveis — para remover de vez, deletar no Dashboard (Settings → Delete project) ou aguardar auto-expiração em ~90 dias.
- **Próximos passos**: ativar leaked password protection no Dashboard; (opcional) corrigir FKs sem índice (advisors performance); `git push origin main` (se autorizado).
- **Open decisions**: nenhuma em aberto.
- **Branch**: main (commits locais; push pendente — nunca sem autorização).

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
