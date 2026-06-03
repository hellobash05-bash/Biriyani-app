import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import LoadingScreen from "@/components/LoadingScreen";
import CartSidebar from "@/components/CartSidebar";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from "@/components/ThemeProvider";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
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
      className={`${playfair.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches === true;
                  if (!theme && supportDarkMode) theme = 'dark';
                  if (!theme) theme = 'light';
                  if (theme === 'system') theme = supportDarkMode ? 'dark' : 'light';
                  document.documentElement.classList.add(theme);
                  document.documentElement.style.colorScheme = theme;
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>

      <body className="min-h-full flex flex-col bg-background text-foreground antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
        >
          <AuthProvider>
            <NotificationProvider>
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
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
