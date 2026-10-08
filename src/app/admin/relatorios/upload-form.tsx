"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { DOCUMENT_CATEGORIES } from "@/lib/admin/relatorios-constants";

export function UploadForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      await fetch("/api/admin/relatorios/documentos", {
        method: "POST",
        body: formData,
      });
      form.reset();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      encType="multipart/form-data"
      className="mt-6 rounded-2xl bg-white/10 border border-white/10 p-5"
    >
      <h3 className="font-sans text-lg font-bold text-white mb-4">
        Novo documento
      </h3>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="doc-title"
            className="block font-sans text-xs font-semibold text-white/70 mb-1"
          >
            Título *
          </label>
          <input
            id="doc-title"
            name="title"
            type="text"
            required
            className="w-full rounded-lg bg-white/20 border border-white/10 px-3 py-2 font-serif text-white focus:border-accent-light outline-none transition-colors"
          />
        </div>
        <div className="min-w-0 flex-1">
          <label
            htmlFor="doc-category"
            className="block font-sans text-xs font-semibold text-white/70 mb-1"
          >
            Categoria *
          </label>
          <select
            id="doc-category"
            name="category"
            required
            className="w-full rounded-lg bg-white/20 border border-white/10 px-3 py-2 font-serif text-white focus:border-accent-light outline-none transition-colors"
          >
            {DOCUMENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 flex-1">
          <label
            htmlFor="doc-file"
            className="block font-sans text-xs font-semibold text-white/70 mb-1"
          >
            Arquivo *
          </label>
          <input
            id="doc-file"
            name="file"
            type="file"
            required
            accept=".pdf,.csv,.xls,.xlsx,.doc,.docx,.ods,.odt"
            className="w-full rounded-lg bg-white/20 border border-white/10 px-3 py-2 font-serif text-white focus:border-accent-light outline-none transition-colors file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-accent-light/20 file:text-accent-light cursor-pointer"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg hero-background-accent hover:bg-[#e0c872] disabled:opacity-50 text-white/90 font-sans font-bold px-5 py-2 transition-colors cursor-pointer"
        >
          <Upload size={16} aria-hidden="true" />
          {pending ? "Enviando..." : "Enviar"}
        </button>
      </div>
    </form>
  );
}
