"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Lightbulb, Trophy, ChevronDown } from "lucide-react";
import { GraficoLinha, GraficoColunas, GraficoBarras } from "../../../components/academia/Graficos";
import { useToast } from "../../../components/Toast";
import { supabaseConfigurado } from "../../../lib/supabase";
import { estatisticas, listarExercicios, historicoDoExercicio, listarPesos, obterConfig } from "../../../lib/academia";
import {
  volumePorGrupo, evolucaoDoExercicio, compararPeriodos, consistencia,
  gerarInsights, estatisticasGerais, volumeSemanal, noPeriodo,
} from "../../../lib/analise";
import { formatarVolume, formatarPeso, formatarDuracao } from "../../../lib/treino";

const PERIODOS = [
  { id: 7, rotulo: "7 dias" },
  { id: 30, rotulo: "30 dias" },
  { id: 90, rotulo: "3 meses" },
  { id: 180, rotulo: "6 meses" },
  { id: 365, rotulo: "1 ano" },
  { id: 0, rotulo: "Tudo" },
];

export default function Evolucao() {
  const toast = useToast();
  const [sessoes, setSessoes] = useState([]);
  const [exercicios, setExercicios] = useState([]);
  const [pesos, setPesos] = useState([]);
  const [config, setConfig] = useState(null);
  const [dias, setDias] = useState(30);
  const [exSelecionado, setExSelecionado] = useState("");
  const [historicoEx, setHistoricoEx] = useState(null);
  const [metricaEx, setMetricaEx] = useState("rm");
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    if (!supabaseConfigurado) {
      setCarregando(false);
      return;
    }
    try {
      const [ss, ex, ps, cfg] = await Promise.all([
        estatisticas(),
        listarExercicios(),
        listarPesos().catch(() => []),
        obterConfig().catch(() => null),
      ]);
      setSessoes(ss);
      setExercicios(ex);
      setPesos(ps);
      setConfig(cfg);
    } catch (e) {
      toast("Erro: " + e.message, "erro");
    } finally {
      setCarregando(false);
    }
  }, [toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Carrega o histórico do exercício escolhido.
  useEffect(() => {
    if (!exSelecionado) {
      setHistoricoEx(null);
      return;
    }
    historicoDoExercicio(exSelecionado, { limite: 60 })
      .then(setHistoricoEx)
      .catch(() => setHistoricoEx([]));
  }, [exSelecionado]);

  const filtradas = useMemo(() => {
    if (!dias) return sessoes;
    const de = new Date();
    de.setDate(de.getDate() - dias);
    return noPeriodo(sessoes, de, null);
  }, [sessoes, dias]);

  const grupoPorExercicio = useMemo(() => {
    const m = {};
    exercicios.forEach((e) => (m[e.id] = e.grupo_muscular));
    return m;
  }, [exercicios]);

  const geral = useMemo(() => estatisticasGerais(filtradas), [filtradas]);
  const grupos = useMemo(() => volumePorGrupo(filtradas, grupoPorExercicio), [filtradas, grupoPorExercicio]);
  const semanal = useMemo(() => volumeSemanal(sessoes, 8), [sessoes]);
  const comp = useMemo(() => compararPeriodos(sessoes, dias || 30), [sessoes, dias]);
  const cons = useMemo(
    () => consistencia(sessoes, config?.meta_semanal || 4),
    [sessoes, config]
  );
  const insights = useMemo(
    () => gerarInsights({ sessoes, exercicios, pesos, metaSemanal: config?.meta_semanal || 4 }),
    [sessoes, exercicios, pesos, config]
  );

  const evolucaoEx = useMemo(() => (historicoEx ? evolucaoDoExercicio(historicoEx) : []), [historicoEx]);

  if (!supabaseConfigurado) {
    return (
      <div className="mt-10 bg-yellow-50 border border-yellow-300 rounded-xl p-4 text-yellow-800">
        Configure o Supabase (.env.local) para usar a academia.
      </div>
    );
  }

  if (carregando) return <p className="text-neutral-400 text-sm mt-6">Carregando…</p>;

  if (sessoes.length === 0) {
    return (
      <div>
        <h1 className="text-xl font-bold mb-4">Evolução</h1>
        <div className="text-center py-12 border border-dashed border-neutral-300 rounded-xl">
          <TrendingUp size={28} className="mx-auto text-neutral-300 mb-2" />
          <p className="text-neutral-500">Registre alguns treinos para ver sua evolução.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-2">
      <h1 className="text-xl font-bold mb-3">Evolução</h1>

      {/* Filtro de período — um só, acima de tudo que ele afeta */}
      <div className="flex gap-1.5 overflow-x-auto mb-4 -mx-4 px-4">
        {PERIODOS.map((p) => (
          <button
            key={p.id}
            onClick={() => setDias(p.id)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap toque ${
              dias === p.id ? "bg-marca text-white font-medium" : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {p.rotulo}
          </button>
        ))}
      </div>

      {/* INSIGHTS */}
      {insights.length > 0 && (
        <section className="mb-4 space-y-1.5">
          {insights.map((ins, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm border ${
                ins.tipo === "bom"
                  ? "bg-receita/5 border-receita/25 text-receita"
                  : ins.tipo === "atencao"
                    ? "bg-yellow-50 border-yellow-300 text-yellow-800"
                    : "bg-neutral-50 border-neutral-200 text-neutral-600"
              }`}
            >
              <Lightbulb size={15} className="shrink-0 mt-0.5" />
              <span>{ins.texto}</span>
            </div>
          ))}
        </section>
      )}

      {/* COMPARAÇÃO COM O PERÍODO ANTERIOR */}
      <section className="bg-superficie rounded-xl border border-neutral-200 p-4 mb-4">
        <h2 className="font-semibold mb-1">Comparado ao período anterior</h2>
        <p className="text-xs text-neutral-500 mb-3">
          Últimos {comp.dias} dias contra os {comp.dias} anteriores
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Comparativo rotulo="Treinos" valor={comp.atual.treinos} variacao={comp.variacao.treinos} />
          <Comparativo rotulo="Séries" valor={comp.atual.series} variacao={comp.variacao.series} />
          <Comparativo
            rotulo="Volume"
            valor={formatarVolume(comp.atual.volume)}
            variacao={comp.variacao.volume}
          />
          <Comparativo
            rotulo="Carga média"
            valor={`${formatarPeso(comp.atual.cargaMedia)} kg`}
            variacao={comp.variacao.cargaMedia}
          />
        </div>
      </section>

      {/* ESTATÍSTICAS GERAIS */}
      <section className="bg-superficie rounded-xl border border-neutral-200 p-4 mb-4">
        <h2 className="font-semibold mb-3">No período</h2>
        <div className="grid grid-cols-2 gap-2">
          <Stat rotulo="Treinos" valor={geral.treinos} />
          <Stat rotulo="Séries" valor={geral.series} />
          <Stat rotulo="Volume total" valor={formatarVolume(geral.volumeTotal)} />
          <Stat rotulo="Volume médio" valor={formatarVolume(geral.volumeMedio)} />
          <Stat rotulo="Tempo total" valor={formatarDuracao(geral.tempoTotal)} />
          <Stat rotulo="Tempo médio" valor={formatarDuracao(geral.tempoMedio)} />
        </div>
      </section>

      {/* VOLUME SEMANAL */}
      <section className="bg-superficie rounded-xl border border-neutral-200 p-4 mb-4">
        <h2 className="font-semibold mb-1">Volume por semana</h2>
        <p className="text-xs text-neutral-500 mb-3">Últimas 8 semanas</p>
        <GraficoColunas
          dados={semanal.map((s) => ({ rotulo: s.rotulo, valor: s.volume }))}
          formatar={formatarVolume}
        />
      </section>

      {/* VOLUME POR GRUPO MUSCULAR */}
      <section className="bg-superficie rounded-xl border border-neutral-200 p-4 mb-4">
        <h2 className="font-semibold mb-1">Séries por grupo muscular</h2>
        <p className="text-xs text-neutral-500 mb-3">
          Ajuda a ver qual músculo está recebendo mais ou menos estímulo
        </p>
        <GraficoBarras
          dados={grupos.map((g) => ({
            rotulo: g.grupo,
            valor: g.series,
            secundario: formatarVolume(g.volume),
          }))}
          formatar={(v) => `${v} séries`}
        />
      </section>

      {/* CONSISTÊNCIA */}
      <section className="bg-superficie rounded-xl border border-neutral-200 p-4 mb-4">
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="font-semibold">Consistência</h2>
          <span className="text-sm text-neutral-500">
            meta: {cons.metaSemanal}/semana
          </span>
        </div>
        <p className="text-xs text-neutral-500 mb-3">
          {cons.aderencia.toFixed(0)}% das semanas fechadas bateram a meta
          {cons.seguidas > 0 && ` · ${cons.seguidas} seguidas`}
        </p>
        <div className="flex gap-1.5">
          {cons.semanas.map((s, i) => (
            <div key={i} className="flex-1 text-center">
              <div
                className={`h-12 rounded-lg flex items-end justify-center pb-1 text-[10px] font-semibold tabular-nums ${
                  s.bateu
                    ? "bg-receita/20 text-receita"
                    : s.treinos > 0
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-neutral-100 text-neutral-400"
                }`}
                title={`${s.treinos} de ${s.meta}`}
              >
                {s.treinos}
              </div>
              <span className="text-[9px] text-neutral-400">
                {s.atual ? "atual" : `${String(s.inicio.getDate()).padStart(2, "0")}/${String(s.inicio.getMonth() + 1).padStart(2, "0")}`}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* EVOLUÇÃO POR EXERCÍCIO */}
      <section className="bg-superficie rounded-xl border border-neutral-200 p-4">
        <h2 className="font-semibold mb-3">Evolução por exercício</h2>

        <div className="relative mb-3">
          <select
            value={exSelecionado}
            onChange={(e) => setExSelecionado(e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 bg-superficie appearance-none toque"
          >
            <option value="">Escolha um exercício…</option>
            {exercicios.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
        </div>

        {exSelecionado && (
          <>
            <div className="flex gap-1.5 mb-3">
              {[
                { id: "rm", rotulo: "1RM" },
                { id: "carga", rotulo: "Carga" },
                { id: "volume", rotulo: "Volume" },
                { id: "reps", rotulo: "Reps" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMetricaEx(m.id)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs toque ${
                    metricaEx === m.id ? "bg-marca text-white font-medium" : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {m.rotulo}
                </button>
              ))}
            </div>

            {historicoEx === null ? (
              <p className="text-sm text-neutral-400 text-center py-6">Carregando…</p>
            ) : (
              <GraficoLinha
                pontos={evolucaoEx.map((p) => ({
                  rotulo: formatarDataCurta(p.data),
                  valor: p[metricaEx] || 0,
                }))}
                formatar={(v) =>
                  metricaEx === "volume"
                    ? formatarVolume(v)
                    : metricaEx === "reps"
                      ? `${Math.round(v)}`
                      : `${formatarPeso(v)} kg`
                }
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}

function Comparativo({ rotulo, valor, variacao }) {
  const temVariacao = variacao != null && Number.isFinite(variacao);
  const subiu = temVariacao && variacao > 0.5;
  const desceu = temVariacao && variacao < -0.5;
  return (
    <div className="bg-neutral-50 rounded-lg border border-neutral-200 px-3 py-2">
      <p className="text-xs text-neutral-500">{rotulo}</p>
      <p className="text-lg font-bold tabular-nums leading-tight">{valor}</p>
      {temVariacao ? (
        <p
          className={`text-xs font-medium flex items-center gap-0.5 ${
            subiu ? "text-receita" : desceu ? "text-despesa" : "text-neutral-400"
          }`}
        >
          {subiu && <TrendingUp size={12} />}
          {desceu && <TrendingDown size={12} />}
          {!subiu && !desceu && <Minus size={12} />}
          {variacao > 0 ? "+" : ""}
          {variacao.toFixed(0)}%
        </p>
      ) : (
        <p className="text-xs text-neutral-400">sem base</p>
      )}
    </div>
  );
}

function Stat({ rotulo, valor }) {
  return (
    <div className="bg-neutral-50 rounded-lg border border-neutral-200 px-3 py-2">
      <p className="text-xs text-neutral-500">{rotulo}</p>
      <p className="text-lg font-bold tabular-nums">{valor}</p>
    </div>
  );
}

function formatarDataCurta(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}
