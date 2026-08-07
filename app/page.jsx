import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { MODULOS } from "../lib/modulos";

// Tela inicial: escolhe o módulo.
export default function Home() {
  return (
    <div>
      <h1 className="text-2xl font-bold">Meu Painel</h1>
      <p className="text-sm text-neutral-500 mt-1 mb-5">Escolha um módulo</p>

      <div className="space-y-3">
        {MODULOS.map((m) => {
          const { Icone } = m;
          const conteudo = (
            <>
              <span
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: m.cor + "1a", color: m.cor }}
              >
                <Icone size={24} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="font-semibold">{m.nome}</span>
                  {!m.pronto && (
                    <span className="text-[10px] uppercase tracking-wide bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded-full">
                      em breve
                    </span>
                  )}
                </span>
                <span className="block text-sm text-neutral-500 truncate">{m.descricao}</span>
              </span>
              <ChevronRight size={20} className="text-neutral-300 shrink-0" />
            </>
          );

          return m.pronto ? (
            <Link
              key={m.id}
              href={m.href}
              className="flex items-center gap-3 bg-white rounded-xl border border-neutral-200 p-4 toque hover:border-neutral-300 transition-colors"
            >
              {conteudo}
            </Link>
          ) : (
            // Ainda não construído: o card aparece, mas leva à página de aviso.
            <Link
              key={m.id}
              href={m.href}
              className="flex items-center gap-3 bg-white rounded-xl border border-dashed border-neutral-300 p-4 toque opacity-70"
            >
              {conteudo}
            </Link>
          );
        })}
      </div>

      <p className="text-xs text-neutral-400 mt-6">
        App de uso pessoal · Supabase em conta própria
      </p>
    </div>
  );
}
