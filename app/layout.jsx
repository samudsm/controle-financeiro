import "./globals.css";
import { ToastProvider } from "../components/Toast";
import BottomNav from "../components/BottomNav";
import RegistrarSW from "../components/RegistrarSW";

export const metadata = {
  title: "Controle Financeiro",
  description: "Controle de entradas, saídas, pendências e parcelas.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Financeiro" },
};

export const viewport = {
  themeColor: "#4472C4",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <ToastProvider>
          <main className="mx-auto max-w-3xl px-4 pt-4 pb-nav min-h-screen">
            {children}
          </main>
          <BottomNav />
        </ToastProvider>
        <RegistrarSW />
      </body>
    </html>
  );
}
