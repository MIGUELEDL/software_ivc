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
    <section id="lideranca" className="py-20 sm:py-32 bg-landing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-sans text-4xl sm:text-5xl font-bold text-primary mb-4">
            Nossa <span className="text-accent">Liderança</span>
          </h2>
          <p className="font-serif text-lg text-text-dark/60 max-w-2xl mx-auto">
            Homens e mulheres chamados por Deus para apascentar o seu rebanho.
          </p>
        </motion.div>

        {leaders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto rounded-2xl bg-admin-surface shadow-xl p-10 text-center"
          >
            <p className="font-serif text-lg text-white/70">
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
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto"
          >
            {leaders.map((lider) => (
              <div
                key={lider.id}
                className="rounded-2xl hero-background shadow-xl p-8 text-center hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
              >
                {lider.photo_url ? (
                  <img
                    src={lider.photo_url}
                    alt={lider.name}
                    className="w-25 h-25 mx-auto mb-6 rounded-full object-cover border-4 border-white/20 shadow"
                  />
                ) : (
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary-light via-primary to-accent flex items-center justify-center">
                    <span className="font-sans text-2xl font-bold text-white">
                      {lider.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <h3 className="font-sans text-1xl font-bold text-white mb-2">
                  {lider.name}
                </h3>
                <p className="font-serif text-sm text-white/70">
                  {lider.role} — {church?.name ?? "Igreja Virtude Cristã"}
                </p>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}