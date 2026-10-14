"use client";

import { CHURCH, SOCIAL, NAV_ITEMS } from "@/lib/constants";
import { MessageCircle, Mail } from "lucide-react";
import { FaInstagram, FaYoutube } from "react-icons/fa";
import Image from "next/image";
import Link from "next/link";

function FooterNavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const anchor = href.startsWith("#");
  const className =
    "font-serif text-white/70 hover:text-accent transition-colors text-sm";
  if (anchor) {
    return <a href={href} className={className}>{children}</a>;
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export default function Footer({
  slogan,
  address,
  instagram,
  youtube,
  whatsapp,
}: {
  slogan?: string;
  address?: string;
  instagram?: string;
  youtube?: string;
  whatsapp?: string;
}) {
  const sloganTexto = slogan ?? CHURCH.slogan;
  const endereco = address ?? SOCIAL.address;
  const FOOTER_SOCIAL = [
    { icon: FaInstagram, href: instagram ?? SOCIAL.instagram, label: "Instagram" },
    { icon: FaYoutube, href: youtube ?? SOCIAL.youtube, label: "YouTube" },
    { icon: MessageCircle, href: whatsapp ?? SOCIAL.whatsapp, label: "WhatsApp" },
    { icon: Mail, href: `mailto:${SOCIAL.email}`, label: "E-mail" },
  ];
  return (
    <footer className="bg-bg-dark text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="grid md:grid-cols-3 gap-8 sm:gap-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Image
                src="/logo.png"
                alt="Logo"
                width={48}
                height={48}
              />
              <span className="font-sans text-xl font-bold">
                {CHURCH.shortName}
              </span>
            </div>
            <p className="font-serif text-white/60 text-sm leading-relaxed">
              {sloganTexto}
            </p>
          </div>

          <div>
            <h4 className="font-sans text-sm font-bold uppercase tracking-widest text-accent mb-4">
              Navegação
            </h4>
            <ul className="space-y-3">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <FooterNavLink href={item.href}>{item.label}</FooterNavLink>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-sans text-sm font-bold uppercase tracking-widest text-accent mb-4">
              Redes Sociais
            </h4>
            <div className="flex gap-4">
              {FOOTER_SOCIAL.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="p-3 bg-white/10 rounded-full hover:bg-accent hover:text-bg-dark transition-all duration-300"
                >
                  <s.icon size={18} />
                </a>
              ))}
            </div>
            <p className="font-serif text-white/40 text-sm mt-4">
              {endereco}
            </p>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 sm:mt-12 pt-6 sm:pt-8 text-center">
          <p className="font-serif text-white/40 text-sm">
            &copy; {new Date().getFullYear()} {CHURCH.name}. Todos os direitos
            reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
