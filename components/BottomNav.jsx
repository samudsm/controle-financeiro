"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Upload, List, Wallet, Settings } from "lucide-react";

const ITENS = [
  { href: "/dashboard", rotulo: "Painel", Icone: LayoutDashboard },
  { href: "/upload", rotulo: "Importar", Icone: Upload },
  { href: "/historico", rotulo: "Histórico", Icone: List },
  { href: "/pendencias", rotulo: "Pendências", Icone: Wallet },
  { href: "/configuracoes", rotulo: "Config", Icone: Settings },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div className="mx-auto max-w-3xl grid grid-cols-5">
        {ITENS.map(({ href, rotulo, Icone }) => {
          const ativo = path === href || path?.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 py-2 toque text-[11px] ${
                ativo ? "text-marca font-semibold" : "text-neutral-500"
              }`}
            >
              <Icone size={22} strokeWidth={ativo ? 2.4 : 1.8} />
              {rotulo}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
