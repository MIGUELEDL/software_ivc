import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MembroDetalhePage from "./page";

const { getClaims, getMembro, listDocumentos, createAdminClient, getUserById } =
  vi.hoisted(() => ({
    getClaims: vi.fn(),
    getMembro: vi.fn(),
    listDocumentos: vi.fn(),
    createAdminClient: vi.fn(),
    getUserById: vi.fn(),
  }));

vi.mock("@/lib/auth/claims", () => ({ getClaims }));
vi.mock("@/lib/auth/rbac", () => ({ can: vi.fn().mockResolvedValue(true) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));
vi.mock("@/lib/admin/membros", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/admin/membros")>()),
  getMembro,
  listDocumentos,
}));
vi.mock("./membro-detalhe-acoes", () => ({
  RemoverDocumentoButton: () => null,
  HardDeleteButton: () => null,
  RedefinirSenhaButton: () => null,
}));
vi.mock("./membro-editar-forms", () => ({
  MembroEditarForms: () => null,
}));

const MEMBRO_FIXTURE = {
  id: "m1",
  auth_user_id: "auth-1",
  nome: "José da Silva",
  nascimento: "22/07/1978",
  whatsapp: "(83) 99999-0000",
  matricula: "0001",
  foto_url: null,
  rg: "123",
  cpf: "456",
  data_batismo: "01/01/2000",
  validade_cartao: "01/01/2030",
  criado_em: "2026-01-01",
  atualizado_em: "2026-01-02",
  status: "ATIVO",
  logradouro: "Rua A",
  numero: "10",
  bairro: "Centro",
  cidade: "Santa Luzia",
  uf: "PB",
  cep: "58000-000",
};

beforeEach(() => {
  vi.clearAllMocks();
  getClaims.mockResolvedValue({ role: "ADMIN" });
  createAdminClient.mockReturnValue({ auth: { admin: { getUserById } } });
  listDocumentos.mockResolvedValue([]);
});

/**
 * ADMINMEM-36: o e-mail (auth.users via getUserById) aparece no bloco de
 * contatos. ADMINMEM-37: falha da consulta → fallback "—".
 */
describe("/admin/membros/[id] — e-mail (ADMINMEM-36/37)", () => {
  it("exibe o e-mail do auth user no bloco de contatos", async () => {
    getMembro.mockResolvedValue(MEMBRO_FIXTURE);
    getUserById.mockResolvedValue({
      data: { user: { email: "jose@exemplo.com" } },
      error: null,
    });

    const html = renderToStaticMarkup(
      await MembroDetalhePage({ params: Promise.resolve({ id: "m1" }) })
    );

    expect(html).toContain("jose@exemplo.com");
    expect(html).toContain("E-mail");
  });

  it("ADMINMEM-37: fallback '—' quando a consulta de auth falha", async () => {
    getMembro.mockResolvedValue(MEMBRO_FIXTURE);
    getUserById.mockRejectedValue(new Error("auth down"));

    const html = renderToStaticMarkup(
      await MembroDetalhePage({ params: Promise.resolve({ id: "m1" }) })
    );

    expect(html).not.toContain("jose@exemplo.com");
    expect(html).toMatch(/E-mail<\/dt><dd[^>]*>—</);
  });

  it("ADMINMEM-37: '—' quando o auth user não tem e-mail", async () => {
    getMembro.mockResolvedValue(MEMBRO_FIXTURE);
    getUserById.mockResolvedValue({ data: { user: { email: null } }, error: null });

    const html = renderToStaticMarkup(
      await MembroDetalhePage({ params: Promise.resolve({ id: "m1" }) })
    );

    expect(html).toMatch(/E-mail<\/dt><dd[^>]*>—</);
  });
});
