"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Church,
  CalendarDays,
  Package,
  Wallet,
  FileText,
  Shield,
  Settings,
  ClipboardList,
  ChevronDown,
  LogOut,
  User,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/membros", label: "Membros", icon: Users },
  { href: "/admin/lideranca", label: "Templos", icon: Church },
  { href: "/admin/eventos", label: "Eventos", icon: CalendarDays },
  { href: "/admin/patrimonio", label: "Patrimonio", icon: Package },
  { href: "/admin/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/admin/relatorios", label: "Relatorios", icon: FileText },
  { href: "/admin/usuarios", label: "Usuarios", icon: Shield },
  { href: "/admin/auditoria", label: "Auditoria", icon: ClipboardList },
  { href: "/admin/configuracoes", label: "Config", icon: Settings },
];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrador",
  SECRETARIA: "Secretaria",
  LIDER: "Lider",
  FINANCEIRO: "Financeiro",
  PATRIMONIAL: "Patrimonial",
};

export function AdminNavbar({ email, role }: { email: string; role: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = email
    ? email
        .split("@")[0]
        .split(/[._-]/)
        .map((p) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 hero-lite-admin backdrop-blur-sm border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="font-sans text-lg font-bold text-primary tracking-tight"
            >
              <span className="text-accent">IVC</span> Admin
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-sans font-medium transition-colors ${
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-primary/90 hover:text-accent hover:bg-primary/5"
                  }`}
                >
                  <item.icon size={14} />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <button
            className="md:hidden text-white/70 hover:text-white p-1"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" />
              )}
            </svg>
          </button>

          <div className="hidden md:block relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 group"
            >
              <div className="w-8 h-8 rounded-full hero-background-admin flex items-center justify-center text-white font-sans text-xs font-bold">
                {initials}
              </div>
              <ChevronDown
                size={14}
                className={`text-primary transition-transform ${
                  menuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 hero-background-lite rounded-xl shadow-2xl border border-white/10 py-2 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10">
                  <p className="font-sans text-xs text-primary truncate">
                    {email}
                  </p>
                  <p className="font-sans text-xs font-bold text-accent mt-0.5">
                    {ROLE_LABELS[role] ?? role}
                  </p>
                </div>
                <div className="py-1">
                  <Link
                    href="/admin/configuracoes"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-sans text-primary/70 hover:text-primary hover:bg-primary/5 transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    <User size={15} />
                    Minha Conta
                  </Link>
                  <Link
                    href="/"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-sans text-primary/70 hover:text-primary hover:bg-primary/5 transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    <LogOut size={15} />
                    Sair
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0d1f3c]">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="font-sans text-xs text-white/40 truncate">{email}</p>
            <p className="font-sans text-xs font-bold text-[#c9a84c] mt-0.5">
              {ROLE_LABELS[role] ?? role}
            </p>
          </div>
          <div className="py-2 space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm font-sans transition-colors ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="border-t border-white/10 py-2">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-sans text-white/60 hover:text-white hover:bg-white/5"
            >
              <LogOut size={16} />
              Sair
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
