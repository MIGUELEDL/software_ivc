# Igreja Virtude Cristã

Plataforma web da Igreja Virtude Cristã, em Santa Luzia-PB: portal público, área do membro e painel administrativo com controle de acesso por papéis.

O sistema atende uma igreja local de cerca de 30 a 50 membros e cobre desde a presença institucional na web e doações por PIX até a gestão de membros, eventos, patrimônio, finanças, relatórios e auditoria. Tudo roda em um único deploy Next.js, com Supabase como banco de dados, autenticação e armazenamento.

O projeto está em produção desde outubro de 2026. O repositório reúne o código, as especificações por funcionalidade e a documentação técnica.

## Contexto

O projeto nasceu da rotina real da igreja: processos manuais, engessados e ultrapassados para cuidar de cadastros, registros e relatórios. A plataforma centraliza esses processos em um fluxo único, com dados consistentes, permissões por função e histórico das ações administrativas.

## Destaques

- Um único sistema para portal público, área do membro e administração.
- Controle de acesso por papéis com matriz de permissões no banco e Row Level Security nas tabelas expostas.
- Cartão de membro com código de barras Code 128 gerado no próprio projeto e validade anual calculada por regra de negócio.
- PIX BR Code gerado em tempo real, sem imagem estática.
- Auditoria append-only das ações sensíveis.
- 310 testes automatizados, mutação de 100% nos módulos críticos e CI em dois jobs.
- Custo fixo próximo de zero com Vercel Hobby e Supabase Free.

## Funcionalidades

### Portal público

- Página inicial com história, missão, visão, valores, liderança, localização, horários de culto e redes sociais.
- Listagem e detalhe de eventos, com inscrição via WhatsApp.
- Doação por PIX com QR Code gerado na hora e código copia-e-cola.

### Área do membro

- Login por e-mail e senha-ID, com troca de senha obrigatória no primeiro acesso.
- Avisos e informações da igreja.
- Cartão de membro com código de barras Code 128 e validade anual calculada por regra.
- QR Code para dízimo.
- Edição dos próprios dados e foto 4x4.

### Painel administrativo

- Dashboard com indicadores e atividades recentes.
- Membros: cadastro, edição, documentos, foto, status e criação de conta de acesso.
- Igrejas e liderança: CRUD e exibição no portal.
- Eventos: CRUD, visibilidade e exclusão lógica.
- Patrimônio: inventário de bens com categorias, tombamento, localização e baixa por status.
- Financeiro: lançamentos, filtros, webhook de pagamentos PIX e fechamento de caixa.
- Relatórios: exportação CSV e documentos com download por URL assinada.
- Usuários e permissões: gestão de papéis e matriz de permissões por módulo.
- Configurações e auditoria append-only.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Aplicação | Next.js 16 (App Router, Turbopack) e React 19 |
| Linguagem | TypeScript 5 |
| Estilo | Tailwind CSS v4, Framer Motion e Lucide |
| Banco e autenticação | Supabase (PostgreSQL, Auth e Storage) com Row Level Security |
| Pagamentos | Webhook de pagamentos PIX (Mercado Pago, modo stub) |
| Documentos e QR | jsPDF, jspdf-autotable e qrcode.react |
| Observabilidade | Sentry (erros) e Vercel Analytics |
| Testes | Vitest 5, Testing Library e Stryker |
| CI/CD | GitHub Actions e Vercel |

## Métricas do projeto

| Métrica | Valor |
| --- | --- |
| Funcionalidades especificadas | 32 |
| Testes automatizados | 310 |
| Mutação no domínio crítico | 100%, zero sobreviventes |
| Migrações SQL versionadas | 28 |
| Tabelas no banco | 14 |
| Papéis de acesso | 7 |
| Rotas de API | 40 |

## Arquitetura

Monólito modular com camadas por domínio. As rotas ficam no App Router; as regras de negócio e o acesso a dados ficam em `src/lib`, separados por área. O acesso ao Supabase acontece por clients próprios para servidor e navegador, e as políticas de RLS reforçam a autorização no banco.

```
src/
├── app/                  # Rotas: portal, área do membro, admin e API
├── components/           # Componentes de interface
├── lib/
│   ├── admin/            # Serviços do painel administrativo
│   ├── auth/             # Sessão e RBAC
│   ├── barcode/          # Codificador Code 128
│   ├── observability/    # Logger e Sentry
│   ├── painel/           # Serviços da área do membro
│   └── supabase/         # Clients server, browser e admin
supabase/migrations/      # Migrações SQL versionadas
scripts/                  # Seed, probes e smoke tests
.specs/                   # Especificações por feature e decisões
docs/                     # Arquitetura, segurança, deploy e roadmap
```

