import type { Metadata } from "next";
import { AppProviders } from "@/providers/AppProviders";
import "@/styles/globals.css";

const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Libre+Franklin:wght@600;700;800&family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=swap";

export const metadata: Metadata = {
  title: "VJU ClubHub",
  description: "Quản lý câu lạc bộ Trường Đại học Việt Nhật.",
  icons: {
    icon: "/images/vju-logo.png",
    apple: "/images/vju-logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={GOOGLE_FONTS_HREF} />
        <script
          dangerouslySetInnerHTML={{
            __html: `if (typeof navigator !== "undefined" && "serviceWorker" in navigator) { navigator.serviceWorker.getRegistrations().then(function(regs) { for (var i = 0; i < regs.length; i++) { regs[i].unregister(); } }).catch(function(){}); }`,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
