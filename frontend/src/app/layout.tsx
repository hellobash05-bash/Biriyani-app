import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LoadingScreen from "@/components/LoadingScreen";
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
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <CartProvider>
            <LoadingScreen />
            <Toaster 
              position="top-center" 
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1c1917',
                  color: '#fff',
                  borderRadius: '1rem',
                  border: '1px solid rgba(255,255,255,0.1)',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontSize: '12px'
                },
                success: {
                  iconTheme: {
                    primary: '#f97316',
                    secondary: '#fff',
                  },
                },
              }} 
            />
            <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-100 via-white to-red-100 dark:from-orange-950 dark:via-slate-950 dark:to-red-950" />
            <main className="relative flex-1">
              {children}
            </main>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
