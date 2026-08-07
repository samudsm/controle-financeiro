"use client";
import { useCallback, useEffect, useState } from "react";
import { SlidersHorizontal, X, Pencil, Trash2 } from "lucide-react";
import SwipeCard from "../../../components/SwipeCard";
import EditarTransacaoModal from "../../../components/EditarTransacaoModal";
import { useCatalogo } from "../../../hooks/useCatalogo";
import { useToast } from "../../../components/Toast";
import { supabaseConfigurado } from "../../../lib/supabase";
import { listarTransacoes, deletarTransacao } from "../../../lib/db";
import { formatBRL, formatData } from "../../../lib/format";
import { hojeISO, deslocarMes, primeiroDiaDoMes, mesAtual } from "../../../lib/dates";
import { TIPOS } from "../../../lib/categorias";

const FILTRO_VAZIO = {
  categoria: "",
  subcategoria: "",
  tipo: "",
  status: "",
  tag: "",
  de: "",
  ate: "",
  busca: "",
  apenasFixas: false,
};

export default function Historico() {
  const toast = useToast();
  const catalogo = useCatalogo();
  const [filtros, setFiltros] = useState(FILTRO_VAZIO);
  const [aplicados, setAplicados] = useState(FILTRO_VAZIO);
  const [abertoFiltros, setAbertoFiltros] = useState(false);
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState(null);

  const carregar = useCallback(async () => {
    if (!supabaseConfigurado) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    try {
      setLista(await listarTransacoes(aplicados));
    } catch (e) {
      toast("Erro: " + e.message, "erro");
    } finally {
      setCarregando(false);
    }
  }, [aplicados, toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const set = (campo, valor) => setFiltros((f) => ({ ...f, [campo]: valor }));

  function aplicar() {
    setAplicados(filtros);
    setAbertoFiltros(false);
  }
  function limpar() {
    setFiltros(FILTRO_VAZIO);
    setAplicados(FILTRO_VAZIO);
  }

  function preset(qual) {
    if (qual === "este") set2({ de: primeiroDiaDoMes(mesAtual()), ate: hojeISO() });
    if (qual === "passado") {
      const m = deslocarMes(mesAtual(), -1);
      set2({ de: primeiroDiaDoMes(m), ate: primeiroDiaDoMes(mesAtual()) });
    }
    if (qual === "30d") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      set2({ de: d.toISOString().slice(0, 10), ate: hojeISO() });
    }
  }
  function set2(campos) {
    setFiltros((f) => ({ ...f, ...campos }));
  }

  async function apagar(t) {
    const msg =
      `Apagar "${t.descricao}" — ${formatBRL(Math.abs(t.valor))}?` +
      "\n\nIsso não pode ser desfeito.";
    if (!window.confirm(msg)) return;
    try {
      await deletarTransacao(t.id);
      toast("✓ Apagada");
      carregar();
    } catch (e) {
      toast("Erro: " + e.message, "erro");
    }
  }

  if (!supabaseConfigurado) {
    return (
      <div className="mt-10 bg-yellow-50 border border-yellow-300 rounded-xl p-4 text-yellow-800">
        Configure o Supabase (.env.local) para ver o histórico.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold">Histórico</h1>
        <button
          onClick={() => setAbertoFiltros((a) => !a)}
          className="flex items-center gap-1 text-marca text-sm toque"
        >
          <SlidersHorizontal size={18} /> Filtros
        </button>
      </div>

      {/* Barra de busca sempre visível */}
      <input
        className="w-full border border-neutral-300 rounded-lg px-3 py-2 toque mb-3"
        placeholder="Buscar descrição…"
        value={filtros.busca}
        onChange={(e) => {
          set("busca", e.target.value);
        }}
        onKeyDown={(e) => e.key === "Enter" && aplicar()}
      />

      {/* Filtros (accordion) */}
      {abertoFiltros && (
        <div className="bg-white border border-neutral-200 rounded-xl p-3 mb-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Categoria">
              <select
                className="w-full border border-neutral-300 rounded-lg px-2 py-2 bg-white"
                value={filtros.categoria}
                onChange={(e) => set2({ categoria: e.target.value, subcategoria: "" })}
              >
                <option value="">Todas</option>
                {catalogo.categorias.map((c) => (
                  <option key={c.nome} value={c.nome}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Tipo">
              <select
                className="w-full border border-neutral-300 rounded-lg px-2 py-2 bg-white"
                value={filtros.tipo}
                onChange={(e) => set("tipo", e.target.value)}
              >
                <option value="">Todos</option>
                {TIPOS.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.rotulo}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Subcategoria">
              <select
                className="w-full border border-neutral-300 rounded-lg px-2 py-2 bg-white disabled:bg-neutral-100 disabled:text-neutral-400"
                value={filtros.subcategoria}
                disabled={!filtros.categoria}
                onChange={(e) => set("subcategoria", e.target.value)}
              >
                <option value="">{filtros.categoria ? "Todas" : "Escolha a categoria"}</option>
                {catalogo.opcoesSubcategorias(filtros.categoria).map((s) => (
                  <option key={s.valor} value={s.valor}>
                    {s.rotulo}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Tag">
              <select
                className="w-full border border-neutral-300 rounded-lg px-2 py-2 bg-white"
                value={filtros.tag}
                onChange={(e) => set("tag", e.target.value)}
              >
                <option value="">Todas</option>
                {catalogo.tags.map((t) => (
                  <option key={t.id} value={t.nome}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="De">
              <input
                type="date"
                className="w-full border border-neutral-300 rounded-lg px-2 py-2"
                value={filtros.de}
                onChange={(e) => set("de", e.target.value)}
              />
            </Campo>
            <Campo rotulo="Até">
              <input
                type="date"
                className="w-full border border-neutral-300 rounded-lg px-2 py-2"
                value={filtros.ate}
                onChange={(e) => set("ate", e.target.value)}
              />
            </Campo>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <Preset onClick={() => preset("este")}>Este mês</Preset>
            <Preset onClick={() => preset("passado")}>Mês passado</Preset>
            <Preset onClick={() => preset("30d")}>Últimos 30 dias</Preset>
          </div>

          <div className="flex items-center justify-between">
            <Campo rotulo="Status">
              <select
                className="border border-neutral-300 rounded-lg px-2 py-2 bg-white"
                value={filtros.status}
                onChange={(e) => set("status", e.target.value)}
              >
                <option value="">Todos</option>
                <option value="pago">Pago</option>
                <option value="pendente">Pendente</option>
              </select>
            </Campo>
            <label className="flex items-center gap-2 text-sm mt-5">
              <input
                type="checkbox"
                checked={filtros.apenasFixas}
                onChange={(e) => set("apenasFixas", e.target.checked)}
              />
              Apenas fixas
            </label>
          </div>

          <div className="flex gap-2">
            <button
              onClick={limpar}
              className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 toque flex items-center justify-center gap-1"
            >
              <X size={16} /> Limpar
            </button>
            <button onClick={aplicar} className="flex-1 px-3 py-2 rounded-lg bg-marca text-white toque">
              Filtrar
            </button>
          </div>
        </div>
      )}

      <p className="text-sm text-neutral-500 mb-2">
        {carregando ? "Carregando…" : `${lista.length} resultado(s)`}
      </p>

      <div className="space-y-2">
        {lista.map((t) => (
          <SwipeCard key={t.id} onEditar={() => setEditando(t)} onApagar={() => apagar(t)}>
            <div className="p-3 border border-neutral-200 rounded-xl">
              <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {t.descricao}
                  {t.parcela_numero && (
                    <span className="text-neutral-400 text-sm">
                      {" "}({t.parcela_numero}/{t.parcela_total})
                    </span>
                  )}
                </p>
                <p className="text-xs text-neutral-500 truncate">
                  {formatData(t.data)} · {t.categoria}
                  {t.subcategoria && ` › ${t.subcategoria}`}
                  {t.estabelecimento && ` · ${t.estabelecimento}`}
                  {t.forma_pagamento && ` · ${t.forma_pagamento}`}
                  {t.status === "pendente" && " · ⏳ pendente"}
                </p>
                {t.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {t.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] bg-marca/10 text-marca px-1.5 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
                <span
                  className={`font-semibold shrink-0 ${
                    t.tipo === "despesa" ? "text-despesa" : "text-receita"
                  }`}
                >
                  {t.tipo === "despesa" ? "-" : "+"}
                  {formatBRL(Math.abs(t.valor))}
                </span>
              </div>

              {/* Botões visíveis. O arrastar-para-a-esquerda continua funcionando
                  como atalho, mas ninguém precisa descobrir o gesto.
                  stopPropagation evita que o toque no botão inicie o arrasto. */}
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => setEditando(t)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-xs border border-neutral-300 text-neutral-600 rounded-lg px-3 py-1.5 toque"
                >
                  <Pencil size={14} /> Editar
                </button>
                <button
                  onClick={() => apagar(t)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-xs border border-neutral-300 text-despesa rounded-lg px-3 py-1.5 toque"
                >
                  <Trash2 size={14} /> Excluir
                </button>
              </div>
            </div>
          </SwipeCard>
        ))}
      </div>

      {!carregando && lista.length === 0 && (
        <p className="text-center text-neutral-400 text-sm mt-6">Nada encontrado.</p>
      )}

      {editando && (
        <EditarTransacaoModal
          transacao={editando}
          catalogo={catalogo}
          onFechar={() => setEditando(null)}
          onSalvo={carregar}
        />
      )}
    </div>
  );
}

function Campo({ rotulo, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-neutral-500 mb-1">{rotulo}</span>
      {children}
    </label>
  );
}
function Preset({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 toque"
    >
      {children}
    </button>
  );
}
