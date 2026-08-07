import Link from "next/link";
import { Dumbbell, ChevronLeft } from "lucide-react";

// Placeholder do módulo de academia. A estrutura já está de pé:
// basta criar as telas em app/academia/ e preencher o "nav" em lib/modulos.js.
export default function Academia() {
  return (
    <div>
      <Link href="/" className="inline-flex items-center gap-1 text-marca text-sm toque mb-4">
        <ChevronLeft size={16} /> Módulos
      </Link>

      <div className="bg-white rounded-xl border border-dashed border-neutral-300 p-8 text-center">
        <span
          className="w-14 h-14 rounded-xl inline-flex items-center justify-center mb-3"
          style={{ background: "#eb68341a", color: "#eb6834" }}
        >
          <Dumbbell size={28} />
        </span>
        <h1 className="text-lg font-bold mb-1">Academia</h1>
        <p className="text-sm text-neutral-500 max-w-sm mx-auto">
          Módulo de acompanhamento de treinos. Ainda não construído — o espaço já está
          reservado.
        </p>
      </div>

      <p className="text-xs text-neutral-400 mt-4 text-center">
        Quando quiser começar, é só pedir: registro de treinos, séries e repetições, carga,
        evolução por exercício, o que fizer sentido pra você.
      </p>
    </div>
  );
}
