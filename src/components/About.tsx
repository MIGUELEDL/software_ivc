"use client";

import { motion } from "framer-motion";
import { CHURCH } from "@/lib/constants";
import Image from "next/image";

export default function About() {
  return (
    <section id="sobre" className="py-20 sm:py-32 bg-bg-gray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h2 className="font-sans text-4xl sm:text-5xl font-bold text-primary mb-6">
              Nossa{" "}
              <span className="text-accent">História</span>
            </h2>
            <p className="font-serif text-lg leading-relaxed text-text-dark/80 mb-4">
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
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative h-80 sm:h-96 rounded-2xl overflow-hidden shadow-2xl"
          >
            <Image
              src="/img2.jpg"
              alt="Culto Igreja Virtude Cristã"
              fill
              className="object-cover hover:scale-105 transition-transform duration-700"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
