"use client";
import { Trophy, Store } from "lucide-react";
import { formatBRL, formatData } from "../lib/format";

export default function RankingGastos({ transacoes }) {
  const saidas = transacoes.filter((t) => t.tipo === "saida");
  if (saidas.length === 0) return null;
  const topTransacoes = [...saidas].sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor)).slice(0, 5);
  const porLocal = {};
  for (const t of saidas) {
    const chave = String(t.descricao || "").trim().toUpperCase();
    if (!porLocal[chave]) porLocal[chave] = { nome: t.descricao, total: 0, qtd: 0 };
    porLocal[chave].total += Math.abs(Number(t.valor) || 0);
    porLocal[chave].qtd += 1;
  }
  const topLocais = Object.values(porLocal).sort((a, b) => b.total - a.total).slice(0, 5);
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <section className="bg-white rounded-xl border border-neutral-200 p-4">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><Trophy size={18} className="text-despesa" /> Maiores gastos</h2>
        <div className="space-y-2">
          {topTransacoes.map((t, i) => (
            <div key={t.id} className="flex items-center gap-2 text-sm">
              <span className="w-5 text-neutral-400">{i + 1}.</span>
              <div className="flex-1 min-w-0"><p className="truncate font-medium">{t.descricao}</p><p className="text-xs text-neutral-400">{formatData(t.data)}</p></div>
              <span className="font-semibold text-despesa shrink-0">{formatBRL(Math.abs(t.valor))}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-white rounded-xl border border-neutral-200 p-4">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><Store size={18} className="text-marca" /> Onde mais gasta</h2>
        <div className="space-y-2">
          {topLocais.map((l, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-5 text-neutral-400">{i + 1}.</span>
              <div className="flex-1 min-w-0"><p className="truncate font-medium">{l.nome}</p><p className="text-xs text-neutral-400">{l.qtd}x</p></div>
              <span className="font-semibold shrink-0">{formatBRL(l.total)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
