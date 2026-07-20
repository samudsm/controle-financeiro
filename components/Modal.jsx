"use client";
import { X } from "lucide-react";

export default function Modal({ titulo, onFechar, children, rodape }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
          <h2 className="font-semibold">{titulo}</h2>
          <button onClick={onFechar} className="text-neutral-400 p-1" aria-label="Fechar">
            <X size={22} />
          </button>
        </div>
        <div className="p-4 overflow-auto flex-1">{children}</div>
        {rodape && <div className="px-4 py-3 border-t border-neutral-200">{rodape}</div>}
      </div>
    </div>
  );
}
