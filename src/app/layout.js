import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "FireMap Navigator | Yanğın Analiz Sistemi",
  description: "Real-time yanğın hotspot analizi, peyk görüntüləri və təhlükəsiz marşrut planlaması - Hakaton layihəsi",
  keywords: ["wildfire", "fire detection", "NASA FIRMS", "Sentinel-2", "GIS", "mapping"],
  authors: [{ name: "FireMap Team" }],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
