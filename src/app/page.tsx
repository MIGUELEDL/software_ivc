import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Leadership from "@/components/Leadership";
import Schedule from "@/components/Schedule";
import Values from "@/components/Values";
import LiveBanner from "@/components/LiveBanner";
import SocialLinks from "@/components/SocialLinks";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <About />
      <Leadership />
      <Schedule />
      <Values />
      <LiveBanner />
      <SocialLinks />
      <Footer />
    </>
  );
}
