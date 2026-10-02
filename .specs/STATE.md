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
- **Consequência**: `infinity` diverge de propósito — o SQL **erra** (`cannot convert infinity to integer`), o que aborta o INSERT, então não existe linha persistida com `infinity` e o `null` do TS é a degradação segura do mesmo evento. O gate prende o caso alcançável (ano de 5 dígitos), não o inalcançável.
- **Janela residual — NÃO É UM INTERVALO** (R5, R6 e R7 documentaram por texto e **as três erraram**): `diasNoMes` pergunta o *último dia do mês*, então o `Date` quebra no **mês** em que esse último dia passa do teto, não no ano. Regra medida: `Date` vai até `+275760-09-13T00:00:00.000Z`, e no ano 275760 os meses **1..8 passam, 9..12 não**. Do lado do Postgres, `criado_em` é `timestamptz` e aceita até `294276-12-31` (o `5874897` que eu citei duas vezes é o teto do `date`, que o `make_date` alcança mas não é o gargalo). Onde divergem, o TS devolve `null` por não poder representar a data. **Não fechável** sem trocar o transporte (texto civil). Por isso `probe-cartao-validade.sh` agora **mede a transição** e `validade.ts` escreve a **regra**, não a faixa: o gate se move se a semântica do `Date` mudar, o texto não.
- **O relatório da R7 errou os dois lados e foi medido**: ele afirma que o Postgres para em `294275-12-01` (medi: `294276-12-31 00:00:00+00` **é** aceito) e que "o ano 275760 inteiro é rejeitado" (só setembro em diante). Nenhum número de relatório foi aceito sem refazer a medição.
- **Display alinhado** (lacuna 4 da R6): `fmtData` exigia `\d{4}` fixo, então o cartão imprimia `—` para `10000-12-31` — a data que a coluna **tem** por esta mesma AD. Mesma divergência sobre dado gravado, agora na display. `fmtData` aceita 4 a 6 dígitos; o round-trip em UTC continua sendo o único que pode recusar.
- **Janela BAIXA — fechada** (R5): o laço de candidatos tinha teto fixo de **200 anos**, então um `criado_em` mais antigo devolvia `null` enquanto o trigger já tinha gravado o ciclo-base — divergência sobre dado **já persistido**, do mesmo tipo da do ano de 5 dígitos, e fechável (é aritmética, não teto de runtime). Medido: `1800-06-01` → TS `null` / SQL `1801-06-01`. O número de passos agora é derivado (`anoHoje - anoCivil + 1`, exato: o aniversário k tem ano `anoCivil + k`). Esta era a omissão real da AD-025: ela falava da janela alta e calava da baixa.
- **Date**: 2026-10-01
- **Status**: active

## Handoff — feature cartao-valididade-anual — o salto de 1 passo foi fechado (2026-10-01)

- **Estado**: implementação completa, gates locais verdes, **ainda sem veredito PASS**. A R8 foi FAIL e o que ela mediu foi corrigido; falta a re-verificação. `validation.md` é do Verifier — não versionado, não editado pelo autor.
- **Onde o código para**: último commit que toca `src/`, `scripts/` ou `supabase/` é **`479990c`**. Branch `main`, **nada pushed**. `git rev-list --count aeda946..HEAD` = 25.
- **O número que decide a história**: a R7 pediu "tier de execução do payload" e eu entreguei execução dos **builders**. Não fechava. A R8 mediu o motivo em uma linha:

  ```
  .update({ ...colunasEditarMembro(dados, iso), rg: null, cpf: null })
  ```

  **Um passo, nos quatro caminhos**, com `tsc`, `lint`, `build` e as 34 probes verdes — e a row gravando `NULL`. Não faltava a *forma* da chamada: a amarra textual do `gravando` estava satisfeita (primeiro argumento é o literal `dados`), o builder estava nomeado, e `Object.freeze` não protege porque o objeto literal é NOVO. E **não existe regra textual que pegue isso** — não há assinatura de "campo sobrescrito" para casar. Faltava execução, não grep.
