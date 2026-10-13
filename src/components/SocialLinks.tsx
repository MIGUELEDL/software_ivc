"use client";

import { motion } from "framer-motion";
import { SOCIAL, CHURCH } from "@/lib/constants";
import { MessageCircle, Mail, MapPin } from "lucide-react";
import { FaInstagram, FaYoutube, FaFacebook } from "react-icons/fa";

const SOCIAL_LINKS = [
  {
    name: "Instagram",
    icon: FaInstagram,
    href: SOCIAL.instagram,
    color: "hover:text-[#E4405F]",
    bg: "hover:bg-[#E4405F]/10",
  },
  {
    name: "YouTube",
    icon: FaYoutube,
    href: SOCIAL.youtube,
    color: "hover:text-[#FF0000]",
    bg: "hover:bg-[#FF0000]/10",
  },
  {
    name: "WhatsApp",
    icon: MessageCircle,
    href: SOCIAL.whatsapp,
    color: "hover:text-[#25D366]",
    bg: "hover:bg-[#25D366]/10",
  },
  {
    name: "E-mail",
    icon: Mail,
    href: `mailto:${SOCIAL.email}`,
    color: "hover:text-accent",
    bg: "hover:bg-accent/10",
  },
];

export default function SocialLinks() {
  return (
    <section id="redes" className="py-12 sm:py-20 lg:py-32 bg-landing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-16"
        >
          <h2 className="font-sans text-2xl sm:text-4xl lg:text-5xl font-bold text-primary mb-4">
            Conecte-se{" "}
            <span className="text-accent">Conosco</span>
          </h2>
          <p className="font-serif text-base sm:text-lg text-text-dark/60 max-w-2xl mx-auto">
            Acompanhe nossa rotina, cultos e novidades pelas redes sociais.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex items-center justify-center gap-2 mb-8 sm:mb-12 text-text-dark/60 font-serif px-4 text-center"
        >
          <MapPin size={18} className="text-accent" />
          <span>{SOCIAL.address}</span>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-4xl mx-auto">
          {SOCIAL_LINKS.map((link, index) => {
            const Icon = link.icon;
            return (
              <motion.a
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`group flex flex-col items-center gap-3 sm:gap-4 p-4 sm:p-8 rounded-2xl border border-gray-100 shadow-md ${link.bg} transition-all duration-300 hover:shadow-xl hover:-translate-y-2`}
              >
                <div
                  className={`p-3 sm:p-4 rounded-full bg-gray-50 group-hover:scale-110 transition-transform duration-300 ${link.color}`}
                >
                  <Icon size={28} className="sm:w-8 sm:h-8" />
                </div>
                <span className="font-sans text-base sm:text-lg font-bold text-text-dark group-hover:text-primary transition-colors">
                  {link.name}
                </span>
              </motion.a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
