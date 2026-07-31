"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Modal from "./Modal";
import { formatBRL } from "../lib/format";
import { useToast } from "./Toast";
import { criarTransacoes } from "../lib/db";

// Decompõe uma fatura (valor total) em vários itens = várias transações.
export default function DecomporFatura({ fatura, catalogo, onFechar, onSalvo }) {
  const toast = useToast();
  const total = Math.abs(Number(fatura.valor) || 0);
  const [itens, setItens] = useState([
    { descricao: "", categoria: "", subcategoria: "", valor: "" },
    { descricao: "", categoria: "", subcategoria: "", valor: "" },
  ]);
  const [salvando, setSalvando] = useState(false);

  const somaDistribuida = itens.reduce((s, i) => s + (Number(i.valor) || 0), 0);
  const bate = Math.abs(somaDistribuida - total) < 0.005;

  function set(idx, campo, valor) {
    setItens((arr) => arr.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)));
  }
  function adicionar() {
    setItens((arr) => [...arr, { descricao: "", categoria: "", subcategoria: "", valor: "" }]);
  }
  function remover(idx) {
    setItens((arr) => arr.filter((_, i) => i !== idx));
  }

  async function salvar() {
    if (!bate) return;
    const semCategoria = itens.filter((i) => !i.categoria).length;
    if (semCategoria > 0) {
      toast(`${semCategoria} item(ns) sem categoria. Escolha uma para cada.`, "erro");
      return;
    }
    setSalvando(true);
    try {
      const lista = itens.map((i) => {
        const { categoria_id, subcategoria_id } = catalogo.idsDe(i.categoria, i.subcategoria);
        return {
          data: fatura.data,
          descricao: i.descricao || "(item da fatura)",
          categoria: i.categoria,
          subcategoria: i.subcategoria || null,
          categoria_id,
          subcategoria_id,
          tipo: "despesa",
          valor: Number(i.valor) || 0,
          forma_pagamento: "Crédito à vista",
          notas: `Da fatura: ${fatura.descricao}`,
          status: "pago",
        };
      });
      await criarTransacoes(lista);
      toast(`✓ Fatura decomposta: ${lista.length} itens criados`);
      onSalvo?.();
      onFechar();
    } catch (e) {
      toast("Erro ao salvar: " + e.message, "erro");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      titulo="Decompor fatura"
      onFechar={onFechar}
      rodape={
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm">
            Distribuído:{" "}
            <strong className={bate ? "text-receita" : "text-yellow-600"}>
              {formatBRL(somaDistribuida)}
            </strong>{" "}
            / {formatBRL(total)} {bate ? "✅" : "⚠️"}
          </div>
          <button
            disabled={!bate || salvando}
            onClick={salvar}
            className="bg-marca text-white px-4 py-2 rounded-lg toque disabled:opacity-40"
          >
            Salvar Tudo
          </button>
        </div>
      }
    >
      <p className="text-sm text-neutral-500 mb-3">
        Total original: <strong>{formatBRL(total)}</strong>. Cada item vira uma transação separada.
      </p>
      {!bate && (
        <div className="mb-3 rounded-lg bg-yellow-50 border border-yellow-300 text-yellow-800 text-sm px-3 py-2">
          A soma dos itens precisa ser igual ao total da fatura.
        </div>
      )}

      <div className="space-y-4">
        {itens.map((it, idx) => (
          <div key={idx} className="rounded-xl border border-neutral-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-500">ITEM {idx + 1}</span>
              {itens.length > 1 && (
                <button onClick={() => remover(idx)} className="text-despesa p-1">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            <input
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 toque mb-2"
              placeholder="Descrição"
              value={it.descricao}
              onChange={(e) => set(idx, "descricao", e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2 mb-2">
              <select
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 toque bg-white"
                value={it.categoria}
                onChange={(e) => {
                  // Trocar categoria zera a subcategoria (ela pertence a uma categoria só).
                  set(idx, "categoria", e.target.value);
                  set(idx, "subcategoria", "");
                }}
              >
                <option value="">Categoria…</option>
                {catalogo.opcoesCategorias().map((c) => (
                  <option key={c.valor} value={c.valor}>
                    {c.rotulo}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 toque"
                placeholder="Valor R$"
                value={it.valor}
                onChange={(e) => set(idx, "valor", e.target.value)}
              />
            </div>
            <select
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 toque bg-white disabled:bg-neutral-100 disabled:text-neutral-400"
              value={it.subcategoria}
              disabled={!it.categoria}
              onChange={(e) => set(idx, "subcategoria", e.target.value)}
            >
              <option value="">
                {it.categoria ? "Subcategoria (opcional)…" : "Escolha a categoria antes"}
              </option>
              {catalogo.opcoesSubcategorias(it.categoria).map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.rotulo}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <button
        onClick={adicionar}
        className="mt-3 flex items-center gap-2 text-marca text-sm font-medium toque"
      >
        <Plus size={18} /> Adicionar outro item
      </button>
    </Modal>
  );
}
