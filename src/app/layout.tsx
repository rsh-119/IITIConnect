import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Manrope } from "next/font/google";
import { PwaRegistration } from "@/components/pwa-registration";
import "./globals.css";

const elegant = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-elegant",
  display: "swap",
});
const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "IITIConnect", template: "%s | IITIConnect" },
  description:
    "A student-built space for planning shared journeys and city requests.",
  applicationName: "IITIConnect",
  icons: { apple: "/apple-touch-icon.png" },
  appleWebApp: {
    capable: true,
    title: "IITIConnect",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbf7f4",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${elegant.variable} ${body.variable}`}>
      <body>
        <PwaRegistration />
        {children}
      </body>
    </html>
  );
}
