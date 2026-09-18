import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Leadership from "@/components/Leadership";
import Schedule from "@/components/Schedule";
import Values from "@/components/Values";
import LiveBanner from "@/components/LiveBanner";
import SocialLinks from "@/components/SocialLinks";
import Footer from "@/components/Footer";
import { listarIgrejas, listarLideresAtivos } from "@/lib/admin/lideranca";
import { obterConfiguracoes } from "@/lib/admin/configuracoes";
import type { Igreja, Lider } from "@/lib/admin/lideranca";

/**
 * Home do portal (RF-023): async RSC que busca no banco os líderes ATIVO e a
 * 1ª igreja (IGR-22). A seção #lideranca degrada para estado vazio em caso de
 * falha de leitura (IGR-23, portal continua no ar). Âncora/nav preservadas
 * (HOME-04/HOME-08).
 */
export default async function Home() {
  let lideres: Lider[] = [];
  let igrejas: Igreja[] = [];
  let scheduleItems: Array<{ day: string; time: string; title: string }> = [];
  let slogan = "";

  try {
    igrejas = await listarIgrejas();
    lideres = await listarLideresAtivos();
  } catch (erro) {
    console.error("portal: falha ao carregar lideranca do banco", erro);
  }

  try {
    const { settings } = await obterConfiguracoes();
    scheduleItems = (settings["schedule.items"] ?? []) as Array<{ day: string; time: string; title: string }>;
    slogan = (settings["church.slogan"] as string) ?? "";
  } catch (erro) {
    console.error("portal: falha ao carregar configuracoes do banco", erro);
  }

  const igreja = igrejas[0] ?? null;

  return (
    <>
      <Navbar />
      <Hero slogan={slogan} />
      <About />
      <Leadership church={igreja} leaders={lideres} />
      <Schedule items={scheduleItems} />
      <Values />
      <LiveBanner />
      <SocialLinks />
      <Footer />
    </>
  );
}
