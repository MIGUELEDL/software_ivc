/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MemberCard } from "./MemberCard";
import type { Member } from "@/lib/painel/members";

afterEach(cleanup);

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={props.src} alt={props.alt} />
  ),
}));

function membro(nome: string): Member {
  return {
    id: "m1",
    auth_user_id: "auth-1",
    nome,
    nascimento: "1978-07-22",
    whatsapp: "(83) 99999-0000",
    matricula: "IVC-0001",
    foto_url: null,
    rg: null,
    cpf: null,
    data_batismo: null,
    validade_cartao: null,
    criado_em: "2026-01-01",
    atualizado_em: "2026-01-01",
  };
}

/**
 * CART-17..19: a barra ID/NOME do cartão — nome longo corta com elipsis
 * (fonte fixa 2.5cqw, decisão E), nome curto aparece integral e o aspecto
 * ISO ID-1 do cartão não muda.
 */
describe("MemberCard — barra ID/NOME (CART-17..19)", () => {
  it("CART-17: nome de 80+ caracteres fica com truncate (elipsis) na barra", () => {
    const nomeLongo =
      "Maria da Conceição Nascimento de Oliveira e Silva Santos Filha";
    render(<MemberCard member={membro(nomeLongo)} />);

    const nome = screen.getByText(nomeLongo);
    expect(nome.className).toContain("truncate");
    expect(nome.className).toContain("min-w-0");
    // fonte fixa (decisão E) — não encolhe para caber
    expect(nome.className).toContain("text-[2.5cqw]");
  });

  it("CART-18: nome curto aparece integralmente na barra", () => {
    render(<MemberCard member={membro("Ana Costa")} />);

    expect(screen.getByText("Ana Costa")).toBeTruthy();
    // ID sempre visível ao lado
    expect(screen.getByText("IVC-0001")).toBeTruthy();
  });

  it("CART-19: aspecto ISO ID-1 do cartão inalterado", () => {
    const { container } = render(<MemberCard member={membro("Ana")} />);

    const card = container.querySelector("#cartao-membro");
    expect(card?.className).toContain("aspect-[85.6/53.98]");
  });
});
