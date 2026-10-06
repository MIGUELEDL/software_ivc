import { getClaims } from "@/lib/auth/claims";
import { AdminNavbar } from "./admin-navbar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const claims = await getClaims();

  return (
    <div className="min-h-screen hero-lite-admin">
      <AdminNavbar
        email={claims?.email ?? ""}
        role={claims?.role ?? ""}
      />
      <main className="pt-16">{children}</main>
    </div>
  );
}