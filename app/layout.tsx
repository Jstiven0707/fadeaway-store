import type { Metadata } from "next";
import { Anton } from "next/font/google";
import "./globals.css";

const anton = Anton({ 
  weight: '400',
  subsets: ["latin"],
  variable: "--font-anton",
});

export const metadata: Metadata = {
  title: "FADEAWAY",
  description: ".",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${anton.variable} bg-black antialiased`}>
        {children}
      </body>
    </html>
  );
}