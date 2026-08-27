"use client";

import { motion } from "framer-motion";
import { CHURCH, SOCIAL } from "@/lib/constants";
import { Play, Clock } from "lucide-react";

export default function LiveBanner() {
  return (
    <section id="clamor" className="relative py-20 sm:py-28 bg-bg-dark overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1a3a6b20_0%,_transparent_70%)]" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-accent/20 text-accent-light font-sans text-sm font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-6">
            <Clock size={16} />
            Todos os dias às {CHURCH.liveTime}
          </div>

          <h2 className="font-sans text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-4">
            {CHURCH.liveLabel}
          </h2>

          <p className="font-serif text-lg text-white/70 max-w-2xl mx-auto mb-10">
            {CHURCH.liveDescription}
          </p>

          <a
            href={SOCIAL.youtube}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-10 py-4 bg-accent hover:bg-accent-light text-bg-dark font-sans font-bold rounded-full text-lg transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105"
          >
            <Play size={20} fill="currentColor" />
            Assistir Agora no YouTube
          </a>
        </motion.div>
      </div>
    </section>
  );
}
