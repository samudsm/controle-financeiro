"use client";
import { useEffect, useRef, useState } from "react";
import { X, Plus, Minus } from "lucide-react";
import { formatarCronometro } from "../../lib/treino";

// Apito curto sem arquivo externo (Web Audio API).
function apitar() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const agora = ctx.currentTime;
    [0, 0.18, 0.36].forEach((atraso) => {
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      vol.gain.setValueAtTime(0.0001, agora + atraso);
      vol.gain.exponentialRampToValueAtTime(0.3, agora + atraso + 0.01);
      vol.gain.exponentialRampToValueAtTime(0.0001, agora + atraso + 0.14);
      osc.connect(vol).connect(ctx.destination);
      osc.start(agora + atraso);
      osc.stop(agora + atraso + 0.15);
    });
    setTimeout(() => ctx.close?.(), 1200);
  } catch {
    /* som é um extra: se falhar, o cronômetro continua funcionando */
  }
}

// Barra fixa de descanso. Aparece ao confirmar uma série.
export default function CronometroDescanso({ segundos, onFechar }) {
  const [restante, setRestante] = useState(segundos);
  const [total, setTotal] = useState(segundos);
  const alertou = useRef(false);

  // Reinicia quando um novo descanso começa.
  useEffect(() => {
    setRestante(segundos);
    setTotal(segundos);
    alertou.current = false;
  }, [segundos]);

  useEffect(() => {
    const id = setInterval(() => setRestante((r) => r - 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (restante <= 0 && !alertou.current) {
      alertou.current = true;
      apitar();
      navigator.vibrate?.([200, 100, 200]);
    }
  }, [restante]);

  const acabou = restante <= 0;
  const pct = total > 0 ? Math.max(0, Math.min(100, (restante / total) * 100)) : 0;

  return (
    <div className="fixed left-0 right-0 bottom-[56px] z-40 px-3 pb-2">
      <div className="mx-auto max-w-3xl rounded-xl shadow-lg overflow-hidden bg-neutral-900 text-white">
        {/* Barra de progresso do descanso */}
        <div className="h-1 bg-white/15">
          <div
            className={`h-full transition-[width] duration-1000 ease-linear ${
              acabou ? "bg-receita" : "bg-marca"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex items-center gap-2 px-3 py-2.5">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-white/50">
              {acabou ? "Descanso terminado" : "Descanso"}
            </p>
            <p className={`text-2xl font-bold tabular-nums ${acabou ? "text-receita" : ""}`}>
              {acabou ? "00:00" : formatarCronometro(restante)}
            </p>
          </div>

          <button
            onClick={() => setRestante((r) => Math.max(0, r - 30))}
            className="w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center toque"
            aria-label="Menos 30 segundos"
          >
            <Minus size={18} />
            <span className="text-[10px] ml-0.5">30</span>
          </button>
          <button
            onClick={() => {
              setRestante((r) => r + 30);
              setTotal((t) => Math.max(t, restante + 30));
              alertou.current = false;
            }}
            className="w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center toque"
            aria-label="Mais 30 segundos"
          >
            <Plus size={18} />
            <span className="text-[10px] ml-0.5">30</span>
          </button>
          <button
            onClick={onFechar}
            className="w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center toque"
            aria-label="Pular descanso"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
