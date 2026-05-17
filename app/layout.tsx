import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FIREpath — Financial independence planning for India",
  description:
    "Track your FIRE journey across EPF, NPS, PPF, stocks, mutual funds, gold and US holdings. Know your real retirement date — built for Indian investors.",
  keywords: [
    "FIRE calculator India",
    "financial independence India",
    "retirement planning India",
    "EPF NPS PPF calculator",
    "early retirement India",
  ],
  themeColor: "#FFFFFF",
  openGraph: {
    title: "FIREpath — FIRE planning for India",
    description:
      "Your real retirement date, calculated with the Indian rules that actually apply to your money.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          as="style"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
          media="print"
          // @ts-ignore
          onLoad="this.media='all'"
        />
      </head>
      <body>
        {/* Prevent flash — light is default; only add dark class if user explicitly chose it */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var t = localStorage.getItem('firepath-theme');
              if (t === 'dark') {
                document.documentElement.classList.add('dark');
              }
            } catch(e) {}
          })();
        `}} />
        {children}
      </body>
    </html>
  );
}
