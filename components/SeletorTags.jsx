"use client";
import { useEffect, useRef, useState } from "react";
import { X, Plus, Tag as IconeTag } from "lucide-react";

// Seleção de várias tags. Aceita tags da lista ou texto livre.
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

  // O modal tem área rolável, então a lista pode abrir fora do campo de visão.
  // Ao abrir, puxa o campo para dentro da tela.
  useEffect(() => {
    if (aberto && ref.current) {
      ref.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [aberto]);

  const filtro = texto.toLowerCase().trim();

  // Comparações sempre sem diferenciar maiúscula/minúscula, senão "destine"
  // vira uma tag nova ao lado da "Destine" que já existe.
  const jaEscolhida = (nome) => valor.some((v) => v.toLowerCase() === nome.toLowerCase());

  const disponiveis = opcoes
    .filter((o) => !jaEscolhida(o.rotulo))
    .filter((o) => o.rotulo.toLowerCase().includes(filtro))
    .slice(0, 8);

  const correspondeExata = opcoes.find((o) => o.rotulo.toLowerCase() === filtro);
  const podeCriar = Boolean(filtro) && !correspondeExata && !jaEscolhida(filtro);

  function adicionar(nome) {
    const limpo = String(nome || "").trim();
    if (!limpo || jaEscolhida(limpo)) {
      setTexto("");
      setAberto(false);
      return;
    }
    onChange([...valor, limpo]);
    setTexto("");
    setAberto(false);
  }

  function remover(nome) {
    onChange(valor.filter((v) => v !== nome));
  }

  async function criar() {
    const nova = texto.trim();
    if (!nova) return;
    if (onCriarNova) await onCriarNova(nova);
    adicionar(nova);
  }

  // Enter: prioriza o que já existe. Se o texto casa exatamente com uma tag,
  // usa ela; se sobrou só uma sugestão na lista, usa ela; só então cria nova.
  // (Antes, digitar "Desti" e apertar Enter criava a tag "Desti" ao lado
  // da "Destine" que já existia.)
  function aoTeclar(e) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (correspondeExata) return adicionar(correspondeExata.rotulo);
    if (disponiveis.length === 1) return adicionar(disponiveis[0].rotulo);
    if (podeCriar) return criar();
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
        onKeyDown={aoTeclar}
      />

      {aberto && (disponiveis.length > 0 || podeCriar) && (
        // onMouseDown com preventDefault: segura o foco no campo para que o
        // clique chegue até o onClick. Sem isso o mousedown tira o foco, a
        // lista fecha e o clique se perde — era por isso que escolher uma tag
        // existente não funcionava, enquanto criar uma nova (via Enter) sim.
        <div
          className="absolute z-30 mt-1 w-full bg-white border border-neutral-200 rounded-lg shadow-lg max-h-52 overflow-auto"
          onMouseDown={(e) => e.preventDefault()}
        >
          {disponiveis.map((o) => (
            <button
              key={o.valor}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-neutral-100 active:bg-neutral-200 text-sm"
              onClick={() => adicionar(o.rotulo)}
            >
              {o.rotulo}
            </button>
          ))}
          {podeCriar && (
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-marca hover:bg-blue-50 active:bg-blue-100 flex items-center gap-2 border-t border-neutral-100 text-sm"
              onClick={criar}
            >
              <Plus size={15} /> Criar tag: {texto.trim()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
