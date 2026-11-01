import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import { ThemeProvider } from "@/components/providers/theme-provider";
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
  description: "Text it what you spent. It sorts Life from Lego, keeps the receipt, and roasts you a little.",
  metadataBase: new URL("https://dime.tgoyal.me"),
  manifest: "/manifest.json",
  openGraph: {
    title: "Dime",
    description: "Every cent has a story. Usually a bad one.",
    url: "https://dime.tgoyal.me",
    siteName: "Dime",
    images: [
      {
        // 1200x627 is LinkedIn's native size, so it isn't resampled (blurry);
        // ?v= busts LinkedIn's and Slack's preview caches when it changes.
        url: "/og-image.png?v=4",
        width: 1200,
        height: 627,
        type: "image/png",
        alt: "Dime: text it what you spent, it sorts Life from Lego and roasts you a little",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dime",
    description: "Every cent has a story. Usually a bad one.",
    images: ["/og-image.png?v=4"],
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
  // Draw under the notch and home bar; edges pad themselves with safe-area insets.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ececea" },
    { media: "(prefers-color-scheme: dark)", color: "#111112" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The CSP nonce from middleware, so this inline theme script may run.
  // Reading it renders every page per request, which a nonce needs anyway.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" className={chillax.variable} suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before first paint to avoid a theme flash. */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `try{var s=localStorage.getItem("dime-theme");var t=(s==="light"||s==="dark")?s:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",t);var p=localStorage.getItem("dime-palette");if(p&&p!=="graphite")document.documentElement.setAttribute("data-palette",p)}catch(e){}`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
