import { createServerClient } from "@/lib/supabase/server";

export type Aviso = {
  id: string;
  titulo: string;
  data_hora: string;
  conteudo: string;
  visivel: boolean;
  criado_em: string;
};

/**
 * Lista os avisos visíveis de `event_notices`, mais recentes primeiro.
 * Falha de banco retorna lista vazia — o painel mostra o estado vazio
 * sem quebrar (estratégia de erro da spec).
 */
export async function listAvisosVisiveis(): Promise<Aviso[]> {
  const supabase = await createServerClient();

  try {
    const { data, error } = await supabase
      .from("event_notices")
      .select("*")
      .eq("visivel", true)
      .order("data_hora", { ascending: false });

    if (error) {
      return [];
    }

    return data ?? [];
  } catch {
    return [];
  }
}