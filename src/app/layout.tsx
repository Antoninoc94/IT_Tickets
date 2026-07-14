import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getSettings } from "@/lib/settings";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: settings.appName,
    description: "Gestionale ticket interno",
    icons: settings.faviconStorageKey
      ? { icon: `/api/branding/favicon?v=${settings.faviconStorageKey}` }
      : undefined,
  };
}

// The brand color and other settings are read from the database on every
// request, so this can't be statically prerendered.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSettings();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ "--brand": settings.brandColor } as React.CSSProperties}
    >
      <head>
        {/* Runs before paint to avoid flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme'),d=document.documentElement;if(t==='dark')d.setAttribute('data-theme','dark');else if(t==='light')d.setAttribute('data-theme','light');else d.setAttribute('data-theme',window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');}catch(e){}})();` }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