## Segurança

- Autenticação pelo Supabase Auth, com sessão em cookies gerenciados pelo servidor e papel do usuário em `app_metadata`, não editável pelo cliente.
- Login separado para membros e administradores; primeiro acesso com senha temporária e troca obrigatória.
- RBAC com sete papéis (MEMBRO, SECRETARIA, LIDER, FINANCEIRO, PATRIMONIAL, ADMIN e SUPER_ADMIN) e matriz de permissões por módulo no banco, com níveis ler, escrever e administrar.
- Row Level Security nas tabelas expostas e políticas de acesso no Storage: fotos públicas e documentos privados com URLs assinadas.
- Auditoria append-only das ações administrativas sensíveis.
- Nenhuma credencial fica no repositório; a configuração é feita por variáveis de ambiente.

## Como rodar localmente

Pré-requisitos: Node.js 22, npm e um projeto Supabase (ou a CLI do Supabase para uso local).

```bash
nvm use
npm ci
cp .env.example .env.local
```

Preencha `.env.local` com as credenciais do projeto Supabase. Em seguida, aplique as migrações:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Crie o primeiro administrador:

```bash
SEED_ADMIN_EMAIL=admin@exemplo.com \
SEED_ADMIN_PASSWORD='senha-temporaria' \
npm run seed:admin
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

A aplicação fica disponível em `http://localhost:3000`. O login de membros está em `/login` e o de administradores em `/login/admin`.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificação de tipos |
| `npm run test` | Testes com Vitest |
| `npm run test:ci` | Testes em modo CI |
| `npm run test:mutate` | Teste de mutação com Stryker |
| `npm run seed:admin` | Cria o primeiro administrador |
| `npm run probe:auth` | Probe de autenticação |
| `npm run probe:painel` | Probe da área do membro |
| `npm run probe:admin-membros` | Probe do módulo de membros |
| `npm run probe:barcode` | Probe do código de barras |
| `npm run probe:admin-auditoria` | Probe de auditoria |
| `npm run probe:cartao` | Probe do cartão e validade |
| `npm run probe:cartao:db` | Probe do cartão com banco (requer Docker) |

## Testes e qualidade

- 310 testes automatizados com Vitest, cobrindo domínio, serviços e componentes.
- Teste de mutação com Stryker nos módulos críticos (Code 128, validade do cartão, cartão, documentos e PIX), com barreira de 100% e zero mutantes sobreviventes.
- Probes de integração em bash para rotas, SSR e banco, executados por feature.
- CI em dois jobs: lint, tipos, build, testes e probes sem dependência externa; validação estrutural das especificações.

## Documentação

- [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md): visão geral e contexto.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): arquitetura e decisões.
- [`docs/DATABASE.md`](docs/DATABASE.md): modelo de dados.
- [`docs/API.md`](docs/API.md): rotas e contratos.
- [`docs/SECURITY.md`](docs/SECURITY.md) e [`docs/LGPD.md`](docs/LGPD.md): segurança e privacidade.
- [`docs/TESTING.md`](docs/TESTING.md): estratégia de testes.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md): deploy e CI/CD.
- [`docs/ROADMAP.md`](docs/ROADMAP.md): fases do projeto.
- [`.specs/STATE.md`](.specs/STATE.md): decisões registradas e histórico de sessões.

## Processo de desenvolvimento

O projeto segue Spec-Driven Development. Cada funcionalidade tem uma especificação com critérios de aceitação em EARS, tarefas atômicas e validação independente com evidências. São 32 funcionalidades especificadas e 34 decisões de arquitetura e produto registradas em `.specs/STATE.md`; a rastreabilidade entre requisitos, especificações e testes está em [`docs/coverage-matrix.md`](docs/coverage-matrix.md).

## Deploy

A aplicação é publicada na Vercel e usa um projeto Supabase dedicado. O deploy de produção é feito a partir da branch `main`, com CI verde e variáveis configuradas no painel da Vercel. As migrações são versionadas em `supabase/migrations` e aplicadas antes do deploy.

## Status

O sistema está em produção desde outubro de 2026. O webhook de pagamentos PIX está implementado em modo stub idempotente; a cobrança automática será habilitada quando as credenciais do Mercado Pago forem configuradas. As próximas frentes são hardening e evolução contínua, conforme o [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Autor

Desenvolvido por Miguel Ernandes Dias Lucena. GitHub: [MIGUELEDL](https://github.com/MIGUELEDL).

## Licença

MIT. Consulte [LICENSE](LICENSE).
