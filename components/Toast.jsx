"use client";
import { createContext, useCallback, useContext, useState } from "react";

const ToastCtx = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const mostrar = useCallback((mensagem, tipo = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, mensagem, tipo }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastCtx.Provider value={mostrar}>
      {children}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[92%] max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            // zinc fixo: o aviso é escuro nos dois temas. A escala neutra se
            // inverte no tema escuro e deixaria texto branco sobre fundo claro.
            className={`toast-in rounded-lg px-4 py-3 text-white shadow-lg text-sm ${
              t.tipo === "erro" ? "bg-despesa" : "bg-zinc-800"
            }`}
          >
            {t.mensagem}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
