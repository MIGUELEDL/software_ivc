"use client";

import Link from "next/link";
import { ArrowLeft, MailCheck, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Estado = "idle" | "enviando" | "enviado" | "erro";

/**
 * /alterar-senha (SEN-01): botão "Enviar link de confirmação" chama
 * resetPasswordForEmail com redirect para /atualizar-senha (Supabase nativo,
 * sem Resend). Se houver sessão, o e-mail vem preenchido dela; sem sessão o
 * usuário digita. Sucesso → estado "Confira seu e-mail"; falha (rate limit
 * etc.) → mensagem de erro com reenvio.
 */
export default function AlterarSenhaPage() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<Estado>("idle");
  const [erro, setErro] = useState("");

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user.email) {
        setEmail(data.session.user.email);
      }
    });
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const alvo = email.trim();
    if (!alvo) return;

    setErro("");
    setEstado("enviando");
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(alvo, {
      redirectTo: `${window.location.origin}/atualizar-senha`,
    });

    if (error) {
      setErro(error.message);
      setEstado("erro");
      return;
    }
    setEstado("enviado");
  }

  return (
    <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
      <div className="max-w-md mx-auto px-4">
        <div className="rounded-2xl bg-white shadow-xl p-8 sm:p-12">
          <div className="text-center mb-8">
            <h1 className="font-sans text-3xl font-bold text-primary mb-2">
              Alterar senha
            </h1>
            <p className="font-serif text-base text-text-dark/60">
              Enviaremos um link de confirmação para o seu e-mail.
            </p>
          </div>

          {estado === "enviado" ? (
            <div role="status" className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200">
                <MailCheck size={22} className="text-emerald-600" aria-hidden="true" />
              </div>
              <p className="font-sans text-lg font-bold text-primary mb-1">
                Confira seu e-mail
              </p>
              <p className="font-serif text-sm text-text-dark/60 mb-6">
                Se existir uma conta para <strong>{email.trim()}</strong>, você
                receberá um link para criar uma nova senha. O link expira em 1
                hora.
              </p>
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEstado("idle")}
                  className="font-sans text-sm font-bold text-primary hover:text-accent transition-colors"
                >
                  Reenviar link
                </button>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 font-sans text-sm font-bold text-primary/60 hover:text-primary transition-colors"
                >
                  <ArrowLeft size={14} aria-hidden="true" />
                  Voltar ao login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={enviar} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
                >
                  E-mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 font-serif text-text-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>

              {estado === "erro" && erro && (
                <p role="alert" className="text-sm text-red-600 font-serif">
                  {erro}
                </p>
              )}

              <button
                type="submit"
                disabled={estado === "enviando"}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary-light disabled:opacity-60 text-white font-sans font-bold py-2.5 transition-colors"
              >
                <Send size={16} aria-hidden="true" />
                {estado === "enviando" ? "Enviando…" : "Enviar link de confirmação"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
