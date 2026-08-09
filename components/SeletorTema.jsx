"use client";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

const CHAVE = "tema";

const OPCOES = [
  { id: "claro", rotulo: "Claro", Icone: Sun },
  { id: "escuro", rotulo: "Escuro", Icone: Moon },
  { id: "sistema", rotulo: "Sistema", Icone: Monitor },
];

// Liga ou desliga a classe "dark" no <html>, que é o que o Tailwind observa.
export function aplicarTema(tema) {
  const querEscuro =
    tema === "escuro" ||
    (tema === "sistema" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", querEscuro);
}

export default function SeletorTema({ compacto = false }) {
  const [tema, setTema] = useState("sistema");
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setTema(localStorage.getItem(CHAVE) || "sistema");
    setMontado(true);
  }, []);

  // Em "sistema", acompanha a troca feita no celular ou no Windows.
  useEffect(() => {
    if (!montado) return;
    aplicarTema(tema);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const aoTrocar = () => {
      if (tema === "sistema") aplicarTema("sistema");
    };
    mq.addEventListener("change", aoTrocar);
    return () => mq.removeEventListener("change", aoTrocar);
  }, [tema, montado]);

  function escolher(id) {
    setTema(id);
    try {
      localStorage.setItem(CHAVE, id);
    } catch {
      /* modo privado pode bloquear; o tema vale só nesta sessão */
    }
    aplicarTema(id);
  }

  // Antes de montar não sabemos a escolha salva; um esqueleto evita piscar
  // o botão errado por um instante.
  if (!montado) {
    return <div className={compacto ? "h-9 w-28" : "h-11 w-full"} aria-hidden="true" />;
  }

  if (compacto) {
    const atual = OPCOES.find((o) => o.id === tema) || OPCOES[2];
    const proximo = OPCOES[(OPCOES.indexOf(atual) + 1) % OPCOES.length];
    return (
      <button
        onClick={() => escolher(proximo.id)}
        className="flex items-center gap-1.5 text-sm text-neutral-500 border border-neutral-200 rounded-lg px-3 py-2 toque"
        aria-label={`Tema: ${atual.rotulo}. Tocar para ${proximo.rotulo}.`}
        title={`Tema: ${atual.rotulo}`}
      >
        <atual.Icone size={16} />
        {atual.rotulo}
      </button>
    );
  }

  return (
    <div className="flex gap-1.5">
      {OPCOES.map((o) => (
        <button
          key={o.id}
          onClick={() => escolher(o.id)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm toque ${
            tema === o.id
              ? "bg-marca text-white font-medium"
              : "bg-neutral-100 text-neutral-600"
          }`}
          aria-pressed={tema === o.id}
        >
          <o.Icone size={15} /> {o.rotulo}
        </button>
      ))}
    </div>
  );
}
