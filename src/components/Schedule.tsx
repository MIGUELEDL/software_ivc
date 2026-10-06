"use client";

import { motion } from "framer-motion";
import { CHURCH } from "@/lib/constants";
import { CalendarDays, Clock, MapPin } from "lucide-react";

type ScheduleItem = {
  day: string;
  time: string;
  title: string;
};

export default function Schedule({ items }: { items?: ScheduleItem[] }) {
  const schedule = items && items.length > 0 ? items : [];

  return (
    <section id="cultos" className="py-20 sm:py-32 bg-landing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-sans text-4xl sm:text-5xl font-bold text-primary mb-4">
            Nossos <span className="text-accent">Cultos</span>
          </h2>
          <p className="font-serif text-lg text-text-dark/60 max-w-2xl mx-auto">
            Reuniões semanais para você adorar, aprender e se conectar.
          </p>
        </motion.div>

        {schedule.length === 0 ? (
          <div className="text-center">
            <p className="font-serif text-lg text-dark/60">
              Em breve informaremos os horários dos cultos.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            {schedule.map((service, index) => (
              <motion.div
                key={service.day + service.time}
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: index * 0.15 }}
                className="rounded-2xl hero-background-lite shadow-xl p-8 text-center hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
              >
                <CalendarDays className="w-10 h-10 mx-auto mb-4 text-accent" />
                <h3 className="font-sans text-2xl font-bold text-bg-dark/90 mb-2">
                  {service.day}
                </h3>
                <p className="inline-flex items-center gap-2 font-sans font-bold text-bg-dark/80 mb-3">
                  <Clock size={16} className="text-accent" />
                  {service.time}
                </p>
                <p className="font-serif text-base text-bg-dark/80">
                  {service.title}
                </p>
              </motion.div>
            ))}
          </div>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 text-center inline-flex items-center gap-2 font-sans text-sm font-semibold text-text-dark/60"
        >
          <MapPin size={16} className="text-accent" />
          Todos os cultos em {CHURCH.foundedLocation}
        </motion.p>
      </div>
    </section>
  );
}
