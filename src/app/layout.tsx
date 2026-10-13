import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Igreja Virtude Cristã",
  description:
    "Proclamando o evangelho de Cristo com fé e amor, e ensinando a Palavra que transforma vidas.",
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "Igreja Virtude Cristã",
    description:
      "Proclamando o evangelho de Cristo com fé e amor, e ensinando a Palavra que transforma vidas.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${montserrat.variable} scroll-smooth`}
    >
      <body className="min-h-screen flex flex-col antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
