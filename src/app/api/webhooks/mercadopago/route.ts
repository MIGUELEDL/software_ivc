import { NextResponse } from "next/server";

import { logger, reportError } from "@/lib/observability/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/webhooks/mercadopago — webhook stub do Mercado Pago (FIN-06/07/08,
 * AC-13..19). Sem auth (chamado pelos servidores do MP — AC-18); valida a
 * estrutura do payload e loga **todos** os eventos em `webhook_events`
 * (auditabilidade, AC-19). A escrita usa o client service-role
 * (`createAdminClient`, BYPASSRLS): `webhook_events` tem RLS sem INSERT para
 * anon/authenticated (migration 0023) — o evento só entra via service-role.
 *
 * Idempotência (AC-14): `event_id` = campo `id` do body (fallback UUID);
 * UNIQUE violado → 200 `{ ok: true }` sem duplicar.
 *
 * Pagamento `approved` (AC-16/17): quando `data.status === "approved"` e o
 * evento é de pagamento (`type=payment` ou `action` contém
 * `payment.created`/`payment.updated`), cria/atualiza a transação com
 * `external_reference = data.id`. As tabelas `transactions`/`cash_closes` TÊM
 * RLS `can_access('financeiro', ...)` (sem anon) — o webhook não tem sessão de
 * usuário, portanto a escrita usa o client service-role (ignora RLS). Sem
 * service-role disponível, o endpoint responde 200 stub (R-003) sem logar nem
 * escrever transação (MP real ainda não configurado).
 *
 * Status != "approved" → apenas log, sem transação (AC-17). Sucesso → 200
 * `{ ok: true }` (AC-13). Payload JSON inválido → 400 `{ error:
 * "payload_invalido" }` (AC-15).
 */
export async function POST(request: Request) {
  let body: Record<string, unknown> | null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "payload_invalido" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "payload_invalido" }, { status: 400 });
  }

  const eventId =
    typeof body.id === "string" && body.id.trim() !== ""
      ? body.id.trim()
      : globalThis.crypto.randomUUID();
  const eventType = typeof body.type === "string" ? body.type : "unknown";

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    logger.warn(
      "POST /api/webhooks/mercadopago — service-role indisponivel, stub sem log"
    );
    return NextResponse.json({ ok: true });
  }

  const { data: evento, error: erroInsert } = await admin
    .from("webhook_events")
    .insert({
      event_id: eventId,
      event_type: eventType,
      payload: body,
    })
    .select("id")
    .single();

  if (erroInsert) {
    // UNIQUE (event_id) violado = evento já processado → idempotente (AC-14).
    if (erroInsert.code === "23505") {
      return NextResponse.json({ ok: true });
    }
    reportError(erroInsert, {
      evento: "POST /api/webhooks/mercadopago — log de evento",
      meta: { event_id: eventId, event_type: eventType },
    });
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }

  // Detecção de pagamento aprovado (AC-16): `type=payment` (ou action de
  // payment.created/updated) com `data.status === "approved"`.
  const action = typeof body.action === "string" ? body.action : "";
  const ehEventoPagamento =
    eventType === "payment" ||
    action.includes("payment.created") ||
    action.includes("payment.updated");

  const payloadData =
    typeof body.data === "object" && body.data !== null
      ? (body.data as Record<string, unknown>)
      : null;
  const statusAprovado = payloadData?.status === "approved";
  const paymentId =
    typeof payloadData?.id === "string" ? payloadData.id : null;

  if (!ehEventoPagamento || !statusAprovado || !paymentId) {
    // Status != approved → apenas log (AC-17).
    return NextResponse.json({ ok: true });
  }

  // -------------------------------------------------------------------------
  // Pagamento aprovado → cria (sem external_reference igual) ou concilia
  // (atualiza status para CONCILIADO) a transação (AC-16, edge-case). Escrita
  // direta no handler pois o service layer depende de sessão (cookie) que o
  // webhook não tem; RLS exige serviço com service-role.
  // -------------------------------------------------------------------------
  try {
    const { data: existente, error: erroBusca } = await admin
      .from("transactions")
      .select("id")
      .eq("external_reference", paymentId)
      .maybeSingle();

    if (erroBusca) {
      reportError(erroBusca, {
        evento: "POST /api/webhooks/mercadopago — busca external_reference",
        meta: { event_id: eventId },
      });
      return NextResponse.json({ error: "erro_interno" }, { status: 500 });
    }

    const valor =
      typeof payloadData.transaction_amount === "number" &&
      payloadData.transaction_amount >= 0
        ? payloadData.transaction_amount
        : 0;
    const descricao =
      typeof payloadData.description === "string" &&
      payloadData.description.trim() !== ""
        ? payloadData.description.trim()
        : "Doação PIX (webhook)";
    const hoje = new Date().toISOString().slice(0, 10);

    if (existente) {
      const { error: erroUpdate } = await admin
        .from("transactions")
        .update({
          status: "CONCILIADO",
          webhook_event_id: evento.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existente.id);

      if (erroUpdate) {
        reportError(erroUpdate, {
          evento: "POST /api/webhooks/mercadopago — concilia transacao",
          meta: { event_id: eventId },
        });
        return NextResponse.json({ error: "erro_interno" }, { status: 500 });
      }
    } else {
      const { error: erroCreate } = await admin.from("transactions").insert({
        descricao,
        valor,
        tipo: "RECEITA",
        metodo: "PIX",
        status: "CONCILIADO",
        data: hoje,
        external_reference: paymentId,
        webhook_event_id: evento.id,
      });

      if (erroCreate) {
        reportError(erroCreate, {
          evento: "POST /api/webhooks/mercadopago — cria transacao",
          meta: { event_id: eventId },
        });
        return NextResponse.json({ error: "erro_interno" }, { status: 500 });
      }
    }
  } catch {
    // Service-role indisponível (chave pendente, ver STATE.md): evento já foi
    // logado — segue em modo stub sem escrever a transação.
    logger.warn(
      "POST /api/webhooks/mercadopago — service-role indisponivel, transacao pulada"
    );
  }

  return NextResponse.json({ ok: true });
}