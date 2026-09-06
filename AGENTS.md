<!-- BEGIN:context -->
# Contexto & retomada de sessão

- Projeto: portal + painel da **Igreja Virtude Cristã (IVC)** (Santa Luzia-PB). Visão geral: `README.md`.
- **SEMPRE que abrir/re­abrir uma sessão, leia `.specs/STATE.md`** (decisões AD-NNN + seção **Handoff**) para saber de onde continuar.
- Roadmap e status: `docs/ROADMAP.md`; rastreabilidade RF/RNF: `docs/coverage-matrix.md`; índice: `docs/README.md`.
- Git: commits com identidade do autor (`git -c user.name="MIGUELEDL" -c user.email="author@example.com"`) — identidade local ainda não configurada no repo; o hook `.githooks/commit-msg` (Conventional Commits) está ativo via `core.hooksPath`.
- Nada pode ficar em aberto sem registo: spec/design/tasks/decisão pendente sempre aparecem no Handoff/STATE.md.
<!-- END:context -->

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:sdd-workflow -->
# Spec-Driven Development (processo obrigatório p/ mudanças de código)

- **Skill**: `tlc-spec-driven` em `.opencode/skills/`. Antes de qualquer implementação, carregue a skill e siga o ciclo Specify → (Design) → (Tasks) → Execute.
- **Specs e decisões**: `.specs/features/<feature>/spec.md` (ACs em EARS, IDs `CATEGORIA-NN`) e `.specs/STATE.md` (decisões AD-NNN + Handoff). Nada em aberto sem registo.
- **Gates determinísticos** (rodar, não decorar): `validate_spec.py`, `validate_tasks.py`, `check_commit.py`, `validate_state.py` (todos em `.opencode/skills/tlc-spec-driven/scripts/`, invocados por `python3`).
- **Verificação**: após o último commit da feature, o Verifier SEMPRE roda (autor ≠ verificador; evidência `file:line`; sensor de mutação em scratch). Sub-agentes: `.opencode/agent/tlc-verifier.md` e `tlc-worker.md` (carregados no RESTART do opencode).
- **Commits**: atômicos, um por tarefa, em Conventional Commits (hook em `.githooks/commit-msg`, `core.hooksPath` apontado).
- **CI dupla**: `.github/workflows/ci.yml` — job `tests` (gates de código) + job `specs` (validação estrutural). Deploy/remote só com aprovação explícita.

# Ambiente: Node.js

- Node/npm/npx **não estão no PATH do shell por padrão**. Ative via nvm antes de gates locais:
  `export PATH="$HOME/.nvm/versions/node/v$(cat .nvmrc).0/bin:$PATH"` (ou `nvm use` numa shell interativa).
- Gates locais: `npm run lint`, `npm run typecheck`, `npm run build`. Test runner entra na F10.
<!-- END:sdd-workflow -->
