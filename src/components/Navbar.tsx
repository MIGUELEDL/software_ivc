"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { NAV_ITEMS, CHURCH } from "@/lib/constants";
import Image from "next/image";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-md shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 sm:h-20">
        <a href="#hero" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt={`Logo ${CHURCH.name}`}
            width={40}
            height={40}
            className="rounded-full"
          />
          <span
            className={`font-sans text-lg font-bold tracking-tight transition-colors ${
              scrolled ? "text-primary" : "text-white"
            }`}
          >
            {CHURCH.shortName}
          </span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`font-sans text-sm font-semibold tracking-wide uppercase transition-colors hover:text-accent ${
                scrolled ? "text-text-dark" : "text-white/90"
              }`}
            >
              {item.label}
            </a>
          ))}
        </div>

        <button
          onClick={() => setOpen(!open)}
          className={`md:hidden p-2 transition-colors ${
            scrolled ? "text-primary" : "text-white"
          }`}
          aria-label="Menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white/95 backdrop-blur-md shadow-lg overflow-hidden"
          >
            <div className="flex flex-col px-6 py-4 gap-4">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="font-sans text-sm font-semibold tracking-wide uppercase text-text-dark hover:text-accent transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
