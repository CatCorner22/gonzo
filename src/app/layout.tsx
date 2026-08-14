import type { Metadata } from "next";
import { Libre_Baskerville, Special_Elite } from "next/font/google";
import "./globals.css";

const gonzoSerif = Libre_Baskerville({
  variable: "--font-gonzo-serif",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const gonzoMono = Special_Elite({
  variable: "--font-gonzo-mono",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Gonzo Engine | Hunter S. Thompson Chatbot",
  description:
    "A Gonzo journalism chatbot engine — Hunter S. Thompson persona with RAG-grounded style.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${gonzoSerif.variable} ${gonzoMono.variable} h-full`}
    >
      <body className="min-h-full bg-gonzo-bg text-amber-50 antialiased">
        {children}
      </body>
    </html>
  );
}
