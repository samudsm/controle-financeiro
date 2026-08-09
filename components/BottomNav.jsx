"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";
import { moduloDoCaminho } from "../lib/modulos";

// Barra de baixo: mostra a navegação do módulo em que você está.
// Na tela inicial (escolha de módulo) ela não aparece.
export default function BottomNav() {
  const path = usePathname();
  const modulo = moduloDoCaminho(path);

  if (!modulo || modulo.nav.length === 0) return null;

  // "Módulos" volta para a escolha de módulo (evita dois "Início" na barra).
  const itens = [{ href: "/", rotulo: "Módulos", Icone: Home }, ...modulo.nav];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-superficie border-t border-neutral-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div
        className="mx-auto max-w-3xl grid"
        style={{ gridTemplateColumns: `repeat(${itens.length}, minmax(0, 1fr))` }}
      >
        {itens.map(({ href, rotulo, Icone }) => {
          // "Início" só fica ativo na raiz; os demais também cobrem subrotas.
          const ativo = href === "/" ? path === "/" : path === href || path?.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 py-2 toque text-[10px] ${
                ativo ? "text-marca font-semibold" : "text-neutral-500"
              }`}
            >
              <Icone size={20} strokeWidth={ativo ? 2.4 : 1.8} />
              <span className="truncate max-w-full px-0.5">{rotulo}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
