# Banco de Dados — IVC

> Decisões de persistência derivam de **AD-003**: PostgreSQL via Supabase
> (Auth + Storage inclusos) modelado com **Drizzle ORM**. Os requisitos RF/RNF/RN
> em `docs/REQUIREMENTS.md` são a fonte dos atributos; este documento consolida o
> modelo planejado.

## Provedor e tooling

| Item | Escolha | Nota |
| ---- | ------- | ---- |
| Banco | PostgreSQL (Supabase, plano free) | Integridade financeira |
| ORM / migrações | Drizzle ORM | Tipagem first-class; migrações em SQL versionadas |
| Auth | Supabase Auth (gerenciado via Auth.js) | Sessões separadas membro/admin (AD-004) |
| Storage | Supabase Storage | Foto 4x4 do membro, documentos |
| RLS | Row Level Security | Camada extra de segurança por policy |

## Princípios

- Dados vivem no Postgres; **RLS aplicado** por policy por papel (ver `SECURITY.md`).
- Migrações versionadas em SQL (Drizzle); nunca se altera schema à mão em produção.
- Volume baixo (1 templo, ~30-50 membros, ~30 lançamentos/mês, ~20 doações/mês) —
  modelo simplicista sem denormalização prematura (AD-001).

## Modelo de dados planejado

> Bases da árvore de navegação e dos requisitos. As features da Fase 9 detalham cada
> tabela nas respectivas specs; nomes/colunas finais se definem nas migrações.

### Identidade e acesso

- **users** — conta de acesso (id, email, hash/token, papel base, status, criado_em).
- **members** — membro do templo (id, nome, nascimento → idade/aniversário, endereço,
  contatos, foto, documento, templo_id, ciclo de vida do membro).
- **roles / permissions** — RF-031 papéis (MEMBRO…SUPER_ADMIN) e **matriz por papel**
  (RF-032: ler/escrever/administrar por módulo); vínculo `user_role`.

> O portal de membro existe para **registro e manutenção dos próprios dados** (nome,
> nascimento, idade, foto…) alimentando o cadastro e futuros cartões de membro
> (decisão do administrador — RF-016 não fará parte; sem extrato de doações no painel
> membro).

### Portal e conteúdo

- **churches** — templo (1 hoje, evoluível — RN-005).
- **leaders / leadership** — liderança institucional (RF-002, RF-023).
- **events** — eventos (título, data, visibilidade RF-024); inscrições redirecionam ao
  WhatsApp (RN-003); **event_notices/avisos** (RF-012 no painel membro).

### Financeiro (PIX — AD-009)

- **donations / contributions** — doações/ofertas (valor, método=PIX, status,
  webhook_id, conciliado_em).
- **transactions / ledger** — receitas e despesas (RN-001.1: conciliação + fechamento
  de caixa obrigatórios).
- **webhook_events** — log das notificações do Mercado Pago (idempotência, auditoria).
- **payment_configs** — chave PIX, credenciais, parâmetros (RF-029).

### Administrativo

- **assets** — patrimônio (RF-025).
- **reports / documents** — relatórios e documentos (RF-027).
- **audit_logs** — registro de auditoria de ações administrativas sensíveis (RN-004).
- **settings / cms_content** — configurações do portal (RF-029).

## Storage

- Bucket de **fotos de membro** (foto 4x4): paths por `members/{memberId}/...`, RLS de
  leitura para o próprio membro e para papéis administrativos.
- Bucket de **documentos** (painel admin): restrito a papéis com permissão.

## RLS (postura)

- Políticas por tabela baseadas no papel da sessão (jwt.claims) e na propiedade do
  recurso (ex.: membro só lê a própria foto/registro).
- As features da F9 definem policy por policy nas specs + migrações.

## Backup e integridade

- **RPO ≤ 24h / RTO ≤ 4h** (RNF-006) — fornecido pelo Supabase (PITR/backup no plano;
  documentar como política de restauração). Detalhes operacionais em `DEPLOYMENT.md`.

## Referências

- `docs/ARCHITECTURE.md` — camadas e Ports & Adapters (persistência)
- `docs/SECURITY.md` — RLS, RBAC, auditoria
- `docs/REQUIREMENTS.md` — RF/RNF/RN de origem