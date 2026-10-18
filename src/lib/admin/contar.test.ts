import { beforeEach, describe, expect, it, vi } from "vitest";

import { contarMembros } from "./membros";
import { contarLancamentos } from "./financeiro";
import { contarAuditoria } from "./auditoria";
import { contarDocumentos } from "./relatorios";

const { createServerClient } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createServerClient }));

function montarChain(count: number | null, error: unknown = null) {
  const select = vi.fn().mockResolvedValue({ count, error });
  const from = vi.fn().mockReturnValue({ select });
  createServerClient.mockReturnValue({ from });
  return { from, select };
}

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * TAB-02: as quatro contagens globais usam head + count exact na tabela da
 * listagem, sem filtros — o total não acompanha busca/status/período.
 */
describe("contagens globais (TAB-02)", () => {
  it("contarMembros: head count na tabela members, sem filtros", async () => {
    const { from, select } = montarChain(12);

    await expect(contarMembros()).resolves.toBe(12);

    expect(from).toHaveBeenCalledWith("members");
    expect(select).toHaveBeenCalledWith("id", { count: "exact", head: true });
  });

  it("contarLancamentos: head count na tabela transactions, sem filtros", async () => {
    const { from, select } = montarChain(7);

    await expect(contarLancamentos()).resolves.toBe(7);

    expect(from).toHaveBeenCalledWith("transactions");
    expect(select).toHaveBeenCalledWith("id", { count: "exact", head: true });
  });

  it("contarAuditoria: head count na tabela audit_logs, sem filtros", async () => {
    const { from, select } = montarChain(30);

    await expect(contarAuditoria()).resolves.toBe(30);

    expect(from).toHaveBeenCalledWith("audit_logs");
    expect(select).toHaveBeenCalledWith("id", { count: "exact", head: true });
  });

  it("contarDocumentos: head count na tabela documents, sem filtros", async () => {
    const { from, select } = montarChain(3);

    await expect(contarDocumentos()).resolves.toBe(3);

    expect(from).toHaveBeenCalledWith("documents");
    expect(select).toHaveBeenCalledWith("id", { count: "exact", head: true });
  });

  it("contarMembros propaga erro de banco (página omite o bloco — TAB-04)", async () => {
    montarChain(null, new Error("db down"));

    await expect(contarMembros()).rejects.toThrow("db down");
  });

  it("contagem nula (count ausente) vira 0", async () => {
    montarChain(null);

    await expect(contarDocumentos()).resolves.toBe(0);
  });
});
