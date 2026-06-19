import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AutoLogout } from "@/components/AutoLogout";
import { ConditionalNavbar } from "@/components/layout/ConditionalNavbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Journalink",
  description: "BITS Pilani social + research platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className={`${inter.className} min-h-full flex flex-col`}>
        <AutoLogout />
        <ConditionalNavbar />
        {children}
      </body>
    </html>
  );
}