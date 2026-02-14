import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Material MIS",
  description: "Material Management Information System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <div className="flex min-h-screen" suppressHydrationWarning>
          <Sidebar />
          <div className="flex-1 ml-64" suppressHydrationWarning>
            <Header />
            <main className="p-8" suppressHydrationWarning>
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}