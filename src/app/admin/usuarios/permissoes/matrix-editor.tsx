"use client";

import { useState } from "react";
import { Save } from "lucide-react";

interface MatrixEditorProps {
  roles: string[];
  modules: string[];
  roleLabels: Record<string, string>;
  moduloLabels: Record<string, string>;
  initialCells: Record<string, string>;
}

const NIVEIS = ["ler", "escrever", "administrar", ""] as const;

const NIVEL_COLORS: Record<string, string> = {
  ler: "bg-blue-100 text-blue-800",
  escrever: "bg-green-100 text-green-800",
  administrar: "bg-purple-100 text-purple-800",
  "": "bg-gray-50 text-gray-400",
};

export function MatrixEditor({
  roles,
  modules,
  roleLabels,
  moduloLabels,
  initialCells,
}: MatrixEditorProps) {
  const [cells, setCells] = useState(initialCells);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  function handleChange(role: string, module: string, nivel: string) {
    setCells((prev) => ({ ...prev, [`${role}:${module}`]: nivel }));
  }

  async function handleSave() {
    setSaving(true);
    setFeedback(null);
    const updates = roles.flatMap((role) =>
      modules.map((module) => ({
        role,
        module,
        nivel: cells[`${role}:${module}`] || "",
      }))
    );
    try {
      const res = await fetch("/api/admin/usuarios/permissoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "error", message: data.error ?? "erro_interno" });
      } else {
        setFeedback({
          type: "success",
          message: `${data.updated} permissões atualizadas.`,
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Erro de conexão." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl hero-background-admin shadow-xl overflow-hidden">
      <div className="p-4 border-b border-white/30 flex items-center justify-between">
        <span className="font-sans text-sm text-white/70">
          {roles.length} papéis × {modules.length} módulos
        </span>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white font-sans text-sm font-bold hover:bg-accent-light/40 hover:text-accent-light transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Save size={14} />
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>

      {feedback && (
        <div
          className={`px-4 py-2 text-sm font-sans ${
            feedback.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/30">
              <th className="px-4 py-3 font-sans text-xs font-bold text-white/70 uppercase sticky left-0 hero-background-admin">
                Papel
              </th>
              {modules.map((m) => (
                <th
                  key={m}
                  className="px-3 py-3 font-sans text-xs font-bold text-white/70 uppercase text-center"
                >
                  {moduloLabels[m] ?? m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr
                key={role}
                className="border-b border-white/30 hover:bg-white/20 transition-colors"
              >
                <td className="px-4 py-3 font-sans text-sm font-bold text-white/80 sticky left-0 hero-background-admin">
                  {roleLabels[role] ?? role}
                </td>
                {modules.map((mod) => {
                  const key = `${role}:${mod}`;
                  const current = cells[key] || "";
                  return (
                    <td key={mod} className="px-3 py-2 text-center">
                      <select
                        value={current}
                        onChange={(e) =>
                          handleChange(role, mod, e.target.value)
                        }
                        className={`px-2 py-1 rounded text-xs font-sans font-bold border-0 focus:ring-2 focus:ring-primary/30 ${
                          NIVEL_COLORS[current] ?? NIVEL_COLORS[""]
                        }`}
                      >
                        {NIVEIS.map((n) => (
                          <option key={n} value={n}>
                            {n || "—"}
                          </option>
                        ))}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
