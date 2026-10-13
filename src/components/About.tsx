"use client";

import { motion } from "framer-motion";
import { CHURCH } from "@/lib/constants";
import Image from "next/image";

export default function About() {
  return (
    <section id="sobre" className="py-12 sm:py-20 lg:py-32 bg-landing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h2 className="font-sans text-2xl sm:text-4xl lg:text-5xl font-bold text-primary mb-6">
              Quem{" "}
              <span className="text-accent">Somos</span>
            </h2>
            <p className="font-serif text-base sm:text-lg leading-relaxed text-text-dark mb-4">
              {CHURCH.about}
            </p>
            <div className="flex flex-wrap gap-6 text-sm font-sans font-semibold text-text-dark/60">
              <div>
                <span className="block text-accent text-lg">Fundação</span>
                {CHURCH.foundedDate}
              </div>
              <div>
                <span className="block text-accent text-lg">Localização</span>
                {CHURCH.foundedLocation}
              </div>
              <div>
                <span className="block text-accent text-lg">CNPJ</span>
                {CHURCH.cnpj}
              </div>
              <div>
                <span className="block text-accent text-lg">Liderança</span>
                {CHURCH.leader}
              </div>
              <div>
                <span className="block text-accent text-lg">Cidade</span>
                {CHURCH.city}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative h-64 sm:h-80 lg:h-90 rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-primary via-bg-dark to-primary hero-background"
          >
            <Image
              src="/img_culto.png"
              alt=""
              aria-hidden
              fill
              sizes="450px"
              className="object-cover opacity-10"
            />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#C9A22730_0%,_transparent_65%)]" />
            <Image
              src="/logo.png"
              alt={`Logo ${CHURCH.name}`}
              fill
              className="object-contain p-30 filter drop-shadow-[0_0_15px_rgba(255,255,255,0.35)]"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
