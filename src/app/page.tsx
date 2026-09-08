import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Schedule from "@/components/Schedule";
import Values from "@/components/Values";
import LiveBanner from "@/components/LiveBanner";
import Gallery from "@/components/Gallery";
import SocialLinks from "@/components/SocialLinks";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <About />
      <Schedule />
      <Values />
      <LiveBanner />
      <Gallery />
      <SocialLinks />
      <Footer />
    </>
  );
}
