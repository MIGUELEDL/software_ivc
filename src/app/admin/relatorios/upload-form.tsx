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
      className="mt-6 rounded-2xl bg-white shadow-xl p-5"
    >
      <h3 className="font-sans text-lg font-bold text-text-dark mb-4">
        Novo documento
      </h3>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="doc-title"
            className="block font-sans text-xs font-semibold text-text-dark/50 mb-1"
          >
            Título *
          </label>
          <input
            id="doc-title"
            name="title"
            type="text"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 font-serif text-text-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
          />
        </div>
        <div className="min-w-0 flex-1">
          <label
            htmlFor="doc-category"
            className="block font-sans text-xs font-semibold text-text-dark/50 mb-1"
          >
            Categoria *
          </label>
          <select
            id="doc-category"
            name="category"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 font-serif text-text-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
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
            className="block font-sans text-xs font-semibold text-text-dark/50 mb-1"
          >
            Arquivo *
          </label>
          <input
            id="doc-file"
            name="file"
            type="file"
            required
            accept=".pdf,.csv,.xls,.xlsx,.doc,.docx,.ods,.odt"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 font-serif text-text-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-accent hover:bg-accent-light disabled:opacity-50 text-white font-sans font-bold px-5 py-2 transition-colors"
        >
          <Upload size={16} aria-hidden="true" />
          {pending ? "Enviando..." : "Enviar"}
        </button>
      </div>
    </form>
  );
}
