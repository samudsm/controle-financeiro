"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Plus, ChevronDown, ChevronUp, StickyNote, Trophy } from "lucide-react";
import EscolherExercicio from "../../../components/academia/EscolherExercicio";
import { useToast } from "../../../components/Toast";
import { supabaseConfigurado } from "../../../lib/supabase";
import { listarExercicios, atualizarExercicio, historicoDoExercicio } from "../../../lib/academia";
import {
  maiorCarga, melhorSerie, melhor1RM, volumeDasSeries,
  formatarPeso, formatarVolume, contaNoVolume,
} from "../../../lib/treino";

export default function Exercicios() {
  const toast = useToast();
  const [lista, setLista] = useState([]);
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(null);
  const [criando, setCriando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    if (!supabaseConfigurado) {
      setCarregando(false);
      return;
    }
    try {
      setLista(await listarExercicios());
    } catch (e) {
      toast("Erro: " + e.message, "erro");
    } finally {
      setCarregando(false);
    }
  }, [toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const filtrados = useMemo(() => {
    const t = busca.toLowerCase().trim();
    if (!t) return lista;
    return lista.filter((e) =>
      `${e.nome} ${e.grupo_muscular} ${e.equipamento || ""}`.toLowerCase().includes(t)
    );
  }, [lista, busca]);

  const porGrupo = useMemo(() => {
    const mapa = {};
    filtrados.forEach((e) => {
      (mapa[e.grupo_muscular] = mapa[e.grupo_muscular] || []).push(e);
    });
    return mapa;
  }, [filtrados]);

  if (!supabaseConfigurado) {
    return (
      <div className="mt-10 bg-yellow-50 border border-yellow-300 rounded-xl p-4 text-yellow-800">
        Configure o Supabase (.env.local) para usar a academia.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold">Exercícios</h1>
        <button
          onClick={() => setCriando(true)}
          className="flex items-center gap-1 bg-marca text-white rounded-lg px-3 py-2 text-sm font-medium toque"
        >
          <Plus size={16} /> Novo
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar exercício…"
          className="w-full border border-neutral-300 rounded-lg pl-9 pr-3 py-2.5 toque"
        />
      </div>

      {carregando && <p className="text-neutral-400 text-sm">Carregando…</p>}

      {Object.entries(porGrupo).map(([grupo, itens]) => (
        <section key={grupo} className="mb-4">
          <h2 className="text-[10px] uppercase tracking-wide text-neutral-400 mb-1.5">{grupo}</h2>
          <div className="space-y-1.5">
            {itens.map((e) => (
              <CardExercicio
                key={e.id}
                ex={e}
                expandido={aberto === e.id}
                onAlternar={() => setAberto(aberto === e.id ? null : e.id)}
                onMudou={carregar}
                aoAvisar={toast}
              />
            ))}
          </div>
        </section>
      ))}

      {!carregando && filtrados.length === 0 && (
        <p className="text-sm text-neutral-400 text-center py-6">Nenhum exercício encontrado.</p>
      )}

      {criando && (
        <EscolherExercicio
          aoAvisar={toast}
          onFechar={() => setCriando(false)}
          onEscolher={() => {
            setCriando(false);
            carregar();
          }}
        />
      )}
    </div>
  );
}

function CardExercicio({ ex, expandido, onAlternar, onMudou, aoAvisar }) {
  const [historico, setHistorico] = useState(null);
  const [notas, setNotas] = useState(ex.notas || "");
  const [editandoNotas, setEditandoNotas] = useState(false);

  useEffect(() => {
    if (expandido && historico === null) {
      historicoDoExercicio(ex.id, { limite: 20 })
        .then(setHistorico)
        .catch(() => setHistorico([]));
    }
  }, [expandido, historico, ex.id]);

  async function salvarNotas() {
    try {
      await atualizarExercicio(ex.id, { notas: notas.trim() || null });
      setEditandoNotas(false);
      aoAvisar?.("✓ Nota salva");
      onMudou?.();
    } catch (e) {
      aoAvisar?.("Erro: " + e.message, "erro");
    }
  }

  const todas = (historico || []).flatMap((h) => h.series);
  const carga = maiorCarga(todas);
  const melhor = melhorSerie(todas);
  const rm = melhor1RM(todas);
  const volumeTotal = volumeDasSeries(todas);

  return (
    <div className="bg-superficie rounded-xl border border-neutral-200 overflow-hidden">
      <button onClick={onAlternar} className="w-full flex items-center gap-2 px-3 py-2.5 text-left toque">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{ex.nome}</p>
          <p className="text-xs text-neutral-400">
            {ex.equipamento}
            {ex.notas ? " · tem nota" : ""}
          </p>
        </div>
        {expandido ? (
          <ChevronUp size={18} className="text-neutral-400 shrink-0" />
        ) : (
          <ChevronDown size={18} className="text-neutral-400 shrink-0" />
        )}
      </button>

      {expandido && (
        <div className="border-t border-neutral-100 p-3">
          {historico === null ? (
            <p className="text-sm text-neutral-400">Carregando histórico…</p>
          ) : historico.length === 0 ? (
            <p className="text-sm text-neutral-400">Você ainda não registrou este exercício.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Info rotulo="Melhor carga" valor={carga ? `${formatarPeso(carga)} kg` : "—"} />
                <Info
                  rotulo="Melhor série"
                  valor={melhor ? `${formatarPeso(melhor.peso)} × ${melhor.reps}` : "—"}
                />
                <Info rotulo="1RM estimado" valor={rm ? `${formatarPeso(rm)} kg` : "—"} />
                <Info rotulo="Volume total" valor={formatarVolume(volumeTotal)} />
              </div>

              <p className="text-[10px] uppercase tracking-wide text-neutral-400 mt-3 mb-1">
                Histórico · {historico.length} execuç{historico.length === 1 ? "ão" : "ões"}
              </p>
              <div className="space-y-1.5">
                {historico.slice(0, 10).map((h) => (
                  <div key={h.sessaoExercicioId} className="flex gap-2 text-sm">
                    <span className="w-12 shrink-0 text-xs text-neutral-400 pt-0.5">
                      {formatarDataCurta(h.data)}
                    </span>
                    <span className="flex-1 tabular-nums text-neutral-700">
                      {h.series
                        .filter(contaNoVolume)
                        .map((s) => `${formatarPeso(s.peso)}×${s.reps}`)
                        .join("   ")}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Notas permanentes (item 20) */}
          <div className="mt-3 pt-3 border-t border-neutral-100">
            {editandoNotas ? (
              <>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={3}
                  placeholder="Ex: banco no nível 3 · pegada mais fechada · controlar a descida"
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
                />
                <div className="flex gap-2 mt-1.5">
                  <button
                    onClick={() => {
                      setNotas(ex.notas || "");
                      setEditandoNotas(false);
                    }}
                    className="text-xs text-neutral-500 px-2 py-1.5 toque"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={salvarNotas}
                    className="ml-auto bg-marca text-white rounded-lg px-4 py-1.5 text-sm toque"
                  >
                    Salvar nota
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => setEditandoNotas(true)}
                className="flex items-start gap-2 text-left w-full toque"
              >
                <StickyNote size={14} className="text-neutral-400 mt-0.5 shrink-0" />
                <span className={`text-sm ${ex.notas ? "text-neutral-700" : "text-neutral-400"}`}>
                  {ex.notas || "Adicionar nota permanente"}
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ rotulo, valor }) {
  return (
    <div className="bg-neutral-50 rounded-lg border border-neutral-200 px-2.5 py-2">
      <p className="text-[10px] text-neutral-400">{rotulo}</p>
      <p className="font-semibold tabular-nums">{valor}</p>
    </div>
  );
}

function formatarDataCurta(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}
