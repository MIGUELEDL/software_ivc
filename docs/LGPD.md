# LGPD — IVC

Adequação da plataforma à **Lei Geral de Proteção de Dados (Lei 13.709/2018)**.
Requisito: **RNF-005** (política de privacidade + consentimentos + DPIA).
As medidas técnicas complementares estão em `docs/SECURITY.md`.

## Enquadramento

A IVC coleta dados pessoais de membros (nome, nascimento → idade/aniversário, contato,
foto) e de visitantes que doam ou interagem. A igreja é **controladora**; a plataforma
é o **meio** de tratamento. Volume baixo (≈30–50 membros) — mitigação proporcional ao
porte (LGPD art. 4º, §1º e princípio da proporcionalidade).

## Dados pessoais tratados

| Dado | Onde | Finalidade | Base legal |
| ---- | ---- | ---------- | ---------- |
| Nome, nascimento, aniversário, idade | Painel membro / cadastro | Registro do membro; futuros cartões de membro | Consentimento legítimo (finalidade religiosa) |
| E-mail / telefone | Painel membro / avisos | Comunicação com o membro (avisos de eventos) | Legítimo interesse / consentimento |
| Endereço/contatos | Cadastro de membro | Registro institucional | Consentimento |
| Foto (4x4) | Perfil do membro | Cartão de membro / identificação | Consentimento explícito |
| Doações (PIX) | Financeiro | Recebimento e controle de ofertas | Legítimo interesse + obrigação fiscal |
| Dados de acesso/auditoria | `audit_logs` | Segurança e auditoria (RN-004) | Legítimo interesse |

> **Decisão do administrador:** o painel do membro serve ao **registro e manutenção
> dos próprios dados** (e não a extrato de doações). Isso **minimiza** o tratamento
> financeiro exposto ao membro — alinhado ao princípio da minimização (art. 6º, III).

## Princípios aplicados (art. 6º)

- **Finalidade:** dados coletados só para as finalidades declaradas acima.
- **Minimização:** apenas dados necessários ao cadastro/cartão; sem extrato no painel
  membro; QR PIX público não exige cadastro.
- **Transparência:** política de privacidade acessível no portal.
- **Segurança:** medidas técnicas (ver `SECURITY.md`) e organizacionais.
- **Proporcionalidade:** controles dimensionados ao porte e ao risco (DART ~baixo).

## Obrigações operacionais

1. **Política de privacidade** a publicar no portal (RNF-005) — linguagem simples,
   informando: dados coletados, finalidade, base legal, compartilhamento (Supabase,
   Mercado Pago, Vercel e Sentry), direitos do titular e contato do encarregado.
2. **Consentimento** explícito no cadastro de membro (checkbox) e na captura de foto;
   registrado em log (quem, quando, qual versão da política).
3. **Encargado (DPO):** indicar um responsável pela resposta aos titulares
   (endereço de contato = encarregado). A liderança define o nome.
4. **Direitos do titular (art. 18):** confirmar existência, acesso, correção,
   anonimização/eliminação, portabilidade. Implementados via painel admin
   (secretaria/admin) + fluxo de contato; revisão na feature de membros.
5. **DPIA (RNF-005):** registro de **DPIA simplificada e proporcional ao porte** — dado
   o volume baixo (~30–50 membros) e o risco reduzido, manter um registro documentado das
   bases de tratamento e das mitigações. O primeiro rascunho entra na Fase 9 (feature de
   privacidade) e é validado com a liderança.
6. **Retenção:** manter dados apenas enquanto durar a finalidade; política de eliminação
   a definir com a liderança (ex.: baixa do membro → anonimização após período definido).
7. **Incidentes:** procedimento de notificação à ANPD e aos titulares quando houver
   risco relevante (art. 48); tempo-alvo documentado com a liderança.

## Compartilhamento (operadores)

Os provedores atuam como operadores/subprocessadores: **Supabase** (hospedagem de dados),
**Vercel** (hospedagem do app), **Mercado Pago** (processamento PIX) e **Sentry**
(observabilidade, sem PII). Contratos/termos de cada provedor cobrem o papel de
operador; minimizar PII enviada a esses serviços. Não há envio de e-mail
transacional: a senha-ID do primeiro acesso é entregue manualmente pela liderança.

## Fluxo para o titular

Pedido de acesso/correção/exclusão → recebido pelo encarregado (e-mail institucional) →
tratado em prazo ≤ 15 dias (art. 19) → registro de auditoria da ação.

## Referências

- `docs/SECURITY.md` — medidas técnicas (auth, RBAC, RLS, auditoria)
- `docs/REQUIREMENTS.md` — RNF-005 e demais RN
- `docs/COSTS.md` — custo zero (ferramentas com planos free não alteram TCO)