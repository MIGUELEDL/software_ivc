"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  SECRETARIA: "Secretaria",
  LIDER: "Líder",
  FINANCEIRO: "Financeiro",
  PATRIMONIAL: "Patrimonial",
  ADMIN: "Administrador",
  SUPER_ADMIN: "Super Admin",
};

export function CreateUserForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("SECRETARIA");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    temporaryPassword?: string;
    error?: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ error: data.error ?? "erro_interno" });
      } else {
        setResult({ temporaryPassword: data.temporaryPassword });
        setEmail("");
        setRole("SECRETARIA");
      }
    } catch {
      setResult({ error: "erro_interno" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-[#132744] border border-white/10 p-6">
      <h2 className="font-sans text-lg font-bold text-[#c9a84c] mb-4 flex items-center gap-2">
        <UserPlus size={18} />
        Criar Usuário
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          placeholder="email@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1 px-3 py-2 rounded-lg bg-[#0d1f3c] border border-white/10 text-white font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="px-3 py-2 rounded-lg bg-[#0d1f3c] border border-white/10 text-white font-sans text-sm focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30"
        >
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-[#c9a84c] text-[#0d1f3c] font-sans text-sm font-bold hover:bg-[#e0c872] transition-colors disabled:opacity-50"
        >
          {loading ? "Criando..." : "Criar"}
        </button>
      </form>

      {result?.temporaryPassword && (
        <div className="mt-4 p-3 rounded-lg bg-green-900/30 border border-green-500/30">
          <p className="font-sans text-sm text-green-400 font-bold mb-1">
            Usuário criado com sucesso!
          </p>
          <p className="font-sans text-xs text-green-400">
            Senha temporária:{" "}
            <code className="bg-green-900/50 px-1 rounded">
              {result.temporaryPassword}
            </code>
          </p>
          <p className="font-sans text-xs text-green-500 mt-1">
            Guarde esta senha — ela não será exibida novamente.
          </p>
        </div>
      )}

      {result?.error && (
        <div className="mt-4 p-3 rounded-lg bg-red-900/30 border border-red-500/30">
          <p className="font-sans text-sm text-red-400">
            {result.error === "email_em_uso"
              ? "Este email já está em uso."
              : result.error === "nao_autorizado"
                ? "Você não tem permissão para criar usuários."
                : "Erro ao criar usuário. Tente novamente."}
          </p>
        </div>
      )}
    </div>
  );
}
