"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

type PasswordInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  /** Classe do <input>; o wrapper é relativo para posicionar o olho. */
  inputClassName?: string;
};

/**
 * Campo de senha com olho de mostrar/ocultar (SEN-06): alterna apenas o
 * atributo type do input — name/value/required seguem intactos para o
 * formulário HTML continuar submetendo igual. Botão com aria-label
 * explícito e focus ring.
 */
export function PasswordInput({
  inputClassName = "",
  ...props
}: PasswordInputProps) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visivel ? "text" : "password"}
        className={`${inputClassName} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visivel}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-primary/50 hover:text-primary/80 focus:outline-none"
      >
        {visivel ? (
          <EyeOff size={18} aria-hidden="true" />
        ) : (
          <Eye size={18} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
