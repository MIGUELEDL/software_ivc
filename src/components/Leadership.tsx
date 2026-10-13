"use client";

import { motion } from "framer-motion";
import type { Igreja, Lider } from "@/lib/admin/lideranca";

/**
 * Seção Liderança do portal (IGR-22/23/24). Recebe os líderes ATIVO
 * (ordenados por `order`) e a 1ª igreja do banco (RF-023 migração DB-driven).
 * Estado vazio quando não há líderes ATIVO. Âncora `#lideranca` preservada
 * (regressão portal-home HOME-04/HOME-08).
 */
export default function Leadership({
  church,
  leaders,
}: {
  church: Igreja | null;
  leaders: Lider[];
}) {
  return (
    <section id="lideranca" className="py-12 sm:py-20 lg:py-32 bg-landing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-16"
        >
          <h2 className="font-sans text-2xl sm:text-4xl lg:text-5xl font-bold text-primary mb-4">
            Nossa <span className="text-accent">Liderança</span>
          </h2>
          <p className="font-serif text-base sm:text-lg text-text-dark/60 max-w-2xl mx-auto">
            Obreiros que servem com amor
          </p>
        </motion.div>

        {leaders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto rounded-2xl bg-admin-surface shadow-xl p-6 sm:p-10 text-center"
          >
            <p className="font-serif text-base sm:text-lg text-white/70">
              Em breve, a liderança da{" "}
              {church?.name ?? "igreja"} estará disponível aqui.
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 max-w-5xl mx-auto"
          >
            {leaders.map((lider) => (
              <div
                key={lider.id}
                className="rounded-2xl hero-background shadow-xl p-4 sm:p-8 text-center hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
              >
                {lider.photo_url ? (
                  <img
                    // Mesmo cache-buster do admin (path fixo no bucket).
                    src={`${lider.photo_url}?v=${lider.updated_at}`}
                    alt={lider.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 lg:w-25 lg:h-25 mx-auto mb-3 sm:mb-6 rounded-full object-cover border-2 border-white/20"
                  />
                ) : (
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary-light via-primary to-accent flex items-center justify-center">
                    <span className="font-sans text-2xl font-bold text-white">
                      {lider.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <h3 className="font-sans text-base sm:text-lg lg:text-xl font-bold text-white mb-2">
                  {lider.name}
                </h3>
                <p className="font-serif text-sm text-white/70">
                  {lider.role}
                </p>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}