# Cartão de Membro — Sincronização e Validade Anual — Design

**Spec**: `.specs/features/cartao-valididade-anual/spec.md`
**Status**: Approved

---

## Architecture Overview

Duas pure-function modules no domínio do painel (sem I/O, sem React) + uma
migration SQL. As regras de negócio ficam em um único lugar testável por `node`
(mesmo padrão do encoder Code 128 em `src/lib/barcode/code128.ts`, AD-018), e
nenhum componente passa a derivar regra por conta própria.

```
Formulário (admin / painel)
   │  FormData
   ▼
Route Handler (valida + normaliza)
   │  MemberDadosComDocumento
   ▼
lib/painel/documento.ts  ── pure: normalizarCpf / normalizarRg / normalizarDataBatismo
   │
   ▼
Service (whitelist de colunas)
   │  insert/update  ──► BEFORE trigger  ──► members.validade_cartao = criado_em + 1 ano
   ▼
Member (linha atual)
   │
   ▼
MemberCard ──► lib/painel/validade.ts ── pure: calcularValidadeCartao(criado_em, hoje)
```

**Decisões de arquitetura já confirmadas com o usuário** (as alternativas estão
registradas abaixo para auditabilidade):

| Abordagem | Cálculo da validade | Veredito |
| --------- | ------------------- | -------- |
| Coluna fixa + trigger | `criado_em + 1 ano` gravado, nunca recalculado | **Rejeitada** — não renova |
| Coluna + `pg_cron` diário | trigger grava; job diário re-rola | **Rejeitada** — extensão não instalada, superfície operacional nova, e o valor mostrado não precisa estar stored |
| Coluna = ciclo-base + cálculo rolante no render (escolhida) | coluna útil para relatório; cartão recebe o ciclo corrente | **Escolhida** — zero agendamento, regra testável, sem divergência |

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component / pattern | Location | How to Use |
| ------------------- | -------- | ---------- |
| Pure lib + `npx tsc` → teste em `node` | `src/lib/barcode/code128.ts` + `scripts/probe-barcode.sh` | Modelo exato do novo `validade.ts`: sem deps, testável sem runner |
| `validarNascimento` (formato, futuro, limite) | `src/app/api/painel/perfil/route.ts:11-32` | O validador de `data_batismo` copia exatamente esse padrão de trêsguards |
| Whitelist em `validarFormulario` | `src/app/api/painel/perfil/route.ts:34-49` | Retorno `{ dados, campos }` com mensagem por campo; replicado para documento |
| Whitelist de colunas no service | `src/lib/painel/members.ts:98-113` | `updateMember` monta o objeto explicitamente — nunca `...body`; é o que impede escalonamento de privilégio |
| `MembroDadosAdmin` + `atualizarDadosMembro` | `src/lib/admin/membros.ts:206-250` | Alinhamento de assinatura; campos novos entram na mesma lista explícita |
| `fmtData` | `src/components/MemberCard.tsx:6-8` | Reutilizado para formatar batismo e a validade calculada |
| Probe conventions | `scripts/probe-barcode.sh` | `ok`/`ko`, contagem, `mktemp -d` + `trap`, gate no exit code |
| SQL idempotente | `supabase/migrations/0020_member_card_columns.sql` | `ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE`, trigger `DROP TRIGGER IF EXISTS` |
| Live probe de banco | `scripts/probes-painel.sh` (padrão existente) | Asserção de persistência real, não só estática |

### Integration Points

| System | Integration Method |
| ------ | ------------------ |
| PostgreSQL (`members`) | Colunas existentes (`rg`, `cpf`, `data_batismo`, `validade_cartao` de `0020`) — **nenhuma coluna nova** |
| RLS | `members_update_own` é por linha, sem whitelist de coluna → nenhuma policy nova necessária (ver Riscos) |
| Supabase Auth | `claims.sub` → `auth_user_id`; inalterado |
| RBAC (AD-015) | `/api/admin/membros` já é protegido; nenhuma linha de `permissions` nova |

---

## Components

### `documento.ts` (pure)

- **Purpose**: Normalizar e validar RG, CPF e data de batismo em um único lugar, usado pelas duas rotas.
- **Location**: `src/lib/painel/documento.ts`
- **Interfaces**:
  - `normalizarCpf(valor: string): { ok: true; cpf: string } | { ok: false; erro: string }` — `strip(/\D/g)`; exige exatamente 11 dígitos; vazio → `ok: true` com `""` (caller converte para `null`)
  - `normalizarRg(valor: string): { ok: true; rg: string } | { ok: false; erro: string }` — `trim`; vazio → `""`; ≤ 20 chars; rejeita `\r`, `\n`, `\t` e demais controles
  - `normalizarDataBatismo(valor: string, hoje: Date): { ok: true; data: string } | { ok: false; erro: string }` — `YYYY-MM-DD`, data real, não posterior a `hoje`; vazio → `""`
  - `dadosDocumento(v: { rg: string; cpf: string; dataBatismo: string }, hoje: Date): { dados: { rg: string | null; cpf: string | null; data_batismo: string | null }; campos: Record<string, string> }` — agrega os três e monta a mensagem por campo
