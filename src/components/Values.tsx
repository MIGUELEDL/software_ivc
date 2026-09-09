"use client";

import { motion } from "framer-motion";
import { CHURCH } from "@/lib/constants";
import { Cross, BookOpen, Heart } from "lucide-react";

const iconMap = {
  0: Cross,
  1: BookOpen,
  2: Heart,
};

const colorMap = {
  primary: {
    bg: "bg-primary",
    text: "text-white",
    border: "border-primary",
  },
  accent: {
    bg: "bg-accent",
    text: "text-bg-dark",
    border: "border-accent",
  },
  dark: {
    bg: "bg-bg-dark",
    text: "text-white",
    border: "border-bg-dark",
  },
};

export default function Values() {
  return (
    <section id="valores" className="py-20 sm:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-sans text-4xl sm:text-5xl font-bold text-primary mb-4">
            Nossa <span className="text-accent">Missão</span> e{" "}
            <span className="text-accent">Visão</span>
          </h2>
          <p className="font-serif text-lg text-text-dark/60 max-w-2xl mx-auto">
            Os alicerces que sustentam nosso propósito e nosso futuro.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl bg-bg-gray p-8 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
          >
            <Cross className="w-10 h-10 mb-4 text-accent" />
            <h3 className="font-sans text-2xl font-bold text-primary mb-3">
              Missão
            </h3>
            <p className="font-serif text-base leading-relaxed text-text-dark/80">
              {CHURCH.mission}
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="rounded-2xl bg-bg-gray p-8 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
          >
            <BookOpen className="w-10 h-10 mb-4 text-accent" />
            <h3 className="font-sans text-2xl font-bold text-primary mb-3">
              Visão
            </h3>
            <p className="font-serif text-base leading-relaxed text-text-dark/80">
              {CHURCH.vision}
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h3 className="font-sans text-4xl sm:text-5xl font-bold text-primary mb-4">
            Nossos <span className="text-accent">Valores</span>
          </h3>
          <p className="font-serif text-lg text-text-dark/60 max-w-2xl mx-auto">
            Fundamentos que guiam nossa caminhada de fé e amor.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {CHURCH.values.map((value, index) => {
            const Icon = iconMap[index as keyof typeof iconMap];
            const colors = colorMap[value.color as keyof typeof colorMap];

            return (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                className={`group relative overflow-hidden rounded-2xl p-8 ${colors.bg} shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full" />
                <Icon className={`w-12 h-12 mb-6 ${colors.text}`} />
                <h3 className={`font-sans text-2xl font-bold mb-3 ${colors.text}`}>
                  {value.title}
                </h3>
                <p className={`font-serif text-base leading-relaxed ${colors.text}/80`}>
                  {value.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
