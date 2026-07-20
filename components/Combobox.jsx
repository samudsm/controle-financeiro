"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";

// Combobox com busca no histórico + opção de criar novo valor.
// opcoes: [{ valor, rotulo, freq }]  (freq opcional, para ordenar por uso)
export default function Combobox({
  valor,
  onChange,
  opcoes = [],
  placeholder = "",
  permitirNovo = true,
  rotuloNovo = "Adicionar",
  onCriarNovo, // async (texto) => void  (opcional; se não vier, só usa o texto)
}) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState(valor || "");
  const ref = useRef(null);

  useEffect(() => setTexto(valor || ""), [valor]);

  useEffect(() => {
    function fora(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  const filtro = texto.toLowerCase().trim();
  const filtradas = opcoes
    .filter((o) => o.rotulo.toLowerCase().includes(filtro))
    .sort((a, b) => (b.freq || 0) - (a.freq || 0))
    .slice(0, 8);

  const jaExiste = opcoes.some((o) => o.rotulo.toLowerCase() === filtro);
  const podeCriar = permitirNovo && texto.trim() && !jaExiste;

  async function escolher(v) {
    setTexto(v);
    onChange(v);
    setAberto(false);
  }

  async function criar() {
    const novo = texto.trim();
    if (onCriarNovo) await onCriarNovo(novo);
    escolher(novo);
  }

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center border border-neutral-300 rounded-lg bg-white">
        <input
          className="flex-1 px-3 py-2 rounded-lg outline-none toque"
          value={texto}
          placeholder={placeholder}
          onChange={(e) => {
            setTexto(e.target.value);
            onChange(e.target.value);
            setAberto(true);
          }}
          onFocus={() => setAberto(true)}
        />
        <button
          type="button"
          className="px-2 text-neutral-400"
          onClick={() => setAberto((a) => !a)}
          aria-label="Abrir opções"
        >
          <ChevronDown size={18} />
        </button>
      </div>

      {aberto && (filtradas.length > 0 || podeCriar) && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-neutral-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {filtradas.map((o) => (
            <button
              key={o.valor}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-neutral-100 flex justify-between items-center"
              onClick={() => escolher(o.rotulo)}
            >
              <span>{o.rotulo}</span>
              {o.freq ? <span className="text-xs text-neutral-400">{o.freq}x</span> : null}
            </button>
          ))}
          {podeCriar && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-marca hover:bg-blue-50 flex items-center gap-2 border-t border-neutral-100"
              onClick={criar}
            >
              <Plus size={16} /> {rotuloNovo}: "{texto.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
