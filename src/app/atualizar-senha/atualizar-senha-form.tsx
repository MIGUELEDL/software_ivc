"use client";

import Link from "next/link";
import { KeyRound, Loader2, MailPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PasswordInput } from "@/components/PasswordInput";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Estado = "verificando" | "pronto" | "sem-sessao";

const ERROS_SERVIDOR: Record<string, string> = {
  weak_password:
    "A senha não atende aos requisitos: mínimo 8 caracteres, com letra e número.",
  auth_required:
    "Sessão de recuperação ausente ou expirada. Peça um novo link.",
};

/**
 * /atualizar-senha (SEN-02/03): detecta a sessão de recovery criada pelo
 * detectSessionInUrl do @supabase/ssr (link do e-mail troca o code PKCE no
 * mount). Com sessão → form nova senha + confirmação (POST no servidor faz
 * updateUser + limpa force_password_change + redireciona ao login). Link
 * inválido/expirado (error do GoTrue na URL) ou sem sessão → estado de erro
 * com ação "pedir novo link".
 */
export function AtualizarSenhaForm({ serverError }: { serverError: string | null }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [estado, setEstado] = useState<Estado>("verificando");
  const [errors, setErrors] = useState<{
    password?: string;
    confirm?: string;
  }>({});

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let cancelado = false;
    let obs: { subscription: { unsubscribe: () => void } } | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const parar = () => {
      cancelado = true;
      obs?.subscription.unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };

    // Link inválido/expirado: GoTrue redireciona com ?error=.../#error=...
    // (códigos nossos weak_password/auth_required vêm do servidor, não aqui).
    // Microtask evita setState síncrono no corpo do effect e roda antes das
    // respostas de sessão — erro do link prevalece sobre sessão existente.
    queueMicrotask(() => {
      if (cancelado) return;
      const query = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const erroGoTrue =
        query.get("error_code") ??
        (query.get("error") !== "weak_password" &&
        query.get("error") !== "auth_required"
          ? query.get("error")
          : null) ??
        hash.get("error");
      if (erroGoTrue) {
        parar();
        setEstado("sem-sessao");
        return;
      }
      timeoutId = setTimeout(() => {
        if (!cancelado) {
          parar();
          setEstado("sem-sessao");
        }
      }, 5000);
    });

    obs = supabase.auth.onAuthStateChange((_evento, session) => {
      if (!cancelado && session) {
        parar();
        setEstado("pronto");
      }
    }).data;

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelado && data.session) {
        parar();
        setEstado("pronto");
      }
    });

    return parar;
  }, []);

  function validate() {
    const form = formRef.current;
    if (!form) return false;

    const password = String(
      (form.elements.namedItem("new_password") as HTMLInputElement)?.value ?? ""
    );
    const confirm = String(
      (form.elements.namedItem("confirm_password") as HTMLInputElement)
        ?.value ?? ""
    );

    const newErrors: typeof errors = {};

    if (password.length < 8) {
      newErrors.password = "A senha deve ter no mínimo 8 caracteres.";
    } else if (!/[a-zA-Z]/.test(password)) {
      newErrors.password = "A senha deve conter ao menos uma letra.";
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = "A senha deve conter ao menos um número.";
    }

    if (password !== confirm) {
      newErrors.confirm = "As senhas não coincidem.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  if (estado === "verificando") {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 py-8 text-center"
      >
        <Loader2 size={24} className="animate-spin text-primary" aria-hidden="true" />
        <p className="font-serif text-sm text-text-dark/60">
          Verificando o link de recuperação…
        </p>
      </div>
    );
  }

  if (estado === "sem-sessao") {
    return (
      <div role="alert" className="text-center">
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-serif">
          O link é inválido, expirado ou já foi usado. Peça um novo para
          continuar.
        </div>
        <Link
          href="/alterar-senha"
          className="inline-flex items-center gap-2 rounded-lg bg-primary hover:bg-primary-light text-white font-sans font-bold px-5 py-2.5 transition-colors"
        >
          <MailPlus size={16} aria-hidden="true" />
          Pedir novo link
        </Link>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action="/api/auth/atualizar-senha"
      method="POST"
      className="space-y-5"
      onSubmit={(e) => {
        if (!validate()) {
          e.preventDefault();
        }
      }}
    >
      {serverError && ERROS_SERVIDOR[serverError] && (
        <p role="alert" className="text-sm text-red-600 font-serif">
          {ERROS_SERVIDOR[serverError]}
        </p>
      )}

      <div>
        <label
          htmlFor="new_password"
          className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
        >
          Nova senha
        </label>
        <PasswordInput
          id="new_password"
          name="new_password"
          required
          minLength={8}
          autoComplete="new-password"
          inputClassName="w-full rounded-lg border border-gray-300 px-4 py-2.5 font-serif text-text-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600 font-serif">
            {errors.password}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="confirm_password"
          className="block font-sans text-sm font-semibold text-text-dark mb-1.5"
        >
          Confirmar senha
        </label>
        <PasswordInput
          id="confirm_password"
          name="confirm_password"
          required
          minLength={8}
          autoComplete="new-password"
          inputClassName="w-full rounded-lg border border-gray-300 px-4 py-2.5 font-serif text-text-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
        />
        {errors.confirm && (
          <p className="mt-1 text-sm text-red-600 font-serif">
            {errors.confirm}
          </p>
        )}
      </div>

      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary hover:bg-primary-light text-white font-sans font-bold py-2.5 transition-colors"
      >
        <KeyRound size={16} aria-hidden="true" />
        Salvar nova senha
      </button>
    </form>
  );
}
