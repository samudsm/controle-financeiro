"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, Dumbbell, Flame, ChevronRight, Plus, Trophy } from "lucide-react";
import Modal from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { supabaseConfigurado } from "../../lib/supabase";
import {
  sessaoEmAndamento, listarFichas, iniciarSessaoDeFicha, iniciarSessaoVazia, estatisticas,
} from "../../lib/academia";
import {
  volumeDasSeries, formatarVolume, formatarDuracao, contaNoVolume,
} from "../../lib/treino";

export default function AcademiaInicio() {
  const toast = useToast();
  const router = useRouter();

  const [emAndamento, setEmAndamento] = useState(null);
  const [fichas, setFichas] = useState([]);
  const [sessoes, setSessoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [escolhendo, setEscolhendo] = useState(false);

  const carregar = useCallback(async () => {
    if (!supabaseConfigurado) {
      setCarregando(false);
      return;
    }
    try {
      const [andamento, fs, sess] = await Promise.all([
        sessaoEmAndamento(),
        listarFichas(),
        estatisticas(),
      ]);
      setEmAndamento(andamento);
      setFichas(fs);
      setSessoes(sess);
    } catch (e) {
      toast("Erro: " + e.message, "erro");
    } finally {
      setCarregando(false);
    }
  }, [toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function iniciar(ficha) {
    try {
      const s = ficha ? await iniciarSessaoDeFicha(ficha.id) : await iniciarSessaoVazia();
      router.push("/academia/treino");
      return s;
    } catch (e) {
      toast("Erro ao iniciar: " + e.message, "erro");
    }
  }

  if (!supabaseConfigurado) {
    return (
      <div className="mt-10 bg-yellow-50 border border-yellow-300 rounded-xl p-4 text-yellow-800">
        Configure o Supabase (.env.local) para usar a academia.
      </div>
    );
  }

  // ---- Números da semana e do mês ----
  const agora = new Date();
  const inicioSemana = new Date(agora);
  inicioSemana.setDate(agora.getDate() - ((agora.getDay() + 6) % 7)); // segunda-feira
  inicioSemana.setHours(0, 0, 0, 0);
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

  const daSemana = sessoes.filter((s) => new Date(s.inicio) >= inicioSemana);
  const doMes = sessoes.filter((s) => new Date(s.inicio) >= inicioMes);

  const seriesSemana = daSemana.flatMap((s) => s.exercicios.flatMap((e) => e.series)).filter(contaNoVolume);
  const volumeSemana = daSemana.reduce(
    (soma, s) => soma + volumeDasSeries(s.exercicios.flatMap((e) => e.series)),
    0
  );
  const sequencia = calcularSequencia(sessoes);
  const ultimo = sessoes[0];
  const proxima = sugerirProxima(fichas, sessoes);

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">Academia</h1>
          {proxima ? (
            <p className="text-sm text-neutral-500">
              Sugestão de hoje: <strong className="text-neutral-700">{proxima.nome}</strong>
            </p>
          ) : (
            <p className="text-sm text-neutral-500">Registre seus treinos e acompanhe a evolução</p>
          )}
        </div>
      </div>

      {/* Treino em andamento tem prioridade sobre tudo */}
      {emAndamento ? (
        <Link
          href="/academia/treino"
          className="flex items-center gap-3 w-full bg-receita text-white rounded-2xl px-5 py-4 font-bold text-lg toque shadow-sm"
        >
          <Dumbbell size={26} />
          <span className="flex-1 text-left">
            Continuar treino
            <span className="block text-sm font-normal opacity-90">{emAndamento.nome}</span>
          </span>
          <ChevronRight size={22} />
        </Link>
      ) : (
        <button
          onClick={() => setEscolhendo(true)}
          className="flex items-center justify-center gap-2 w-full bg-marca text-white rounded-2xl px-5 py-5 font-bold text-lg toque shadow-sm"
        >
          <Play size={24} fill="currentColor" /> INICIAR TREINO
        </button>
      )}

      {/* Números */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <Card rotulo="Treinos na semana" valor={daSemana.length} />
        <Card rotulo="Treinos no mês" valor={doMes.length} />
        <Card
          rotulo="Sequência"
          valor={sequencia > 0 ? `${sequencia} sem` : "—"}
          Icone={sequencia > 0 ? Flame : null}
        />
        <Card rotulo="Séries na semana" valor={seriesSemana.length} />
        <Card rotulo="Volume da semana" valor={formatarVolume(volumeSemana)} largo />
      </div>

      {/* Últimos treinos */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Últimos treinos</h2>
          {sessoes.length > 0 && (
            <Link href="/academia/historico" className="text-sm text-marca toque">
              Ver todos
            </Link>
          )}
        </div>

        {carregando && <p className="text-neutral-400 text-sm">Carregando…</p>}

        {!carregando && sessoes.length === 0 && (
          <div className="text-center py-8 border border-dashed border-neutral-300 rounded-xl">
            <p className="text-neutral-500 text-sm mb-3">Nenhum treino registrado ainda.</p>
            {fichas.length === 0 && (
              <Link
                href="/academia/fichas"
                className="inline-flex items-center gap-1 text-marca font-medium text-sm toque"
              >
                <Plus size={16} /> Criar sua primeira ficha
              </Link>
            )}
          </div>
        )}

        <div className="space-y-2">
          {sessoes.slice(0, 5).map((s) => {
            const series = s.exercicios.flatMap((e) => e.series).filter(contaNoVolume);
            return (
              <Link
                key={s.id}
                href={`/academia/historico?sessao=${s.id}`}
                className="flex items-center gap-3 bg-white rounded-xl border border-neutral-200 p-3 toque"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{s.nome}</p>
                  <p className="text-xs text-neutral-500">
                    {formatarDataLonga(s.inicio)}
                    {s.duracao_seg ? ` · ${formatarDuracao(s.duracao_seg)}` : ""}
                  </p>
                  <p className="text-xs text-neutral-400 tabular-nums">
                    {series.length} séries ·{" "}
                    {formatarVolume(volumeDasSeries(s.exercicios.flatMap((e) => e.series)))}
                  </p>
                </div>
                <ChevronRight size={18} className="text-neutral-300 shrink-0" />
              </Link>
            );
          })}
        </div>
      </section>

      {escolhendo && (
        <Modal titulo="Iniciar treino" onFechar={() => setEscolhendo(false)}>
          {fichas.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-neutral-500 text-sm mb-3">Você ainda não tem fichas.</p>
              <Link
                href="/academia/fichas"
                className="inline-block bg-marca text-white rounded-lg px-4 py-2.5 font-medium toque"
              >
                Criar ficha
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {fichas.map((f) => (
                <button
                  key={f.id}
                  onClick={() => iniciar(f)}
                  className="w-full text-left px-4 py-3 rounded-xl border border-neutral-200 hover:border-marca toque"
                >
                  <p className="font-semibold">{f.nome}</p>
                  <p className="text-xs text-neutral-500">
                    {f.descricao ? `${f.descricao} · ` : ""}
                    {f.exercicios.length} exercício{f.exercicios.length === 1 ? "" : "s"}
                  </p>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => iniciar(null)}
            className="w-full mt-3 flex items-center justify-center gap-2 border-2 border-dashed border-neutral-300 text-neutral-600 rounded-xl py-3 toque"
          >
            <Plus size={18} /> Treino livre (sem ficha)
          </button>
        </Modal>
      )}
    </div>
  );
}

function Card({ rotulo, valor, Icone, largo }) {
  return (
    <div className={`bg-white rounded-xl border border-neutral-200 p-3 ${largo ? "col-span-2" : ""}`}>
      <p className="text-xs text-neutral-500">{rotulo}</p>
      <p className="text-xl font-bold tabular-nums flex items-center gap-1.5">
        {Icone && <Icone size={18} className="text-despesa" />}
        {valor}
      </p>
    </div>
  );
}

// Semanas seguidas com pelo menos um treino, contando de trás para frente.
function calcularSequencia(sessoes) {
  if (!sessoes.length) return 0;
  const semanas = new Set(
    sessoes.map((s) => {
      const d = new Date(s.inicio);
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );
  const inicioDestaSemana = new Date();
  inicioDestaSemana.setDate(inicioDestaSemana.getDate() - ((inicioDestaSemana.getDay() + 6) % 7));
  inicioDestaSemana.setHours(0, 0, 0, 0);

  let conta = 0;
  let cursor = new Date(inicioDestaSemana);
  // Se ainda não treinou nesta semana, a sequência começa a contar da anterior.
  if (!semanas.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 7);
  while (semanas.has(cursor.getTime())) {
    conta++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return conta;
}

// Sugere a ficha que está há mais tempo sem ser treinada.
function sugerirProxima(fichas, sessoes) {
  if (!fichas.length) return null;
  const ultimaVez = {};
  sessoes.forEach((s) => {
    if (s.ficha_id && !ultimaVez[s.ficha_id]) ultimaVez[s.ficha_id] = new Date(s.inicio);
  });
  return [...fichas].sort((a, b) => {
    const ta = ultimaVez[a.id]?.getTime() ?? 0;
    const tb = ultimaVez[b.id]?.getTime() ?? 0;
    return ta - tb;
  })[0];
}

function formatarDataLonga(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
