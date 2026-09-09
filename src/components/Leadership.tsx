"use client";

import { motion } from "framer-motion";
import { CHURCH } from "@/lib/constants";
import { Heart } from "lucide-react";

export default function Leadership() {
  return (
    <section id="lideranca" className="py-20 sm:py-32 bg-white">
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

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto rounded-2xl bg-bg-gray shadow-xl p-8 text-center hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center">
            <Heart className="w-10 h-10 text-white" />
          </div>
          <h3 className="font-sans text-2xl font-bold text-primary mb-2">
            {CHURCH.leader}
          </h3>
          <p className="font-serif text-sm text-text-dark/60">
            Pastor Presidente da {CHURCH.name} — {CHURCH.city}
          </p>
        </motion.div>
      </div>
    </section>
  );
}