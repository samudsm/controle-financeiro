"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Check, ChevronDown, ChevronUp, Plus, Trash2, TrendingUp, TrendingDown,
  Minus as Igual, StickyNote, Trophy,
} from "lucide-react";
import {
  TIPOS_SERIE, compararSerie, estimar1RM, maiorCarga, melhorSerie,
  volumeDasSeries, formatarPeso, formatarVolume, contaNoVolume,
} from "../../lib/treino";
import { salvarSerie, adicionarSerie, deletarSerie, atualizarSessaoExercicio } from "../../lib/academia";

// Card de um exercício durante o treino.
// Mostra na hora o que foi feito da última vez e deixa registrar em poucos toques.
export default function ExercicioNoTreino({
  se, historico, config, onDescanso, onMudou, aoAvisar,
  emBiSet = false, ultimoDoBloco = true, proximoDoBloco = null,
}) {
  const ultima = historico?.[0] || null;
  const seriesAnteriores = useMemo(
    () => (ultima?.series || []).filter((s) => s.concluida && s.tipo !== "aquecimento"),
    [ultima]
  );

  // Estado local das linhas: digitar não vai ao banco a cada tecla.
  const [linhas, setLinhas] = useState([]);
  const [verHistorico, setVerHistorico] = useState(false);
  const [verNotas, setVerNotas] = useState(false);
  const [notas, setNotas] = useState(se.observacoes || "");
  const [comparacoes, setComparacoes] = useState({});

  useEffect(() => {
    setLinhas(
      (se.series || []).map((s, i) => {
        const ant = seriesAnteriores[i];
        return {
          ...s,
          // Preenchimento automático: começa com o que você fez da última vez.
          peso: s.peso ?? ant?.peso ?? "",
          reps: s.reps ?? ant?.reps ?? "",
          anterior: ant || null,
        };
      })
    );
  }, [se.series, seriesAnteriores]);

  const incremento = Number(config?.incremento_padrao) || 2.5;
  const usaEsforco = config?.esforco && config.esforco !== "nenhum";

  function alterar(id, campo, valor) {
    setLinhas((arr) => arr.map((l) => (l.id === id ? { ...l, [campo]: valor } : l)));
  }

  function ajustar(id, campo, delta) {
    setLinhas((arr) =>
      arr.map((l) => {
        if (l.id !== id) return l;
        const atual = Number(l[campo]) || 0;
        const novo = Math.max(0, campo === "peso" ? atual + delta : atual + delta);
        return { ...l, [campo]: novo };
      })
    );
  }

  async function confirmar(linha) {
    const peso = Number(linha.peso) || 0;
    const reps = Number(linha.reps) || 0;
    if (!reps) {
      aoAvisar?.("Preencha as repetições.", "erro");
      return;
    }
    try {
      await salvarSerie(linha.id, {
        peso,
        reps,
        tipo: linha.tipo || "normal",
        rpe: linha.rpe ? Number(linha.rpe) : null,
        rir: linha.rir !== "" && linha.rir != null ? Number(linha.rir) : null,
        concluida: true,
        observacao: linha.observacao || null,
      });
      alterar(linha.id, "concluida", true);

      // Compara com a mesma série da última vez.
      const comp = compararSerie({ peso, reps }, linha.anterior);
      if (comp) setComparacoes((c) => ({ ...c, [linha.id]: comp }));

      // Aquecimento não puxa descanso.
      // Num bi-set, o descanso só entra depois do último exercício do bloco —
      // no meio você emenda direto no próximo.
      if (linha.tipo !== "aquecimento") {
        if (emBiSet && !ultimoDoBloco) {
          aoAvisar?.(proximoDoBloco ? `→ Emende no ${proximoDoBloco}` : "→ Emende no próximo");
        } else {
          onDescanso?.(se.descanso_seg || 90);
        }
      }
      onMudou?.();
    } catch (e) {
      aoAvisar?.("Erro ao salvar: " + e.message, "erro");
    }
  }

  async function desfazer(linha) {
    try {
      await salvarSerie(linha.id, { concluida: false });
      alterar(linha.id, "concluida", false);
      setComparacoes((c) => {
        const copia = { ...c };
        delete copia[linha.id];
        return copia;
      });
      onMudou?.();
    } catch (e) {
      aoAvisar?.("Erro: " + e.message, "erro");
    }
  }

  async function novaSerie() {
    try {
      const numero = (linhas[linhas.length - 1]?.numero || 0) + 1;
      await adicionarSerie(se.id, numero);
      onMudou?.();
    } catch (e) {
      aoAvisar?.("Erro: " + e.message, "erro");
    }
  }

  async function removerSerie(id) {
    try {
      await deletarSerie(id);
      onMudou?.();
    } catch (e) {
      aoAvisar?.("Erro: " + e.message, "erro");
    }
  }

  async function salvarNotas() {
    try {
      await atualizarSessaoExercicio(se.id, { observacoes: notas });
      setVerNotas(false);
      onMudou?.();
    } catch (e) {
      aoAvisar?.("Erro: " + e.message, "erro");
    }
  }

  // Resumo do histórico (item 7)
  const todasAnteriores = useMemo(() => historico.flatMap((h) => h.series), [historico]);
  const recordeCarga = maiorCarga(todasAnteriores);
  const melhor = melhorSerie(todasAnteriores);
  const rm = melhor ? estimar1RM(melhor.peso, melhor.reps) : 0;
  const volumeUltimo = volumeDasSeries(ultima?.series || []);
  const volumeHoje = volumeDasSeries(linhas.filter((l) => l.concluida));
  const feitas = linhas.filter((l) => l.concluida).length;
  const concluido = linhas.length > 0 && feitas === linhas.length;

  return (
    <section
      className={`rounded-xl border p-3 ${
        concluido ? "border-receita/40 bg-receita/5" : "border-neutral-200 bg-superficie"
      }`}
    >
      {/* Cabeçalho */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold leading-tight">{se.nome}</h3>
          <p className="text-xs text-neutral-500">
            {feitas}/{linhas.length} séries
            {volumeHoje > 0 && ` · ${formatarVolume(volumeHoje)}`}
            {se.substituiu && ` · no lugar de ${se.substituiu}`}
          </p>
          {emBiSet && !ultimoDoBloco && proximoDoBloco && (
            <p className="text-[11px] text-marca font-medium">
              emenda no {proximoDoBloco}, sem descanso
            </p>
          )}
        </div>
        {concluido && <Check size={20} className="text-receita shrink-0 mt-0.5" />}
      </div>

      {/* ÚLTIMO TREINO — a informação mais importante da tela */}
      {seriesAnteriores.length > 0 ? (
        <button
          onClick={() => setVerHistorico((v) => !v)}
          className="w-full text-left mt-2 rounded-lg bg-neutral-50 border border-neutral-200 px-2.5 py-2"
        >
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-neutral-500">
            Último treino · {formatarData(ultima.data)}
            {verHistorico ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-sm tabular-nums">
            {seriesAnteriores.map((s, i) => (
              <span key={s.id || i} className="text-neutral-700">
                {formatarPeso(s.peso)} × {s.reps}
              </span>
            ))}
          </div>

          {verHistorico && (
            <div className="mt-2 pt-2 border-t border-neutral-200 space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <Info rotulo="Melhor carga" valor={recordeCarga ? `${formatarPeso(recordeCarga)} kg` : "—"} />
                <Info rotulo="Melhor série" valor={melhor ? `${formatarPeso(melhor.peso)} × ${melhor.reps}` : "—"} />
                <Info rotulo="1RM estimado" valor={rm ? `${formatarPeso(rm)} kg` : "—"} />
                <Info rotulo="Último volume" valor={volumeUltimo ? formatarVolume(volumeUltimo) : "—"} />
              </div>

              {historico.length > 1 && (
                <div className="pt-1.5 border-t border-neutral-200">
                  <p className="text-[10px] uppercase tracking-wide text-neutral-400 mb-1">Antes disso</p>
                  {historico.slice(1, 4).map((h) => (
                    <div key={h.sessaoExercicioId} className="flex gap-2 text-xs text-neutral-500">
                      <span className="w-14 shrink-0">{formatarData(h.data)}</span>
                      <span className="flex-1 tabular-nums">
                        {h.series.filter((s) => s.concluida).map((s) => `${formatarPeso(s.peso)}×${s.reps}`).join("  ")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </button>
      ) : (
        <p className="mt-2 text-xs text-neutral-400 bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-2">
          Primeira vez registrando este exercício.
        </p>
      )}

      {/* Notas permanentes do exercício */}
      {se.notaExercicio && (
        <p className="mt-2 text-xs text-marca bg-marca/5 border border-marca/20 rounded-lg px-2.5 py-1.5">
          {se.notaExercicio}
        </p>
      )}

      {/* SÉRIES */}
      <div className="mt-3 space-y-1.5">
        <div className="flex items-center gap-1.5 px-1 text-[10px] uppercase tracking-wide text-neutral-400">
          <span className="w-7">Sér</span>
          <span className="w-16">Anterior</span>
          <span className="flex-1 text-center">Peso</span>
          <span className="flex-1 text-center">Reps</span>
          {usaEsforco && <span className="w-11 text-center">{config.esforco === "rpe" ? "RPE" : "RIR"}</span>}
          <span className="w-9" />
        </div>

        {linhas.map((l) => {
          const comp = comparacoes[l.id];
          const tipoInfo = TIPOS_SERIE.find((t) => t.valor === (l.tipo || "normal"));
          return (
            <div key={l.id}>
              <div className="flex items-center gap-1.5">
                {/* Número + tipo */}
                <button
                  onClick={() => {
                    const i = TIPOS_SERIE.findIndex((t) => t.valor === (l.tipo || "normal"));
                    const prox = TIPOS_SERIE[(i + 1) % TIPOS_SERIE.length];
                    alterar(l.id, "tipo", prox.valor);
                    salvarSerie(l.id, { tipo: prox.valor }).catch(() => {});
                  }}
                  className={`w-7 h-11 rounded-lg text-xs font-bold shrink-0 ${
                    l.tipo === "aquecimento"
                      ? "bg-yellow-100 text-yellow-700"
                      : l.tipo && l.tipo !== "normal"
                        ? "bg-marca/15 text-marca"
                        : "bg-neutral-100 text-neutral-500"
                  }`}
                  title={tipoInfo?.rotulo}
                >
                  {tipoInfo?.curto || l.numero}
                </button>

                {/* O que foi feito nesta série da última vez */}
                <span className="w-16 text-xs text-neutral-400 tabular-nums shrink-0">
                  {l.anterior ? `${formatarPeso(l.anterior.peso)}×${l.anterior.reps}` : "—"}
                </span>

                {/* Peso */}
                <div className="flex-1 flex items-center">
                  <button
                    onClick={() => ajustar(l.id, "peso", -incremento)}
                    className="w-7 h-11 rounded-l-lg bg-neutral-100 text-neutral-500 text-lg leading-none toque"
                    aria-label="Diminuir peso"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    value={l.peso}
                    onChange={(e) => alterar(l.id, "peso", e.target.value)}
                    className="w-full h-11 text-center text-base font-semibold border-y border-neutral-200 tabular-nums min-w-0"
                    placeholder="0"
                  />
                  <button
                    onClick={() => ajustar(l.id, "peso", incremento)}
                    className="w-7 h-11 rounded-r-lg bg-neutral-100 text-neutral-500 text-lg leading-none toque"
                    aria-label="Aumentar peso"
                  >
                    +
                  </button>
                </div>

                {/* Repetições */}
                <div className="flex-1 flex items-center">
                  <button
                    onClick={() => ajustar(l.id, "reps", -1)}
                    className="w-7 h-11 rounded-l-lg bg-neutral-100 text-neutral-500 text-lg leading-none toque"
                    aria-label="Menos uma repetição"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={l.reps}
                    onChange={(e) => alterar(l.id, "reps", e.target.value)}
                    className="w-full h-11 text-center text-base font-semibold border-y border-neutral-200 tabular-nums min-w-0"
                    placeholder="0"
                  />
                  <button
                    onClick={() => ajustar(l.id, "reps", 1)}
                    className="w-7 h-11 rounded-r-lg bg-neutral-100 text-neutral-500 text-lg leading-none toque"
                    aria-label="Mais uma repetição"
                  >
                    +
                  </button>
                </div>

                {/* Esforço percebido */}
                {usaEsforco && (
                  <input
                    type="number"
                    inputMode="decimal"
                    value={config.esforco === "rpe" ? (l.rpe ?? "") : (l.rir ?? "")}
                    onChange={(e) => alterar(l.id, config.esforco === "rpe" ? "rpe" : "rir", e.target.value)}
                    className="w-11 h-11 text-center text-sm border border-neutral-200 rounded-lg tabular-nums shrink-0"
                    placeholder="—"
                  />
                )}

                {/* Confirmar */}
                <button
                  onClick={() => (l.concluida ? desfazer(l) : confirmar(l))}
                  className={`w-9 h-11 rounded-lg flex items-center justify-center shrink-0 toque ${
                    l.concluida ? "bg-receita text-white" : "bg-neutral-100 text-neutral-400"
                  }`}
                  aria-label={l.concluida ? `Desfazer série ${l.numero}` : `Confirmar série ${l.numero}`}
                >
                  <Check size={20} strokeWidth={3} />
                </button>
              </div>

              {/* Comparação com a última vez */}
              {comp && (
                <div
                  className={`ml-9 mt-0.5 flex items-center gap-1 text-xs font-medium ${
                    comp.direcao === "subiu"
                      ? "text-receita"
                      : comp.direcao === "desceu"
                        ? "text-despesa"
                        : "text-neutral-400"
                  }`}
                >
                  {comp.direcao === "subiu" && <TrendingUp size={13} />}
                  {comp.direcao === "desceu" && <TrendingDown size={13} />}
                  {comp.direcao === "igual" && <Igual size={13} />}
                  {comp.texto}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Ações do exercício */}
      <div className="flex items-center gap-2 mt-2.5">
        <button
          onClick={novaSerie}
          className="flex items-center gap-1 text-xs text-marca font-medium toque py-1"
        >
          <Plus size={14} /> Série
        </button>
        {linhas.length > 1 && (
          <button
            onClick={() => removerSerie(linhas[linhas.length - 1].id)}
            className="flex items-center gap-1 text-xs text-neutral-400 toque py-1"
          >
            <Trash2 size={13} /> Remover última
          </button>
        )}
        <button
          onClick={() => setVerNotas((v) => !v)}
          className={`flex items-center gap-1 text-xs toque py-1 ml-auto ${
            notas ? "text-marca font-medium" : "text-neutral-400"
          }`}
        >
          <StickyNote size={13} /> Nota
        </button>
      </div>

      {verNotas && (
        <div className="mt-2">
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            placeholder="Ex: falhei na 9ª repetição · próximo treino aumentar 2,5 kg"
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={salvarNotas}
            className="mt-1 text-xs bg-marca text-white rounded-lg px-3 py-1.5 toque"
          >
            Salvar nota
          </button>
        </div>
      )}
      {notas && !verNotas && (
        <p className="mt-1.5 text-xs text-neutral-500 italic">{notas}</p>
      )}
    </section>
  );
}

function Info({ rotulo, valor }) {
  return (
    <div className="bg-superficie rounded-lg border border-neutral-200 px-2 py-1.5">
      <p className="text-[10px] text-neutral-400 leading-tight">{rotulo}</p>
      <p className="font-semibold text-sm tabular-nums">{valor}</p>
    </div>
  );
}

function formatarData(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}
