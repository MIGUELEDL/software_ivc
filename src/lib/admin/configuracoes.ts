import { createServerClient } from "@/lib/supabase/server";
import { CHURCH, SOCIAL, SCHEDULE, PIX } from "@/lib/constants";

export type SettingKey =
  | "church.name"
  | "church.shortName"
  | "church.slogan"
  | "church.foundedDate"
  | "church.cnpj"
  | "church.address"
  | "church.city"
  | "church.leader"
  | "church.about"
  | "church.mission"
  | "church.vision"
  | "church.values"
  | "whatsapp.number"
  | "whatsapp.display"
  | "pix.key"
  | "schedule.items"
  | "social.instagram"
  | "social.youtube";

type SettingValue = string | number | boolean | null | Record<string, unknown> | unknown[];

const DEFAULTS: Record<SettingKey, SettingValue> = {
  "church.name": CHURCH.name,
  "church.shortName": CHURCH.shortName,
  "church.slogan": CHURCH.slogan,
  "church.foundedDate": CHURCH.foundedDate,
  "church.cnpj": CHURCH.cnpj,
  "church.address": CHURCH.foundedLocation,
  "church.city": CHURCH.city,
  "church.leader": CHURCH.leader,
  "church.about": CHURCH.about,
  "church.mission": CHURCH.mission,
  "church.vision": CHURCH.vision,
  "church.values": CHURCH.values as unknown as Array<{ title: string; description: string; color: string }>,
  "whatsapp.number": "83999450781",
  "whatsapp.display": "(83) 99945-0781",
  "pix.key": PIX.key,
  "schedule.items": SCHEDULE as unknown as Array<{ title: string; day: string; time: string }>,
  "social.instagram": SOCIAL.instagram,
  "social.youtube": SOCIAL.youtube,
};

export const SETTINGS_KEYS = Object.keys(DEFAULTS) as SettingKey[];

export type Configuracoes = Record<SettingKey, SettingValue>;

export async function obterConfiguracoes(): Promise<Configuracoes> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("settings")
    .select("key, value");

  const result = { ...DEFAULTS };
  if (data) {
    for (const row of data) {
      if (row.key in result) {
        result[row.key as SettingKey] = row.value as SettingValue;
      }
    }
  }
  return result;
}

export async function atualizarConfiguracoes(
  updates: Partial<Record<SettingKey, SettingValue>>
): Promise<void> {
  const supabase = await createServerClient();

  for (const [key, value] of Object.entries(updates)) {
    if (!SETTINGS_KEYS.includes(key as SettingKey)) {
      throw new Error(`chave_invalida: ${key}`);
    }
    const { error } = await supabase
      .from("settings")
      .upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    if (error) {
      throw new Error(`erro_ao_salvar: ${error.message}`);
    }
  }
}
