# Painel Membro Context

**Gathered:** 2026-09-11
**Spec:** `.specs/features/painel-membro/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Área autenticada `/painel` com 4 frentes: avisos (RF-012, landing `/painel`), QR de dízimo pessoal (RF-013, `/painel/dizimo`), cartão de membro (RF-014, `/painel/cartao`) e perfil com autocadastro + foto (RF-015, `/painel/perfil`). Dados vêm de tabelas novas no Postgres (`members`, `event_notices`) com RLS por propriedade; foto em Supabase Storage. Fora: admin CRUD (RF-022/RF-024), extrato (RF-016), financeiro/webhook (RF-026).

---

## Implementation Decisions

### A. Tabela `members` no Postgres

- Dados de RF-014/RF-015 vivem na tabela `members` (registro oficial; RF-022 lerá depois).
- Vínculo com sessão via `auth_user_id` (uuid único, `references auth.users(id)`), RLS `auth.uid() = auth_user_id`.
- Campos: nome (obrigatório), nascimento (date), whatsapp (obrigatório), foto_url (nullable), matricula (`IVC-####` gerada no cadastro).
- Autocadastro cria o registro no primeiro acesso (E); edição atualiza o mesmo registro.

### B. Tabela `event_notices` para avisos RF-012

- Avisos no Postgres; público continua `EVENTS` estático (AD-008 preservado).
- Campos: título, data/hora, corpo/conteúdo, visível (bool).
- `/painel` lista visíveis ordenados por data desc; vazio → mensagem amigável.

### C. Identificação do dízimo no payload PIX

- QR pessoal = mesma chave institucional (CNPJ, RN-001/AD-012), mas campo de referência do BR Code identifica a matrícula do membro (conciliação manual, sem extrato).
- Reusa `buildBrCode` de `src/lib/pix.ts` com parâmetro extra (matrícula no campo 62/05 no lugar do TXID `***`).
- Renderização e "código copia-e-cola" seguem o padrão de `PixDonation.tsx`.

### D. Cartão digital + impressão

- Cartão na tela: nome, matrícula, igreja, foto 4x4 (placeholder se ausente).
- Botão imprimir → CSS print isolando só o cartão.

### E. Autocadastro no primeiro acesso

- `/painel/perfil` sem registro → formulário completo; na primeira submissão cria `members` ligado ao `auth.uid()` e gera matrícula.
- Com registro → formulário preenchido para edição.

### F. Campos editáveis

- Nome, nascimento, WhatsApp + foto 4x4 (jpeg/png/webp ≤ 2MB, renderizada 1:1).
- Endereço/documento ficam para RF-022 (LGPD).

---

## Agent's Discretion

- Validação de nascimento: idade > 120 anos também rejeitada (bound adicional do spec).
- Matrícula: formato `IVC-####` sequencial (máximo 9999 membros — folga vs ~50 reais).
- Fotografia: crop quadrado feito no browser via `object-fit` (sem lib) — 1:1.
- Mensagens de erro/sucesso: estilo consistente com `PixDonation.tsx` e alerts do projeto.
- Ordenação/pesquisa dos avisos: apenas ordenação por data (sem paginação no MVP, volume baixo).

---

## Declined / Undiscussed Gray Areas → Assumptions

Nenhuma área foi recusada; todas as propostas foram aceitas (A–F acima).

---

## Specific References

- "Avisos iguais à landing de eventos" → estado vazio amigável no padrão de `/eventos`.
- "QR de dízimo igual ao da doação, só que identificado" → reuso visual de `PixDonation.tsx`.

---

## Deferred Ideas

- Extrato/histórico de doações do membro (RF-016) — removido por decisão do admin; QR identificado cobre conciliação.
- Máscara de WhatsApp e formatação de telefone — iteração futura.
- Crop interativo de foto 4x4 — iteração futura (MVP renderiza 1:1).
- Paginação/infinito scroll de avisos — não necessário no volume atual.