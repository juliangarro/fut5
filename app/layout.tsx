import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dale Cancha",
  description: "Reservá canchas de fútbol 5 en Costa Rica y pagá por SINPE Móvil.",
};

export const viewport: Viewport = {
  themeColor: "#f5ead8",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${figtree.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
