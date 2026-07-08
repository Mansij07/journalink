import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { AutoLogout } from "@/components/AutoLogout";
import { ConditionalNavbar } from "@/components/layout/ConditionalNavbar";
import { ConditionalParticles } from "@/components/layout/ConditionalParticles";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

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
        <ThemeProvider attribute="class" forcedTheme="dark" disableTransitionOnChange>
          <AutoLogout />
          <ConditionalParticles />
          <ConditionalNavbar />
          <div className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
            {children}
          </div>
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
