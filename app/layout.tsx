import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { AutoLogout } from "@/components/AutoLogout";
import { ConditionalNavbar } from "@/components/layout/ConditionalNavbar";
import { ConditionalParticles } from "@/components/layout/ConditionalParticles";
import { ThemeProvider } from "@/components/theme-provider";

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
    <html
      lang="en"
      className={`h-full antialiased ${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AutoLogout />
          <ConditionalParticles />
          <ConditionalNavbar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
