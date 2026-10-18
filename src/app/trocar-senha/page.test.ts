import { createElement } from "react";
import type { AnchorHTMLAttributes } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TrocarSenhaPage from "./page";

const { getClaims } = vi.hoisted(() => ({ getClaims: vi.fn() }));

vi.mock("@/lib/auth/claims", () => ({ getClaims }));
vi.mock("next/link", () => ({
  default: function LinkMock({
    href,
    children,
    ...rest
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
    return createElement("a", { href, ...rest }, children);
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  getClaims.mockResolvedValue({ role: "MEMBRO" });
});

function montar(params: Record<string, string>) {
  return TrocarSenhaPage({ searchParams: Promise.resolve(params) });
}

/**
 * AUTH-20/21/23/24: caixa de sucesso no ?success=1 com destino por papel;
 * sem o parâmetro, form e mensagens de erro continuam como antes.
 */
describe("/trocar-senha — página (AUTH-20/21/23/24)", () => {
  it("AUTH-20/21: com success=1 e papel MEMBRO, mostra a caixa e link para /painel", async () => {
    getClaims.mockResolvedValue({ role: "MEMBRO" });
    const html = renderToStaticMarkup(await montar({ success: "1" }));

    expect(html).toContain("Troca de senha concluída");
    expect(html).toContain("nova senha já está registrada");
    expect(html).toContain('href="/painel"');
    expect(html).toContain("Ir para o painel");
    // Caixa substitui o form
    expect(html).not.toContain("Nova senha");
  });

  it("AUTH-21: com success=1 e papel admin, o link aponta para /admin", async () => {
    getClaims.mockResolvedValue({ role: "ADMIN" });
    const html = renderToStaticMarkup(await montar({ success: "1" }));

    expect(html).toContain("Troca de senha concluída");
    expect(html).toContain('href="/admin"');
    expect(html).not.toContain('href="/painel"');
  });

  it("sem success, renderiza o form de troca", async () => {
    const html = renderToStaticMarkup(await montar({}));

    expect(html).toContain("Nova senha");
    expect(html).toContain("Confirmar senha");
    expect(html).not.toContain("Troca de senha concluída");
  });

  it("AUTH-23: mantém a mensagem de senha fraca com o form", async () => {
    const html = renderToStaticMarkup(
      await montar({ error: "weak_password" })
    );

    expect(html).toContain("A senha não atende aos requisitos");
    expect(html).toContain("Nova senha");
  });

  it("AUTH-24: mantém a mensagem de sessão ausente com o form", async () => {
    const html = renderToStaticMarkup(await montar({ error: "auth_required" }));

    expect(html).toContain("Sessão não encontrada");
    expect(html).toContain("Nova senha");
  });
});