- **O que foi feito** (`479990c`): `src/lib/painel/gravacao.ts` traz o mínimo do cliente que os quatro caminhos usam; os 4 services aceitam `deps` opcional (sem injetar, o comportamento é o de antes); `criarMembro` passou a receber `criarAuthUser`/`removerAuthUser` em vez do cliente admin inteiro, porque o contrato de teste precisa de um id e não da superfície do `auth.admin`. O probe **executa os 4 services** com um cliente falso que captura o payload; o hook de `Module._load` faz `createServerClient` **lançar** se algum caminho tocar o Supabase real, então a injeção é verificada e não presumida. `comoCliente` é o ponto único de cast do módulo, porque o `SupabaseClient` real estoura `TS2589` contra o contrato estrutural.
- **Mutação medida neste HEAD** (worktree isolado, removido): os 7 mutantes que a R8 mediu como **sobreviventes morrem** — F1/F5/F7/F8 (a sobrescrita de 1 passo, um em cada caminho) e F4. E **G12a também morre**, o que corrige a leitura da R8: ela o classificou como "benigno" por causa do `Object.freeze`, mas o congelado é o `dados`, não a row devolvida pelo builder — `colunasEditarMembro(...)` devolve objeto solto e a escrita passava. Era invisível só porque nenhuma tier executava o service. Baseline do tier novo: **7/7 mais 2**.
- **Erros meus que a R8 apontou, corrigidos**: (1) o comentário do guard dizia que a regra pegava G12 — não pega, `[A-Za-z_]` não casa a aspa de `"rg"`; (2) "sem escrita no banco" era provado por **ausência de chamada** — agora o valor capturado é conferido, trio em branco chega `null` e nunca `""`; (3) "no partial write" estava **sem assert** — agora um UPDATE que viola `NOT NULL` muda `nome` e `cpf` no mesmo comando e o `cpf` tem de continuar como estava; (4) eu escrevi que o trigger estouraria `make_date(294277,…)` — `date` no Postgres vai até 5.874.897 e `criado_em` nunca passa de 294276, então o UPDATE era **aceito** e o teste media o oposto do que dizia.
- **O tier novo pegou um bug do próprio teste**: eu passava o envelope `{ok, dados}` ao service em vez de `dados`. Um teste que passa o objeto errado falha com a mensagem errada — e é por isso que ele precisa executar o service, e não olhar para ele.
- **Gates medidos neste HEAD**: typecheck sem erros; lint 0 erros / 5 warnings pré-existentes; build verde; probe **35 ok / 0**; `--com-db` **36 ok / 0** (**24 ok / 0** Postgres); TZ `UTC`, `Asia/Tokyo`, `Pacific/Kiritimati`, `Europe/Lisbon` **3 ok / 0** cada; **0 volumes vazados**.
- **Rodadas**: R1..R8, todas FAIL. R5, R6, R7 e R8 são exceções do usuário acima do limite de 3 ciclos; a R8 foi autorizada junto com o refactor de execução.
- **Se a re-verificação ainda falhar**: o próximo buraco, se houver, é de outra família — as tiers agora cobrem valores (builders), escrita (compilador), ligação (texto) e **o payload que o service realmente manda**. O que não existe mais é margem textual para buraco de 1 passo.
- **DB**: migration `0024_validade_cartao.sql` aplicada no dev `[REDACTED_PROJECT_REF]`. **Não reaplicar nem escrever remotamente.**
- **Pendências de superfície, não AC**: **AD-023** (probes fora do CI, sem dono) e política de `git push`.
- **Pendência de documentação**: `docs/coverage-matrix.md` sem linha para esta feature. `barcode-membro` e `admin-auditoria` também — lacuna **pré-existente**, corrigir as três juntas.

