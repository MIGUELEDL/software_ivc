"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { CHURCH, SOCIAL } from "@/lib/constants";
import Image from "next/image";

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative h-screen w-full overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-bg-dark via-primary/90 to-primary" />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#1a3a6b30_0%,_transparent_70%)]" />

      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />

      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <Image
            src="/logo.png"
            alt="Logo Igreja Virtude Cristã"
            width={120}
            height={120}
            className="mx-auto mb-6 rounded-full shadow-2xl border-2 border-accent/50"
            preload
          />
        </motion.div>

        <motion.h1
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="font-sans text-4xl sm:text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-4"
        >
          {CHURCH.name}
        </motion.h1>

        <motion.p
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="font-serif text-lg sm:text-xl md:text-2xl text-accent-light max-w-3xl leading-relaxed mb-8"
        >
          {CHURCH.slogan}
        </motion.p>

        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <a
            href="#sobre"
            className="px-8 py-3 bg-primary hover:bg-primary-light text-white font-sans font-bold rounded-full transition-all duration-300 shadow-lg hover:shadow-xl text-sm tracking-wider uppercase"
          >
            Quero Conhecer
          </a>
          <a
            href={SOCIAL.youtube}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3 border-2 border-accent text-accent hover:bg-accent hover:text-bg-dark font-sans font-bold rounded-full transition-all duration-300 text-sm tracking-wider uppercase"
          >
            Assista ao Vivo
          </a>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <ChevronDown className="text-white/70 w-8 h-8" />
        </motion.div>
      </motion.div>
    </section>
  );
}
