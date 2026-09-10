import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Erro: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios. " +
      "Copie a service role key do Dashboard (Project Settings -> API) e rode com " +
      "--env-file=.env.local ou exporte as variaveis no ambiente."
  );
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const email = process.env.SEED_ADMIN_EMAIL ?? "admin@ivc.com";
const password = process.env.SEED_ADMIN_PASSWORD ?? "Temp1234";

try {
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      role: "SUPER_ADMIN",
      force_password_change: true,
    },
  });

  if (error) {
    throw error;
  }

  console.log(`Admin criado com sucesso: user ID ${data.user.id} (${data.user.email})`);
} catch (err) {
  console.error(
    `Erro ao criar admin: ${err instanceof Error ? err.message : String(err)}`
  );
  process.exit(1);
}