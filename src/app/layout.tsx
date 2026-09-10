import type { Metadata } from "next";
import { IBM_Plex_Mono, Source_Serif_4, Source_Sans_3 } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const display = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700"],
});
const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "600", "700"],
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "North American Animal Attack Tracker",
    template: "%s · Animal Attack Tracker",
  },
  description:
    "Public tracker of North American bear, mountain lion, elk, and moose incidents — including Dean Weingarten / Ammoland documented handgun defenses against bears.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">
        <SiteHeader />
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
