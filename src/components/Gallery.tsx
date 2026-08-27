"use client";

import { motion } from "framer-motion";
import Image from "next/image";

const IMAGES = [
  "/img1.jpg",
  "/img2.jpg",
  "/img3.jpg",
  "/img4.jpg",
  "/img5.jpg",
  "/img6.jpg",
  "/img7.jpg",
  "/img8.jpg",
  "/img9.jpg",
  "/img10.jpg",
];

export default function Gallery() {
  return (
    <section className="py-20 sm:py-32 bg-bg-gray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-sans text-4xl sm:text-5xl font-bold text-primary mb-4">
            Nossos{" "}
            <span className="text-accent">Momentos</span>
          </h2>
          <p className="font-serif text-lg text-text-dark/60 max-w-2xl mx-auto">
            Registros de cultos, confraternizações e a comunhão da nossa igreja.
          </p>
        </motion.div>

        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {IMAGES.map((src, index) => (
            <motion.div
              key={src}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: (index % 6) * 0.1 }}
              className="break-inside-avoid overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-500 group"
            >
              <div className="relative overflow-hidden">
                <Image
                  src={src}
                  alt={`Foto ${index + 1}`}
                  width={600}
                  height={400}
                  className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-500" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
