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

  // Configurações → landing (fallback = constants, saída idêntica sem DB).
  let about: string | undefined;
  let proposito: string | undefined;
  let vision: string | undefined;
  let valores: Array<{ title: string; description: string; color: string }> | undefined;
  let instagram: string | undefined;
  let youtube: string | undefined;
  let whatsapp: string | undefined;
  let address: string | undefined;
  try {
    const { settings } = await obterConfiguracoes();
    scheduleItems = (settings["schedule.items"] ?? []) as Array<{ day: string; time: string; title: string }>;
    slogan = (settings["church.slogan"] as string) ?? "";
    about = settings["church.about"] as string | undefined;
    proposito = settings["church.proposito"] as string | undefined;
    vision = settings["church.vision"] as string | undefined;
    valores = settings["church.values"] as Array<{ title: string; description: string; color: string }> | undefined;
    instagram = settings["social.instagram"] as string | undefined;
    youtube = settings["social.youtube"] as string | undefined;
    const numero = settings["whatsapp.number"] as string | undefined;
    whatsapp = numero ? `https://wa.me/${numero}` : undefined;
    address = settings["church.address"] as string | undefined;
  } catch (erro) {
    console.error("portal: falha ao carregar configuracoes do banco", erro);
  }

  const igreja = igrejas[0] ?? null;

  return (
    <>
      <Navbar />
      <Hero slogan={slogan} />
      <About about={about} />
      <Leadership church={igreja} leaders={lideres} />
      <Schedule items={scheduleItems} />
      <Values proposito={proposito} vision={vision} values={valores} />
      <LiveBanner />
      <SocialLinks
        instagram={instagram}
        youtube={youtube}
        whatsapp={whatsapp}
        address={address}
      />
      <Footer
        slogan={slogan}
        address={address}
        instagram={instagram}
        youtube={youtube}
        whatsapp={whatsapp}
      />
    </>
  );
}
