"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Pencil, Copy, Trash2, ChevronDown, ChevronUp, GripVertical, Play, X,
} from "lucide-react";
import Modal from "../../../components/Modal";
import EscolherExercicio from "../../../components/academia/EscolherExercicio";
import { useToast } from "../../../components/Toast";
import { supabaseConfigurado } from "../../../lib/supabase";
import {
  listarFichas, criarFicha, atualizarFicha, deletarFicha, duplicarFicha,
  adicionarExercicioNaFicha, atualizarFichaExercicio, removerExercicioDaFicha,
  iniciarSessaoDeFicha, sessaoEmAndamento,
} from "../../../lib/academia";
import { formatarDuracao } from "../../../lib/treino";

export default function Fichas() {
  const toast = useToast();
  const router = useRouter();

  const [fichas, setFichas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [aberta, setAberta] = useState(null); // id da ficha expandida
  const [criando, setCriando] = useState(false);
  const [renomeando, setRenomeando] = useState(null);
  const [adicionandoEm, setAdicionandoEm] = useState(null);

  const carregar = useCallback(async () => {
    if (!supabaseConfigurado) {
      setCarregando(false);
      return;
    }
    try {
      setFichas(await listarFichas());
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
      const andamento = await sessaoEmAndamento();
      if (andamento) {
        if (!window.confirm(`Já existe um treino em andamento (${andamento.nome}). Ir para ele?`)) return;
        router.push("/academia/treino");
        return;
      }
      await iniciarSessaoDeFicha(ficha.id);
      router.push("/academia/treino");
    } catch (e) {
      toast("Erro: " + e.message, "erro");
    }
  }

  async function excluir(ficha) {
    if (!window.confirm(`Excluir a ficha "${ficha.nome}"?\n\nOs treinos que você já fez com ela continuam no histórico.`)) return;
    try {
      await deletarFicha(ficha.id);
      toast("✓ Ficha excluída");
      carregar();
    } catch (e) {
      toast("Erro: " + e.message, "erro");
    }
  }

  async function duplicar(ficha) {
    try {
      await duplicarFicha(ficha.id);
      toast("✓ Ficha duplicada");
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Fichas</h1>
        <button
          onClick={() => setCriando(true)}
          className="flex items-center gap-1 bg-marca text-white rounded-lg px-3 py-2 text-sm font-medium toque"
        >
          <Plus size={16} /> Nova ficha
        </button>
      </div>

      {carregando && <p className="text-neutral-400 text-sm">Carregando…</p>}

      {!carregando && fichas.length === 0 && (
        <div className="text-center py-10 border border-dashed border-neutral-300 rounded-xl">
          <p className="text-neutral-500 mb-1">Nenhuma ficha ainda.</p>
          <p className="text-sm text-neutral-400 mb-4">
            Uma ficha é um treino montado: Push A, Pull A, Pernas…
          </p>
          <button
            onClick={() => setCriando(true)}
            className="inline-flex items-center gap-1 bg-marca text-white rounded-lg px-4 py-2.5 font-medium toque"
          >
            <Plus size={16} /> Criar primeira ficha
          </button>
        </div>
      )}

      <div className="space-y-3">
        {fichas.map((f) => {
          const expandida = aberta === f.id;
          return (
            <section key={f.id} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <div className="flex items-center gap-2 p-3">
                <button
                  onClick={() => setAberta(expandida ? null : f.id)}
                  className="flex-1 min-w-0 text-left toque"
                >
                  <p className="font-semibold truncate">{f.nome}</p>
                  <p className="text-xs text-neutral-500 truncate">
                    {f.descricao ? `${f.descricao} · ` : ""}
                    {f.exercicios.length} exercício{f.exercicios.length === 1 ? "" : "s"}
                  </p>
                </button>

                <button
                  onClick={() => iniciar(f)}
                  className="flex items-center gap-1 bg-marca text-white rounded-lg px-3 py-2 text-sm font-semibold toque shrink-0"
                  disabled={f.exercicios.length === 0}
                >
                  <Play size={15} fill="currentColor" /> Treinar
                </button>

                <button
                  onClick={() => setAberta(expandida ? null : f.id)}
                  className="text-neutral-400 p-1 shrink-0"
                  aria-label={expandida ? "Fechar" : "Abrir"}
                >
                  {expandida ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>

              {expandida && (
                <div className="border-t border-neutral-100 p-3">
                  <div className="space-y-2">
                    {f.exercicios.map((fe, i) => (
                      <ExercicioDaFicha
                        key={fe.id}
                        fe={fe}
                        indice={i}
                        onMudou={carregar}
                        aoAvisar={toast}
                      />
                    ))}
                  </div>

                  {f.exercicios.length === 0 && (
                    <p className="text-sm text-neutral-400 text-center py-3">
                      Nenhum exercício nesta ficha.
                    </p>
                  )}

                  <button
                    onClick={() => setAdicionandoEm(f.id)}
                    className="w-full mt-2 flex items-center justify-center gap-2 border-2 border-dashed border-neutral-300 text-neutral-500 rounded-lg py-2.5 text-sm toque"
                  >
                    <Plus size={16} /> Adicionar exercício
                  </button>

                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-neutral-100">
                    <button
                      onClick={() => setRenomeando(f)}
                      className="flex items-center gap-1 text-xs text-neutral-500 toque"
                    >
                      <Pencil size={13} /> Renomear
                    </button>
                    <button
                      onClick={() => duplicar(f)}
                      className="flex items-center gap-1 text-xs text-neutral-500 toque"
                    >
                      <Copy size={13} /> Duplicar
                    </button>
                    <button
                      onClick={() => excluir(f)}
                      className="flex items-center gap-1 text-xs text-despesa toque ml-auto"
                    >
                      <Trash2 size={13} /> Excluir
                    </button>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {(criando || renomeando) && (
        <FormFicha
          ficha={renomeando}
          onFechar={() => {
            setCriando(false);
            setRenomeando(null);
          }}
          onSalvo={carregar}
          aoAvisar={toast}
        />
      )}

      {adicionandoEm && (
        <EscolherExercicio
          aoAvisar={toast}
          onFechar={() => setAdicionandoEm(null)}
          onEscolher={async (ex) => {
            try {
              await adicionarExercicioNaFicha(adicionandoEm, ex.id);
              setAdicionandoEm(null);
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

/* ---------------- EXERCÍCIO DENTRO DA FICHA ---------------- */
function ExercicioDaFicha({ fe, indice, onMudou, aoAvisar }) {
  const [aberto, setAberto] = useState(false);
  const [campos, setCampos] = useState({
    series_alvo: fe.series_alvo ?? 3,
    reps_min: fe.reps_min ?? 8,
    reps_max: fe.reps_max ?? 12,
    descanso_seg: fe.descanso_seg ?? 90,
    observacoes: fe.observacoes || "",
  });

  async function salvar() {
    try {
      await atualizarFichaExercicio(fe.id, {
        series_alvo: Number(campos.series_alvo) || 3,
        reps_min: Number(campos.reps_min) || null,
        reps_max: Number(campos.reps_max) || null,
        descanso_seg: Number(campos.descanso_seg) || 90,
        observacoes: campos.observacoes || null,
      });
      setAberto(false);
      onMudou?.();
    } catch (e) {
      aoAvisar?.("Erro: " + e.message, "erro");
    }
  }

  async function remover() {
    if (!window.confirm(`Tirar "${fe.exercicio?.nome}" desta ficha?`)) return;
    try {
      await removerExercicioDaFicha(fe.id);
      onMudou?.();
    } catch (e) {
      aoAvisar?.("Erro: " + e.message, "erro");
    }
  }

  const meta =
    fe.reps_min && fe.reps_max
      ? `${fe.series_alvo} × ${fe.reps_min}–${fe.reps_max}`
      : `${fe.series_alvo} séries`;

  return (
    <div className="border border-neutral-200 rounded-lg">
      <div className="flex items-center gap-2 px-2.5 py-2">
        <GripVertical size={15} className="text-neutral-300 shrink-0" />
        <span className="text-xs text-neutral-400 w-4 shrink-0">{indice + 1}</span>
        <button onClick={() => setAberto((v) => !v)} className="flex-1 min-w-0 text-left toque">
          <p className="font-medium text-sm truncate">{fe.exercicio?.nome}</p>
          <p className="text-xs text-neutral-400">
            {meta} · descanso {formatarDuracao(fe.descanso_seg || 90)}
          </p>
        </button>
        <button onClick={() => setAberto((v) => !v)} className="text-neutral-400 p-1 shrink-0">
          {aberto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {aberto && (
        <div className="px-2.5 pb-2.5 pt-1 border-t border-neutral-100">
          <div className="grid grid-cols-3 gap-2">
            <Campo rotulo="Séries">
              <input
                type="number"
                inputMode="numeric"
                value={campos.series_alvo}
                onChange={(e) => setCampos((c) => ({ ...c, series_alvo: e.target.value }))}
                className="w-full border border-neutral-300 rounded-lg px-2 py-2 text-center tabular-nums"
              />
            </Campo>
            <Campo rotulo="Reps mín">
              <input
                type="number"
                inputMode="numeric"
                value={campos.reps_min}
                onChange={(e) => setCampos((c) => ({ ...c, reps_min: e.target.value }))}
                className="w-full border border-neutral-300 rounded-lg px-2 py-2 text-center tabular-nums"
              />
            </Campo>
            <Campo rotulo="Reps máx">
              <input
                type="number"
                inputMode="numeric"
                value={campos.reps_max}
                onChange={(e) => setCampos((c) => ({ ...c, reps_max: e.target.value }))}
                className="w-full border border-neutral-300 rounded-lg px-2 py-2 text-center tabular-nums"
              />
            </Campo>
          </div>

          <Campo rotulo="Descanso (segundos)">
            <input
              type="number"
              inputMode="numeric"
              step="15"
              value={campos.descanso_seg}
              onChange={(e) => setCampos((c) => ({ ...c, descanso_seg: e.target.value }))}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 tabular-nums"
            />
          </Campo>

          <Campo rotulo="Observações">
            <input
              value={campos.observacoes}
              onChange={(e) => setCampos((c) => ({ ...c, observacoes: e.target.value }))}
              placeholder="Ex: banco no nível 3"
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm"
            />
          </Campo>

          <div className="flex gap-2 mt-2">
            <button onClick={remover} className="flex items-center gap-1 text-xs text-despesa toque px-2 py-1.5">
              <Trash2 size={13} /> Tirar
            </button>
            <button
              onClick={salvar}
              className="ml-auto bg-marca text-white rounded-lg px-4 py-1.5 text-sm font-medium toque"
            >
              Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Campo({ rotulo, children }) {
  return (
    <label className="block mt-2">
      <span className="block text-[10px] uppercase tracking-wide text-neutral-400 mb-1">{rotulo}</span>
      {children}
    </label>
  );
}

/* ---------------- CRIAR / RENOMEAR FICHA ---------------- */
function FormFicha({ ficha, onFechar, onSalvo, aoAvisar }) {
  const editando = Boolean(ficha);
  const [nome, setNome] = useState(ficha?.nome || "");
  const [descricao, setDescricao] = useState(ficha?.descricao || "");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!nome.trim()) {
      aoAvisar?.("Dê um nome à ficha.", "erro");
      return;
    }
    setSalvando(true);
    try {
      if (editando) await atualizarFicha(ficha.id, { nome: nome.trim(), descricao: descricao.trim() || null });
      else await criarFicha({ nome: nome.trim(), descricao: descricao.trim() || null });
      aoAvisar?.(editando ? "✓ Ficha atualizada" : "✓ Ficha criada");
      onSalvo?.();
      onFechar();
    } catch (e) {
      aoAvisar?.("Erro: " + e.message, "erro");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      titulo={editando ? "Renomear ficha" : "Nova ficha"}
      onFechar={onFechar}
      rodape={
        <div className="flex justify-end gap-2">
          <button onClick={onFechar} className="px-4 py-2 rounded-lg border border-neutral-300 toque">
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="px-4 py-2 rounded-lg bg-marca text-white toque disabled:opacity-40"
          >
            Salvar
          </button>
        </div>
      }
    >
      <label className="block mb-3">
        <span className="block text-xs font-medium text-neutral-500 mb-1">Nome</span>
        <input
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: Push A"
          className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 toque"
        />
      </label>
      <label className="block">
        <span className="block text-xs font-medium text-neutral-500 mb-1">Descrição (opcional)</span>
        <input
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex: Peito e Tríceps"
          className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 toque"
        />
      </label>
    </Modal>
  );
}
