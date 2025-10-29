
import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";
import UserMenu from "@/components/UserMenu";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "EduTrack AI",
  description: "EduTrack AI — Next.js + Supabase",
  icons: {
    icon: "/images/EduTrackLogo_noBG.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <header className="p-4 flex gap-4 items-center justify-between border-b border-[#223]">
          <Link href="/" className="font-bold text-xl no-underline">EduTrack AI</Link>
          <UserMenu />
        </header>
        <main className="p-4 max-w-5xl mx-auto">{children}</main>
        <Toaster position="top-right" /> { }
      </body>
    </html>
  );
}