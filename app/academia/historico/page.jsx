"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, Trash2, Calendar } from "lucide-react";
import { useToast } from "../../../components/Toast";
import { supabaseConfigurado } from "../../../lib/supabase";
import { listarSessoes, deletarSessao } from "../../../lib/academia";
import {
  volumeDasSeries, formatarVolume, formatarDuracao, formatarPeso, contaNoVolume, TIPOS_SERIE,
} from "../../../lib/treino";

// useSearchParams exige uma fronteira de Suspense no App Router.
export default function HistoricoTreinos() {
  return (
    <Suspense fallback={<p className="text-neutral-400 text-sm mt-6">Carregando…</p>}>
      <Conteudo />
    </Suspense>
  );
}

function Conteudo() {
  const toast = useToast();
  const params = useSearchParams();
  const destacada = params.get("sessao");

  const [sessoes, setSessoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [aberta, setAberta] = useState(destacada || null);

  const carregar = useCallback(async () => {
    if (!supabaseConfigurado) {
      setCarregando(false);
      return;
    }
    try {
      setSessoes(await listarSessoes({ limite: 100 }));
    } catch (e) {
      toast("Erro: " + e.message, "erro");
    } finally {
      setCarregando(false);
    }
  }, [toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function excluir(s) {
    if (!window.confirm(`Excluir o treino "${s.nome}" de ${formatarData(s.inicio)}?\n\nIsso não pode ser desfeito.`)) return;
    try {
      await deletarSessao(s.id);
      toast("✓ Treino excluído");
      carregar();
    } catch (e) {
      toast("Erro: " + e.message, "erro");
    }
  }

  if (!supabaseConfigurado) {
    return (
      <div className="mt-10 bg-yellow-50 border border-yellow-300 rounded-xl p-4 text-yellow-800">
        Configure o Supabase (.env.local) para usar a academia.
      </div>
    );
  }

  // Agrupa por mês para dar noção de frequência.
  const porMes = {};
  sessoes.forEach((s) => {
    const d = new Date(s.inicio);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    (porMes[chave] = porMes[chave] || []).push(s);
  });

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Histórico</h1>

      {carregando && <p className="text-neutral-400 text-sm">Carregando…</p>}

      {!carregando && sessoes.length === 0 && (
        <div className="text-center py-10 border border-dashed border-neutral-300 rounded-xl">
          <Calendar size={28} className="mx-auto text-neutral-300 mb-2" />
          <p className="text-neutral-500">Nenhum treino registrado ainda.</p>
        </div>
      )}

      {Object.entries(porMes).map(([mes, lista]) => (
        <section key={mes} className="mb-5">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="font-semibold capitalize">{nomeDoMes(mes)}</h2>
            <span className="text-xs text-neutral-400">
              {lista.length} treino{lista.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="space-y-2">
            {lista.map((s) => (
              <SessaoCard
                key={s.id}
                s={s}
                expandida={aberta === s.id}
                onAlternar={() => setAberta(aberta === s.id ? null : s.id)}
                onExcluir={() => excluir(s)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SessaoCard({ s, expandida, onAlternar, onExcluir }) {
  const todas = s.exercicios.flatMap((e) => e.series);
  const validas = todas.filter(contaNoVolume);
  const volume = volumeDasSeries(todas);

  return (
    <section className="bg-superficie rounded-xl border border-neutral-200 overflow-hidden">
      <button onClick={onAlternar} className="w-full flex items-center gap-3 p-3 text-left toque">
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{s.nome}</p>
          <p className="text-xs text-neutral-500">
            {formatarData(s.inicio)}
            {s.duracao_seg ? ` · ${formatarDuracao(s.duracao_seg)}` : ""}
          </p>
          <p className="text-xs text-neutral-400 tabular-nums">
            {s.exercicios.length} exercícios · {validas.length} séries · {formatarVolume(volume)}
          </p>
        </div>
        {expandida ? (
          <ChevronUp size={18} className="text-neutral-400 shrink-0" />
        ) : (
          <ChevronDown size={18} className="text-neutral-400 shrink-0" />
        )}
      </button>

      {expandida && (
        <div className="border-t border-neutral-100 p-3 space-y-3">
          {s.exercicios.map((se) => {
            const feitas = se.series.filter((x) => x.concluida);
            if (feitas.length === 0) return null;
            return (
              <div key={se.id}>
                <p className="font-medium text-sm">{se.nome}</p>
                {se.substituiu && (
                  <p className="text-[10px] text-neutral-400">no lugar de {se.substituiu}</p>
                )}
                <div className="mt-1 space-y-0.5">
                  {feitas.map((x) => {
                    const t = TIPOS_SERIE.find((y) => y.valor === x.tipo);
                    return (
                      <div key={x.id} className="flex items-center gap-2 text-sm tabular-nums">
                        <span className="w-5 text-xs text-neutral-400">{x.numero}</span>
                        <span className="flex-1">
                          {formatarPeso(x.peso)} kg × {x.reps}
                        </span>
                        {x.rpe != null && <span className="text-xs text-neutral-400">RPE {x.rpe}</span>}
                        {x.rir != null && <span className="text-xs text-neutral-400">RIR {x.rir}</span>}
                        {t && t.valor !== "normal" && (
                          <span className="text-[10px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded-full">
                            {t.rotulo}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {se.observacoes && (
                  <p className="text-xs text-neutral-500 italic mt-1">{se.observacoes}</p>
                )}
              </div>
            );
          })}

          <button
            onClick={onExcluir}
            className="flex items-center gap-1 text-xs text-despesa toque pt-2 border-t border-neutral-100 w-full"
          >
            <Trash2 size={13} /> Excluir este treino
          </button>
        </div>
      )}
    </section>
  );
}

function formatarData(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function nomeDoMes(chave) {
  const [ano, mes] = chave.split("-").map(Number);
  return new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}
