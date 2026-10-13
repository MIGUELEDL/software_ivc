"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  QrCode,
  IdCard,
  UserRound,
  ChevronDown,
  LogOut,
  User,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/painel", label: "Painel", icon: LayoutDashboard },
  { href: "/painel/dizimo", label: "Dízimo", icon: QrCode },
  { href: "/painel/cartao", label: "Cartão", icon: IdCard },
  { href: "/painel/perfil", label: "Meus dados", icon: UserRound },
];

export function PainelNavbar({
  nome,
  email,
  fotoUrl,
}: {
  nome: string;
  email: string;
  fotoUrl: string | null;
}) {
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

  const initials = (nome || email || "M")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 hero-lite-admin backdrop-blur-sm border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link
              href="/painel"
              className="font-sans text-lg font-bold text-primary tracking-tight"
            >
              <span className="text-accent">Membro</span> IVC
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/painel"
                  ? pathname === "/painel"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-sans font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-primary hover:text-accent-light hover:bg-primary/10"
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
              aria-label="Conta do membro"
            >
              {fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- foto do storage Supabase (host externo) sem remotePatterns no next.config
                <img
                  src={fotoUrl}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover border border-white/20"
                />
              ) : (
                <div className="w-8 h-8 rounded-full hero-background-accent flex items-center justify-center text-bg-dark font-sans text-xs font-bold">
                  {initials}
                </div>
              )}
              <ChevronDown
                size={14}
                className={`text-white/50 transition-transform ${
                  menuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 hero-background-admin rounded-xl shadow-2xl border border-white/10 py-2 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
                  {fotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- foto do storage Supabase
                    <img
                      src={fotoUrl}
                      alt=""
                      className="w-11 h-11 rounded-full object-cover border border-white/20"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full hero-background-accent flex items-center justify-center text-bg-dark font-sans text-sm font-bold">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-sans text-sm font-bold text-white truncate">
                      {nome || "Membro"}
                    </p>
                    <p className="font-sans text-xs text-white/40 truncate">
                      {email}
                    </p>
                  </div>
                </div>
                <div className="py-1">
                  <Link
                    href="/painel/perfil"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-sans text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    <User size={15} />
                    Alterar meus dados
                  </Link>
                </div>
                <div className="border-t border-white/10 py-1">
                  <form action="/api/auth/logout" method="POST">
                    <button
                      type="submit"
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-sans text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <LogOut size={15} />
                      Sair
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 hero-background-admin">
          <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
            {fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- foto do storage Supabase
              <img
                src={fotoUrl}
                alt=""
                className="w-9 h-9 rounded-full object-cover border border-white/20"
              />
            ) : (
              <div className="w-9 h-9 rounded-full hero-background-accent flex items-center justify-center text-bg-dark font-sans text-xs font-bold">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-sans text-sm font-bold text-white truncate">
                {nome || "Membro"}
              </p>
              <p className="font-sans text-xs text-white/40 truncate">{email}</p>
            </div>
          </div>
          <div className="py-2 space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/painel"
                  ? pathname === "/painel"
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
            <Link
              href="/painel/perfil"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm font-sans text-white/60 hover:text-white hover:bg-white/5"
            >
              <User size={16} />
              Alterar meus dados
            </Link>
          </div>
          <div className="border-t border-white/10 py-2">
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-sans text-white/60 hover:text-white hover:bg-white/5"
              >
                <LogOut size={16} />
                Sair
              </button>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}