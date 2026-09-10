# Auth — Contexto (decisões da discussão)

Discussão orientada com o administrador em 2026-09-10. Decisões confirmadas que
baseiam esta spec (registradas em `.specs/STATE.md` como AD-013):

| # | Tema | Decisão | Confirmed? |
| - | ---- | ------- | ---------- |
| D1 | Provedor de auth | **Supabase Auth nativo (GoTrue)** com `@supabase/ssr` (substitui a AD-004, que previa Auth.js/NextAuth). Hash de senha, sessão, refresh e rate limit ficam a cargo do Supabase. | ✅ |
| D2 | Entrega da senha-ID (RN-002) | Entrega **manual** pela liderança: a liderança cria o usuário/gera a senha-ID temporária e entrega fora do sistema (WhatsApp/papel). Sem envio automático de e-mail no MVP. | ✅ |
| D3 | Escopo da feature | **Só a autenticação**: `/login` (membro) e `/login/admin`, sessão, RBAC de rotas, senha-ID com troca obrigatória, `/trocar-senha`, logout, landings mínimos `/painel` e `/admin`. Os painéis reais (RF-012..015, RF-021..030) e a gestão de usuários (RF-028) ficam em features seguintes. | ✅ |
| D4 | Estrutura de login | **Logins separados membro/admin**: `/login` (membro) e `/login/admin`. Sessão única do Supabase; o papel (em `app_metadata.role`) decide a área liberada. | ✅ |
| D5 | Criação do 1º admin | **Script seed local** (`seed:admin`) usando a service-role key: cria o SUPER_ADMIN inicial com senha-ID temporária e flag de troca obrigatória. | ✅ |
| D6 | Destino pós-login | Landings mínimos **`/painel`** (membro) e **`/admin`** (admin): exibem sessão (e-mail + papel) e botão de logout. Viram placeholders dos painéis reais depois. | ✅ |
| D7 | Troca obrigatória | **Bloqueia o painel até trocar**: com flag de troca obrigatória, qualquer rota protegida redireciona para `/trocar-senha`; só depois de trocar libera `/painel` ou `/admin` (RN-002). A senha-ID antiga não funciona mais (expirada). | ✅ |

## Decisões técnicas (discretion, para o design)

- **Dependências novas**: `@supabase/ssr` + `@supabase/supabase-js`. Sem lib de validação (validação server-side manual simples — RC-001 custo ≈ 0).
- **Env**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (novo formato `sb_publishable_...`; anon legado aceito até fim de 2026), `SUPABASE_SERVICE_ROLE_KEY` (server-side/seed). Chave service-role só no servidor (.env.local, nunca no cliente/git).
- **Rotas protegidas**: `/painel/:path*` e `/admin/:path*` via `proxy.ts` (Next 16 — middleware renomeado), com matcher negativo; checagem real por `getClaims()` na camada de dados.
- **Papel**: `app_metadata.role` (não-editável pelo usuário), exposto no JWT e lido via `getClaims()`.
- **Flag de 1º acesso**: `app_metadata.force_password_change = true`, limpo server-side (service-role) ao concluir a troca.
- **Navbar**: não é alterado nesta feature (é SSG estático); o link de área autenticada entra com os painéis reais.
- **Rate limiting**: nativo do Supabase (signInWithPassword, ~60/hora/IP padrão) — rege RNF-004 parcial; sem implementação própria no MVP.