"use client";

import { useRef, useState } from "react";
import { PasswordInput } from "@/components/PasswordInput";

export function TrocarSenhaForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<{
    password?: string;
    confirm?: string;
  }>({});

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

  return (
    <form
      ref={formRef}
      action="/api/auth/trocar-senha"
      method="POST"
      className="space-y-5"
      onSubmit={(e) => {
        if (!validate()) {
          e.preventDefault();
        }
      }}
    >
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
        className="w-full rounded-lg bg-accent hover:bg-accent-light text-bg-dark font-sans font-bold py-2.5 transition-colors"
      >
        Trocar senha
      </button>
    </form>
  );
}
