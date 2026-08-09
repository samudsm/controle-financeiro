"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Flag, Trophy, Link2 } from "lucide-react";
import ExercicioNoTreino from "../../../components/academia/ExercicioNoTreino";
import CronometroDescanso from "../../../components/academia/CronometroDescanso";
import EscolherExercicio from "../../../components/academia/EscolherExercicio";
import { useToast } from "../../../components/Toast";
import { supabaseConfigurado } from "../../../lib/supabase";
import {
  sessaoEmAndamento, obterSessao, finalizarSessao, deletarSessao,
  historicoDoExercicio, adicionarExercicioNaSessao, obterConfig, montarBlocos,
} from "../../../lib/academia";
import {
  volumeDasSeries, formatarVolume, formatarDuracao, formatarCronometro,
  detectarRecordes, contaNoVolume,
} from "../../../lib/treino";

export default function TreinoEmAndamento() {
  const toast = useToast();
  const router = useRouter();

  const [sessao, setSessao] = useState(null);
  const [historicos, setHistoricos] = useState({});
  const [config, setConfig] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [descanso, setDescanso] = useState(null); // { segundos, chave }
  const [agora, setAgora] = useState(Date.now());
  const [adicionando, setAdicionando] = useState(false);
  const [resumo, setResumo] = useState(null);

  // Relógio do treino
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const carregar = useCallback(async () => {
    if (!supabaseConfigurado) {
      setCarregando(false);
      return;
    }
    try {
      const emAndamento = await sessaoEmAndamento();
      if (!emAndamento) {
        setSessao(null);
        setCarregando(false);
        return;
      }
      const [completa, cfg] = await Promise.all([obterSessao(emAndamento.id), obterConfig()]);
      setSessao(completa);
      setConfig(cfg);

      // Histórico de cada exercício, ignorando a sessão atual.
      const mapa = {};
      await Promise.all(
        completa.exercicios.map(async (se) => {
          if (!se.exercicio_id) return;
          mapa[se.exercicio_id] = await historicoDoExercicio(se.exercicio_id, {
            ignorarSessaoId: completa.id,
          });
        })
      );
      setHistoricos(mapa);
    } catch (e) {
      toast("Erro ao carregar: " + e.message, "erro");
    } finally {
      setCarregando(false);
    }
  }, [toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function finalizar() {
    try {
      const completa = await obterSessao(sessao.id);
      const todasSeries = completa.exercicios.flatMap((e) => e.series);
      const validas = todasSeries.filter(contaNoVolume);

      if (validas.length === 0) {
        if (!window.confirm("Nenhuma série foi registrada. Descartar este treino?")) return;
        await deletarSessao(sessao.id);
        toast("Treino descartado");
        router.push("/academia");
        return;
      }

      // Recordes: compara cada exercício com todo o histórico anterior.
      const recordes = [];
      for (const se of completa.exercicios) {
        if (!se.exercicio_id) continue;
        const anterior = (historicos[se.exercicio_id] || []).flatMap((h) => h.series);
        const achados = detectarRecordes(se.series, anterior);
        achados.forEach((r) => recordes.push({ ...r, exercicio: se.nome }));
      }

      const finalizada = await finalizarSessao(sessao.id);

      setResumo({
        nome: completa.nome,
        duracao: finalizada.duracao_seg,
        exercicios: completa.exercicios.filter((e) => e.series.some(contaNoVolume)).length,
        series: validas.length,
        volume: volumeDasSeries(todasSeries),
        recordes,
      });
    } catch (e) {
      toast("Erro ao finalizar: " + e.message, "erro");
    }
  }

  async function descartar() {
    if (!window.confirm("Descartar este treino? Tudo que foi registrado será perdido.")) return;
    try {
      await deletarSessao(sessao.id);
      toast("Treino descartado");
      router.push("/academia");
    } catch (e) {
      toast("Erro: " + e.message, "erro");
    }
  }

  if (!supabaseConfigurado) {
    return <Aviso>Configure o Supabase (.env.local) para usar a academia.</Aviso>;
  }

  // ---------- RESUMO FINAL ----------
  if (resumo) return <ResumoFinal resumo={resumo} />;

  if (carregando) return <p className="text-neutral-400 text-sm mt-6">Carregando…</p>;

  if (!sessao) {
    return (
      <div className="mt-10 text-center">
        <p className="text-neutral-500 mb-4">Nenhum treino em andamento.</p>
        <Link href="/academia" className="inline-block bg-marca text-white rounded-xl px-5 py-3 font-semibold toque">
          Ir para o início
        </Link>
      </div>
    );
  }

  const decorrido = Math.round((agora - new Date(sessao.inicio)) / 1000);
  const todas = sessao.exercicios.flatMap((e) => e.series);
  const feitas = todas.filter(contaNoVolume);

  return (
    <div className="pb-4">
      {/* Cabeçalho fixo com o cronômetro do treino */}
      <div className="sticky top-0 -mx-4 px-4 py-2.5 bg-superficie/95 backdrop-blur border-b border-neutral-200 z-30">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="font-bold truncate">{sessao.nome}</h1>
            <p className="text-xs text-neutral-500 tabular-nums">
              {formatarCronometro(decorrido)} · {feitas.length} séries · {formatarVolume(volumeDasSeries(todas))}
            </p>
          </div>
          <button
            onClick={finalizar}
            className="flex items-center gap-1.5 bg-receita text-white rounded-lg px-3 py-2 text-sm font-semibold toque shrink-0"
          >
            <Flag size={16} /> Finalizar
          </button>
        </div>
      </div>

      <div className="space-y-3 mt-3">
        {montarBlocos(sessao.exercicios).map((bloco, bi) => {
          const emBloco = bloco.exercicios.length > 1;

          const itens = bloco.exercicios.map((se, i) => (
            <ExercicioNoTreino
              key={se.id}
              se={se}
              historico={historicos[se.exercicio_id] || []}
              config={config}
              emBiSet={emBloco}
              ultimoDoBloco={i === bloco.exercicios.length - 1}
              proximoDoBloco={emBloco ? bloco.exercicios[i + 1]?.nome : null}
              onDescanso={(seg) => setDescanso({ segundos: seg, chave: Date.now() })}
              onMudou={carregar}
              aoAvisar={toast}
            />
          ));

          if (!emBloco) return itens[0];

          return (
            <div key={`bloco-${bi}`} className="rounded-xl border-2 border-marca/30 bg-marca/5 p-2">
              <p className="text-[10px] uppercase tracking-wide text-marca font-semibold mb-2 flex items-center gap-1 px-1">
                <Link2 size={12} />
                {bloco.exercicios.length === 2 ? "Bi-set" : `Supersérie de ${bloco.exercicios.length}`}
                <span className="font-normal text-marca/60 normal-case tracking-normal">
                  · descanso só no fim do bloco
                </span>
              </p>
              <div className="space-y-2">{itens}</div>
            </div>
          );
        })}
      </div>

      <button
        onClick={() => setAdicionando(true)}
        className="w-full mt-3 flex items-center justify-center gap-2 border-2 border-dashed border-neutral-300 text-neutral-500 rounded-xl py-3 toque"
      >
        <Plus size={18} /> Adicionar exercício
      </button>

      <button onClick={descartar} className="w-full mt-4 text-xs text-neutral-400 toque py-2">
        Descartar treino
      </button>

      {descanso && (
        <CronometroDescanso
          key={descanso.chave}
          segundos={descanso.segundos}
          onFechar={() => setDescanso(null)}
        />
      )}

      {adicionando && (
        <EscolherExercicio
          aoAvisar={toast}
          onFechar={() => setAdicionando(false)}
          onEscolher={async (ex) => {
            try {
              await adicionarExercicioNaSessao(sessao.id, ex);
              setAdicionando(false);
              carregar();
            } catch (e) {
              toast("Erro: " + e.message, "erro");
            }
          }}
        />
      )}
    </div>
  );
}

/* ---------------- RESUMO DO TREINO ---------------- */
function ResumoFinal({ resumo }) {
  return (
    <div className="pt-6">
      <div className="text-center mb-5">
        <div className="w-16 h-16 rounded-full bg-receita/15 text-receita flex items-center justify-center mx-auto mb-3">
          <Flag size={30} />
        </div>
        <h1 className="text-xl font-bold">Treino finalizado</h1>
        <p className="text-neutral-500">{resumo.nome}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Metrica rotulo="Duração" valor={formatarDuracao(resumo.duracao)} />
        <Metrica rotulo="Volume" valor={formatarVolume(resumo.volume)} />
        <Metrica rotulo="Exercícios" valor={resumo.exercicios} />
        <Metrica rotulo="Séries" valor={resumo.series} />
      </div>

      {resumo.recordes.length > 0 && (
        <section className="mt-4 rounded-xl border border-yellow-300 bg-yellow-50 p-4">
          <h2 className="font-bold text-yellow-800 flex items-center gap-2 mb-2">
            <Trophy size={18} />
            {resumo.recordes.length} recorde{resumo.recordes.length > 1 ? "s" : ""} pessoal
            {resumo.recordes.length > 1 ? "is" : ""}
          </h2>
          <div className="space-y-2">
            {resumo.recordes.map((r, i) => (
              <div key={i} className="text-sm">
                <p className="font-semibold text-yellow-900">{r.exercicio}</p>
                <p className="text-yellow-800">
                  {r.texto} <span className="text-yellow-600 text-xs">(antes: {r.anterior})</span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex gap-2 mt-5">
        <Link
          href="/academia/historico"
          className="flex-1 text-center border border-neutral-300 rounded-xl py-3 font-medium toque"
        >
          Ver histórico
        </Link>
        <Link
          href="/academia"
          className="flex-1 text-center bg-marca text-white rounded-xl py-3 font-semibold toque"
        >
          Início
        </Link>
      </div>
    </div>
  );
}

function Metrica({ rotulo, valor }) {
  return (
    <div className="bg-superficie rounded-xl border border-neutral-200 p-3">
      <p className="text-xs text-neutral-500">{rotulo}</p>
      <p className="text-xl font-bold tabular-nums">{valor}</p>
    </div>
  );
}

function Aviso({ children }) {
  return (
    <div className="mt-10 bg-yellow-50 border border-yellow-300 rounded-xl p-4 text-yellow-800">
      {children}
    </div>
  );
}
