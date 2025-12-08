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
    <html lang="en">
      <body className={inter.className}>
        <div className="flex">
          <Sidebar />
          <div className="ml-64 flex-1 min-h-screen bg-gray-50">
            <Header />
            <main className="p-8">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}