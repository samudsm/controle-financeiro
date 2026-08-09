"use client";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { corDaCategoria } from "../lib/categorias";
import { apenasDespesas } from "../lib/totais";
import { formatBRL } from "../lib/format";

export default function ResumoCategorias({ transacoes }) {
  const [aberta, setAberta] = useState({});
  const saidas = apenasDespesas(transacoes);
  const grupos = {};
  for (const t of saidas) {
    const cat = t.categoria || "(sem categoria)";
    const val = Math.abs(Number(t.valor) || 0);
    if (!grupos[cat]) grupos[cat] = { total: 0, qtd: 0, subs: {} };
    grupos[cat].total += val;
    grupos[cat].qtd += 1;
    const sub = t.subcategoria || "(sem subcategoria)";
    if (!grupos[cat].subs[sub]) grupos[cat].subs[sub] = { total: 0, qtd: 0 };
    grupos[cat].subs[sub].total += val;
    grupos[cat].subs[sub].qtd += 1;
  }
  const totalGeral = saidas.reduce((s, t) => s + Math.abs(Number(t.valor) || 0), 0);
  const lista = Object.entries(grupos).sort((a, b) => b[1].total - a[1].total);
  if (lista.length === 0) return null;
  return (
    <section className="mt-6 bg-superficie rounded-xl border border-neutral-200 p-4">
      <h2 className="font-semibold mb-3">Resumo por categoria</h2>
      <div className="divide-y divide-neutral-100">
        {lista.map(([cat, info], i) => {
          const pct = totalGeral ? (info.total / totalGeral) * 100 : 0;
          const cor = corDaCategoria(cat, i);
          const subs = Object.entries(info.subs).sort((a, b) => b[1].total - a[1].total);
          const expandida = aberta[cat];
          return (
            <div key={cat} className="py-2">
              <button className="w-full flex items-center gap-2 text-left" onClick={() => setAberta((a) => ({ ...a, [cat]: !a[cat] }))}>
                <ChevronRight size={16} className={`text-neutral-400 transition-transform ${expandida ? "rotate-90" : ""}`} />
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: cor }} />
                <span className="flex-1 font-medium">{cat}</span>
                <span className="text-sm text-neutral-500">{info.qtd}x</span>
                <span className="w-12 text-right text-xs text-neutral-400">{pct.toFixed(0)}%</span>
                <span className="w-24 text-right font-semibold text-despesa">{formatBRL(info.total)}</span>
              </button>
              <div className="ml-6 mt-1 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cor }} />
              </div>
              {expandida && (
                <div className="ml-8 mt-2 space-y-1">
                  {subs.map(([sub, s]) => (
                    <div key={sub} className="flex items-center text-sm text-neutral-600">
                      <span className="flex-1 truncate">{sub}</span>
                      <span className="text-neutral-400 text-xs mr-3">{s.qtd}x</span>
                      <span className="w-24 text-right">{formatBRL(s.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-3 pt-3 border-t border-neutral-200 font-semibold">
        <span>Total de despesas</span>
        <span className="text-despesa">{formatBRL(totalGeral)}</span>
      </div>
    </section>
  );
}
