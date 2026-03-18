import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "../context/AppContext";
import Navbar from "../components/Navbar";

export const metadata: Metadata = {
  title: "Splitwise Clone",
  description: "Split expenses with friends",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <AppProvider>
          <Navbar />
          <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
        </AppProvider>
      </body>
    </html>
  );
}