- **Dependencies**: nenhuma (sem `Date` global — `hoje` é sempre injetado, para teste determinístico)
- **Reuses**: regras de `validarNascimento`

### `validade.ts` (pure)

- **Purpose**: Calcular o ciclo corrente de validade do cartão.
- **Location**: `src/lib/painel/validade.ts`
- **Interfaces**:
  - `aniversario(criadoIso: string, anos: number): string` — soma `anos` a `criadoIso`; **clamp 29/02 → 28/02**; devolve `YYYY-MM-DD`
  - `calcularValidadeCartao(criadoEm: string | null | undefined, hoje: Date): string | null` — menor `aniversario(base, k) ≥ hoje` para `k ≥ 1`; `null` se a data não é parseável
- **Dependencies**: nenhuma
- **Reuses**: o estilo de módulo puro de `src/lib/barcode/code128.ts`

> Implementação sem `Date` ambíguo: os componentes são construídos por `new Date(y, m-1, d)` (hora local) e comparados por `YYYY-MM-DD` em string — imune a fuso e a `toISOString()` deslocando o dia. `aniversario` compõe `makeDate(ano, mes, dia)` e trata o overflow de 29/02 por `setDate` + comparação.

### `MemberCard` (modificar)

- **Purpose**: Exibir validade corrente em vez da coluna crua.
- **Location**: `src/components/MemberCard.tsx:58`
- **Interfaces**: `MemberCard({ member }: { member: Member })` — sem prop de data: o cartão não é testado por render, e a injeção de `hoje` vive no mapper puro `camposCartao(member, hoje)`, que é o ponto testado. `MemberCard` chama `camposCartao(member, new Date())`; nenhum call site passa `hoje`.
- **Dependencies**: `calcularValidadeCartao`
- **Reuses**: `fmtData`, `campos` object já existente

### Rotas e formulários (modificar)

| Arquivo | Mudança |
| ------- | ------- |
| `src/app/api/painel/perfil/route.ts` | `validarFormulario` lê `rg`/`cpf`/`dataBatismo` → `dadosDocumento`; inclui no `dados` |
| `src/lib/painel/members.ts` | `MemberDados` ganha `rg`/`cpf`/`data_batismo` opcionais; `createMember`/`updateMember` mantêm a whitelist explícita |
| `src/lib/admin/membros.ts` | `CriarMembroDados`/`MembroDadosAdmin` + `criarMembro`/`atualizarDadosMembro` |
| `src/app/api/admin/membros/route.ts` e `[id]/dados/route.ts` | Validam documento antes do write |
| Formulários admin + perfil painel | 3 inputs + mensagens de erro |

---

## Data Models

Nenhuma coluna nova. `Member` e `MembroAdmin` já declaram `rg`, `cpf`,
`data_batismo`, `validade_cartao` (verificado em `src/lib/painel/members.ts:11-14`).

```ts
// src/lib/painel/members.ts — extensão
export type MemberDados = {
  nome: string;
  nascimento: string;
  whatsapp: string;
  rg?: string | null;          // null = não informado (nunca "")
  cpf?: string | null;
  data_batismo?: string | null;
};
```

`MembroDadosAdmin` recebe o mesmo trio opcional.

### Migration `0024_validade_cartao.sql`

```sql
-- 1) função do ciclo-base (created_at + 1 ano), clamp 29/02 → 28/02
create or replace function public.members_ciclo_base(p_criado timestamptz)
returns date language sql immutable as $$
  select case
    when extract(month from p_criado) = 2 and extract(day from p_criado) = 29
      then make_date(extract(year from p_criado)::int + 1, 2, 28)
    else (p_criado + interval '1 year')::date
  end;
$$;

-- 2) trigger BEFORE INSERT OR UPDATE — writes only on INSERT / quando criado_em muda
create or replace function public.members_set_validade()
returns trigger language plpgsql as $$
begin
  new.validade_cartao := public.members_ciclo_base(new.criado_em);
  return new;
end;
$$;

-- 3) backfill idempotente: só NULL, nunca sobrescreve valor existente
update public.members
   set validade_cartao = public.members_ciclo_base(criado_em)
 where validade_cartao is null;
```

