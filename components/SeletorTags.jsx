"use client";
import { useEffect, useRef, useState } from "react";
import { X, Plus, Tag as IconeTag } from "lucide-react";

// Seleção de várias tags. Aceita tags existentes (lista) ou texto livre.
// valor: array de nomes. onChange: recebe o novo array.
export default function SeletorTags({ valor = [], onChange, opcoes = [], onCriarNova }) {
  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function fora(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  const filtro = texto.toLowerCase().trim();
  const disponiveis = opcoes
    .filter((o) => !valor.includes(o.rotulo))
    .filter((o) => o.rotulo.toLowerCase().includes(filtro))
    .slice(0, 8);

  const jaExiste = opcoes.some((o) => o.rotulo.toLowerCase() === filtro);
  const podeCriar = filtro && !jaExiste && !valor.some((v) => v.toLowerCase() === filtro);

  function adicionar(nome) {
    if (!nome || valor.includes(nome)) return;
    onChange([...valor, nome]);
    setTexto("");
    setAberto(false);
  }

  function remover(nome) {
    onChange(valor.filter((v) => v !== nome));
  }

  async function criar() {
    const nova = texto.trim();
    if (onCriarNova) await onCriarNova(nova);
    adicionar(nova);
  }

  return (
    <div className="relative" ref={ref}>
      {valor.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {valor.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 bg-marca/10 text-marca text-xs font-medium px-2 py-1 rounded-full"
            >
              <IconeTag size={12} />
              {t}
              <button
                type="button"
                onClick={() => remover(t)}
                aria-label={`Remover tag ${t}`}
                className="hover:text-despesa"
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        className="w-full border border-neutral-300 rounded-lg px-3 py-2 toque"
        value={texto}
        placeholder={valor.length ? "Adicionar outra tag…" : "Tags (ex: Ronda Jovem)"}
        onChange={(e) => {
          setTexto(e.target.value);
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (jaExiste) adicionar(opcoes.find((o) => o.rotulo.toLowerCase() === filtro).rotulo);
            else if (podeCriar) criar();
          }
        }}
      />

      {aberto && (disponiveis.length > 0 || podeCriar) && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-neutral-200 rounded-lg shadow-lg max-h-52 overflow-auto">
          {disponiveis.map((o) => (
            <button
              key={o.valor}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-neutral-100 text-sm"
              onClick={() => adicionar(o.rotulo)}
            >
              {o.rotulo}
            </button>
          ))}
          {podeCriar && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-marca hover:bg-blue-50 flex items-center gap-2 border-t border-neutral-100 text-sm"
              onClick={criar}
            >
              <Plus size={15} /> Criar tag: "{texto.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
