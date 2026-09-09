import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PixDonation from "@/components/PixDonation";
import { PIX_PAYLOAD } from "@/lib/pix";
import { CHURCH } from "@/lib/constants";

export default function DoacaoPage() {
  return (
    <>
      <Navbar />
      <section className="pt-24 sm:pt-32 pb-20 sm:pb-32 bg-bg-gray min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="font-sans text-4xl sm:text-5xl font-bold text-primary mb-4">
              Doe para a <span className="text-accent">Igreja</span>
            </h1>
            <p className="font-serif text-lg text-text-dark/60 max-w-2xl mx-auto">
              Sua contribuição ajuda a {CHURCH.name} a continuar proclamando o
              evangelho de Cristo.
            </p>
          </div>
          <PixDonation payload={PIX_PAYLOAD} />
        </div>
      </section>
      <Footer />
    </>
  );
}