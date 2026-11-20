import type { Metadata } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DFK Billing",
  description: "Aplikasi invoice dan kwitansi tagihan",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      data-tema="gelap"
      suppressHydrationWarning
      className={`${geistSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var t=localStorage.getItem("dfk-tema");document.documentElement.dataset.tema=t==="terang"?"terang":"gelap"}catch(e){document.documentElement.dataset.tema="gelap"}',
          }}
        />
        {children}
      </body>
    </html>
  );
}
