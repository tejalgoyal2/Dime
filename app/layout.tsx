import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import "./globals.css";

// Chillax by Indian Type Foundry (Fontshare, free for commercial use).
const chillax = localFont({
  src: "./fonts/Chillax-Variable.woff2",
  variable: "--font-chillax",
  weight: "200 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dime",
  description: "An expense tracker that listens, sorts Life from Lego, and roasts you a little.",
  metadataBase: new URL("https://dime.tgoyal.me"),
  openGraph: {
    title: "Dime",
    description: "Every cent has a story. Usually a bad one.",
    url: "https://dime.tgoyal.me",
    siteName: "Dime",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Dime, the expense tracker that roasts you",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dime",
    description: "Every cent has a story. Usually a bad one.",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Dime",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ececea" },
    { media: "(prefers-color-scheme: dark)", color: "#111112" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={chillax.variable} suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before first paint to avoid a theme flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var s=localStorage.getItem("dime-theme");var t=(s==="light"||s==="dark")?s:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",t);var p=localStorage.getItem("dime-palette");if(p&&p!=="graphite")document.documentElement.setAttribute("data-palette",p)}catch(e){}`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
