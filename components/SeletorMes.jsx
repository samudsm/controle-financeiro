"use client";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { deslocarMes, rotuloMes } from "../lib/dates";

// Seletor de mês com botões e gesto de swipe (esquerda = próximo, direita = anterior).
export default function SeletorMes({ mes, onChange }) {
  const inicio = useRef(null);

  function onPointerDown(e) {
    inicio.current = e.clientX;
  }
  function onPointerUp(e) {
    if (inicio.current === null) return;
    const dx = e.clientX - inicio.current;
    inicio.current = null;
    if (Math.abs(dx) < 50) return;
    onChange(deslocarMes(mes, dx < 0 ? 1 : -1)); // arrastar p/ esquerda = avança
  }

  return (
    <div
      className="flex items-center justify-between bg-white rounded-xl border border-neutral-200 px-2 py-2 select-none touch-pan-y"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <button
        className="p-2 text-neutral-500 toque"
        onClick={() => onChange(deslocarMes(mes, -1))}
        aria-label="Mês anterior"
      >
        <ChevronLeft size={22} />
      </button>
      <span className="font-semibold text-lg">{rotuloMes(mes)}</span>
      <button
        className="p-2 text-neutral-500 toque"
        onClick={() => onChange(deslocarMes(mes, 1))}
        aria-label="Próximo mês"
      >
        <ChevronRight size={22} />
      </button>
    </div>
  );
}
