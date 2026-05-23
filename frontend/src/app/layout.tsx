import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LoadingScreen from "@/components/LoadingScreen";
import CartSidebar from "@/components/CartSidebar";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from 'react-hot-toast';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Biriyani - The King of Flavors",
  description: "Authentic Biriyani delivered to your door.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head />

      <body className="min-h-full flex flex-col bg-background text-foreground antialiased">
        <AuthProvider>
          <CartProvider>
            <LoadingScreen />
            <CartSidebar />
            <Toaster 
              position="top-center" 
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1a1917',
                  color: '#fff',
                  borderRadius: '1.5rem',
                  border: '1px solid rgba(255,255,255,0.05)',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontSize: '11px',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.4)'
                },
                success: {
                  iconTheme: {
                    primary: '#f97316',
                    secondary: '#fff',
                  },
                },
              }} 
            />
            <div className="fixed inset-0 -z-10 biriyani-pattern" />
            <main className="relative flex-1">
              {children}
            </main>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