> **Nota de segurança**: o trigger grava `criado_em`, não `validade_cartao`,
> vindo do cliente. Mesmo que alguém escreva `validade_cartao` diretamente, o
> trigger o sobrescreve a partir de `criado_em` — a coluna nunca vira campo
> livre.

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| -------------- | -------- | ----------- |
| CPF com letra/mascara | `normalizarCpf` → `erro`, 400, campo `cpf` | "Informe um CPF com 11 dígitos." |
| RG > 20 chars ou com controle | `normalizarRg` → `erro`, 400 | "Informe um RG válido (até 20 caracteres)." |
| Batismo futuro/inexistente | `normalizarDataBatismo` → `erro`, 400 | "Informe uma data de batismo válida." |
| `criado_em` ausente na linha | `calcularValidadeCartao` → `null` → `fmtData(null)` = `—` | Cartão mostra `—`, sem crash |
| Falha de update no banco | erro propaga → 500 (comportamento existente) | "erro_interno" |
| Uniqueness 23505 (autocadastro) | preservado | 409, mensagem existente |

Nenhum erro novo de infraestrutura: os dois handlers já traduzem falha de banco
e 23505.

---

## Risks & Concerns

| Concern | Location | Impact | Mitigation |
| ------- | -------- | ------ | ---------- |
| **RLS sem whitelist de coluna** — `members_update_own` permite ao membro escrever `status`, `matricula` e `criado_em` na própria linha | `supabase/migrations/0001_members_event_notices.sql:52-55` | Um membro poderia se auto-ativar, forjar matrícula ou, **agora**, empurrar `criado_em` para o futuro e inflar a validade do próprio cartão | Os services mantêm a **whitelist explícita** de colunas (`members.ts:104`, `membros.ts:229`) — o corpo do form nunca é espalhado, então nenhum campo sensível é alcançável pela aplicação. O trigger também deriva a validade de `criado_em`. **Hardening de coluna (policy por coluna ou trigger de guarda) fica registrado como follow-up AD-019, fora deste escopo** — é uma mudança de política de segurança que o usuário deve aprovar separadamente |
| Coluna `validade_cartao` não rola com o tempo | `0020` | Quem ler a coluna direto (CSV futuro) vê só o ciclo-base, não o corrente | Documentado na spec e na AD-020; o valor exibido ao membro é o ciclo corrente. A semântica da coluna fica explícita no comentário da migration |
| `Date` em render de RSC com fuso do servidor | `MemberCard` | Vercel roda UTC; `criado_em` é `timestamptz` — o dia da validade pode deslocar | Comparação em `YYYY-MM-DD` com calendário local explícito; `hoje` injetável. Probe fixa `hoje` para tornar o comportamento determinístico e prova a data exata |
| Migration applied em produção com dados | `0024` | Backfill massa em tabela pequena (11 linhas hoje) | Idempotente, só `NULL`, sem DDL destrutivo; gate de contagem antes/depois na probe |
| Formulário do painel é o mesmo de autocadastro | `api/painel/perfil/route.ts` | Campos de documento no primeiro acesso podem gerar atrito | Documento é **opcional** (vazio → `NULL`, sem erro); só a matrícula é obrigatória |

---

## Tech Decisions

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Onde mora a regra | Pure TS, não SQL e não JSX | Testável via `npx tsc` + `node`, sem runner e sem browser (AD-006, padrão AD-018) |
| `hoje` injetado | Parâmetro, nunca `new Date()` dentro da função pura | Determinismo de teste; o lugar que "chama agora" é explícito |
| Limite inclusivo | `aniversario >= hoje` | O cartão não vence no próprio dia do vencimento |
| 29/02 | Clamp para 28/02 | Única data válida; 01/03 inventaria um mês de validade |
| Coluna = ciclo-base | Mantida + trigger | Atende a decisão do usuário; relatório ganha dado sem scheduler |
| Sem validação de DV do CPF | Fora de escopo | Regra de negócio com alcance próprio; spec Out of Scope |
| Sem guard de coluna RLS | Fora de escopo | Mudança de política de segurança exige aprovação própria (AD-019) |

> **Decisões de nível de projeto a registrar em `.specs/STATE.md` como AD:**
> **AD-019** — hardening: `members_update_own` deve restringir colunas
> sensíveis (`status`, `matricula`, `criado_em`) via trigger de guarda.
> **AD-020** — `members.validade_cartao` = ciclo-base (registro + 1 ano),
> mantida por trigger; a validade exibida é o ciclo corrente rolante, calculado
> em `src/lib/painel/validade.ts`. Regra: validade de documento **derivada**,
> não editável.
