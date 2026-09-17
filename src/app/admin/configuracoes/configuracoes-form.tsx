"use client";

import { useState } from "react";
import { Settings, Plus, Trash2, Save, X } from "lucide-react";
import type { Configuracoes, SettingKey } from "@/lib/admin/configuracoes";

interface Props {
  initial: Configuracoes;
  canEdit: boolean;
}

type FormData = Configuracoes;

function TextField({
  label,
  value,
  onChange,
  disabled,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="font-sans text-xs font-bold text-text-dark/50 uppercase">
        {label}
      </label>
      {multiline ? (
        <textarea
          className="w-full rounded-lg border border-gray-200 bg-bg-gray px-3 py-2 font-serif text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={3}
        />
      ) : (
        <input
          type="text"
          className="w-full rounded-lg border border-gray-200 bg-bg-gray px-3 py-2 font-serif text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white shadow-xl p-6 space-y-4">
      <h2 className="font-sans text-lg font-bold text-text-dark flex items-center gap-2">
        <Settings size={18} className="text-primary" />
        {title}
      </h2>
      {children}
    </div>
  );
}

function ReadonlyValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-sans text-xs font-bold text-text-dark/50 uppercase">
        {label}
      </p>
      <p className="font-serif text-sm text-text-dark">{value || "—"}</p>
    </div>
  );
}

