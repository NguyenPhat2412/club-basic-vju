import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppProviders } from "@/providers/AppProviders";
import "@/styles/globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

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
    <html lang="vi" className={inter.variable} suppressHydrationWarning>
      <head>
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
