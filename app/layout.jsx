import "./globals.css";
import { ToastProvider } from "../components/Toast";
import BottomNav from "../components/BottomNav";
import RegistrarSW from "../components/RegistrarSW";

export const metadata = {
  title: "Meu Painel",
  description: "App pessoal com módulos: financeiro, academia e o que vier.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Painel" },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#4472C4" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0d" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// Roda antes da primeira pintura: sem isto a tela pisca branca ao abrir no
// tema escuro, porque o React só aplicaria a classe depois de montar.
const TEMA_ANTES_DE_PINTAR = `
(function () {
  try {
    var t = localStorage.getItem('tema') || 'sistema';
    var escuro = t === 'escuro' ||
      (t === 'sistema' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (escuro) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_ANTES_DE_PINTAR }} />
      </head>
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
