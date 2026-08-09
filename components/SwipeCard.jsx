"use client";
import { useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

// Card que revela [Editar] [Apagar] ao arrastar para a esquerda.
// Funciona com toque e mouse (pointer events).
export default function SwipeCard({ children, onEditar, onApagar }) {
  const [dx, setDx] = useState(0);
  const inicio = useRef(null);
  const arrastando = useRef(false);
  const LIMITE = 140; // largura da área de ações

  function down(e) {
    inicio.current = e.clientX;
    arrastando.current = true;
  }
  function move(e) {
    if (!arrastando.current || inicio.current === null) return;
    const delta = e.clientX - inicio.current;
    // só permite arrastar para a esquerda (delta negativo)
    const novo = Math.min(0, Math.max(-LIMITE, delta + (dx < 0 ? dx : 0)));
    setDx(novo);
  }
  function up() {
    arrastando.current = false;
    setDx((d) => (d < -LIMITE / 2 ? -LIMITE : 0));
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Ações atrás do card */}
      <div className="absolute inset-y-0 right-0 flex">
        <button
          onClick={onEditar}
          className="w-[70px] bg-marca text-white flex flex-col items-center justify-center text-xs"
        >
          <Pencil size={18} />
          Editar
        </button>
        <button
          onClick={onApagar}
          className="w-[70px] bg-despesa text-white flex flex-col items-center justify-center text-xs"
        >
          <Trash2 size={18} />
          Apagar
        </button>
      </div>

      {/* Card na frente */}
      <div
        className="relative bg-superficie touch-pan-y"
        style={{ transform: `translateX(${dx}px)`, transition: arrastando.current ? "none" : "transform 0.2s" }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
      >
        {children}
      </div>
    </div>
  );
}