export default function ConfiguracoesForm({ initial, canEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormData>({ ...initial });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const set = (key: SettingKey, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const schedule = (form["schedule.items"] ?? []) as Array<{
    day: string;
    time: string;
    title: string;
  }>;

  const addSchedule = () =>
    set("schedule.items", [...schedule, { day: "", time: "", title: "" }]);

  const removeSchedule = (i: number) =>
    set(
      "schedule.items",
      schedule.filter((_, idx) => idx !== i)
    );

  const updateSchedule = (i: number, field: string, value: string) => {
    const next = [...schedule];
    next[i] = { ...next[i], [field]: value };
    set("schedule.items", next);
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/configuracoes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: form }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(`Erro: ${data.error ?? "desconhecido"}`);
        return;
      }
      setFeedback("Configuracoes salvas com sucesso");
      setEditing(false);
    } catch {
      setFeedback("Erro de conexao");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({ ...initial });
    setEditing(false);
    setFeedback(null);
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`rounded-lg p-3 font-sans text-sm ${
            feedback.includes("Erro")
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {feedback}
        </div>
      )}

      <Section title="Dados da Igreja">
        {editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField label="Nome" value={form["church.name"] as string} onChange={(v) => set("church.name", v)} />
            <TextField label="Nome Curto" value={form["church.shortName"] as string} onChange={(v) => set("church.shortName", v)} />
            <TextField label="Slogan" value={form["church.slogan"] as string} onChange={(v) => set("church.slogan", v)} />
            <TextField label="Fundacao" value={form["church.foundedDate"] as string} onChange={(v) => set("church.foundedDate", v)} />
            <TextField label="CNPJ" value={form["church.cnpj"] as string} onChange={(v) => set("church.cnpj", v)} />
            <TextField label="Cidade" value={form["church.city"] as string} onChange={(v) => set("church.city", v)} />
            <TextField label="Pastor" value={form["church.leader"] as string} onChange={(v) => set("church.leader", v)} />
            <TextField label="Endereco" value={form["church.address"] as string} onChange={(v) => set("church.address", v)} />
            <div className="sm:col-span-2">
              <TextField label="Sobre" value={form["church.about"] as string} onChange={(v) => set("church.about", v)} multiline />
            </div>
            <TextField label="Missao" value={form["church.mission"] as string} onChange={(v) => set("church.mission", v)} multiline />
            <TextField label="Visao" value={form["church.vision"] as string} onChange={(v) => set("church.vision", v)} multiline />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReadonlyValue label="Nome" value={form["church.name"] as string} />
            <ReadonlyValue label="Nome Curto" value={form["church.shortName"] as string} />
            <ReadonlyValue label="Slogan" value={form["church.slogan"] as string} />
            <ReadonlyValue label="Fundacao" value={form["church.foundedDate"] as string} />
            <ReadonlyValue label="CNPJ" value={form["church.cnpj"] as string} />
            <ReadonlyValue label="Cidade" value={form["church.city"] as string} />
            <ReadonlyValue label="Pastor" value={form["church.leader"] as string} />
            <ReadonlyValue label="Endereco" value={form["church.address"] as string} />
            <div className="sm:col-span-2">
              <ReadonlyValue label="Sobre" value={form["church.about"] as string} />
            </div>
            <ReadonlyValue label="Missao" value={form["church.mission"] as string} />
            <ReadonlyValue label="Visao" value={form["church.vision"] as string} />
          </div>
        )}
      </Section>

      <Section title="WhatsApp">
        {editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField label="Numero" value={form["whatsapp.number"] as string} onChange={(v) => set("whatsapp.number", v)} />
            <TextField label="Exibicao" value={form["whatsapp.display"] as string} onChange={(v) => set("whatsapp.display", v)} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReadonlyValue label="Numero" value={form["whatsapp.display"] as string} />
            <div>
              <p className="font-sans text-xs font-bold text-text-dark/50 uppercase">
                Link wa.me
              </p>
              <p className="font-serif text-sm text-primary break-all">
                https://wa.me/55{form["whatsapp.number"] as string}
              </p>
            </div>
          </div>
        )}
      </Section>

      <Section title="PIX">
        {editing ? (
          <TextField label="Chave PIX" value={form["pix.key"] as string} onChange={(v) => set("pix.key", v)} />
        ) : (
          <div className="space-y-2">
            <ReadonlyValue label="Chave PIX (CNPJ)" value={form["pix.key"] as string} />
            <div className="rounded-lg bg-bg-gray p-3">
              <p className="font-sans text-xs font-bold text-text-dark/50 uppercase mb-1">
                Como doar
              </p>
              <p className="font-serif text-sm text-text-dark/70">
                Abra o app do banco, escolha PIX copia-e-cola, cole a chave acima e informe o valor desejado.
              </p>
            </div>
          </div>
        )}
      </Section>

      <Section title="Horarios de Culto">
        {editing ? (
          <div className="space-y-3">
            {schedule.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Dia"
                  className="w-20 rounded-lg border border-gray-200 bg-bg-gray px-2 py-1.5 font-serif text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={item.day}
                  onChange={(e) => updateSchedule(i, "day", e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Horario"
                  className="w-24 rounded-lg border border-gray-200 bg-bg-gray px-2 py-1.5 font-serif text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={item.time}
                  onChange={(e) => updateSchedule(i, "time", e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Titulo"
                  className="flex-1 rounded-lg border border-gray-200 bg-bg-gray px-2 py-1.5 font-serif text-sm text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={item.title}
                  onChange={(e) => updateSchedule(i, "title", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeSchedule(i)}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addSchedule}
              className="flex items-center gap-1 font-sans text-xs font-bold text-primary hover:text-accent"
            >
              <Plus size={14} /> Adicionar culto
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {schedule.length === 0 ? (
              <p className="font-serif text-sm text-text-dark/50">Nenhum culto configurado.</p>
            ) : (
              schedule.map((item, i) => (
                <div key={i} className="flex items-center gap-3 font-serif text-sm text-text-dark">
                  <span className="font-bold">{item.day}</span>
                  <span>{item.time}</span>
                  <span>{item.title}</span>
                </div>
              ))
            )}
          </div>
        )}
      </Section>

      <Section title="Redes Sociais">
        {editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextField label="Instagram" value={form["social.instagram"] as string} onChange={(v) => set("social.instagram", v)} />
            <TextField label="YouTube" value={form["social.youtube"] as string} onChange={(v) => set("social.youtube", v)} />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReadonlyValue label="Instagram" value={form["social.instagram"] as string} />
            <ReadonlyValue label="YouTube" value={form["social.youtube"] as string} />
          </div>
        )}
      </Section>

      {canEdit && (
        <div className="flex items-center gap-3">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-sans text-sm font-bold text-white hover:bg-accent disabled:opacity-50"
              >
                <Save size={16} /> {saving ? "Salvando..." : "Salvar"}
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 rounded-lg border-2 border-gray-300 px-4 py-2 font-sans text-sm font-bold text-text-dark/60 hover:border-primary/30"
              >
                <X size={16} /> Cancelar
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-2 rounded-lg border-2 border-primary px-4 py-2 font-sans text-sm font-bold text-primary hover:bg-primary hover:text-white"
            >
              Editar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
