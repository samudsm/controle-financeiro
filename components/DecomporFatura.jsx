"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Modal from "./Modal";
import Combobox from "./Combobox";
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
    setSalvando(true);
    try {
      const lista = itens.map((i) => ({
        data: fatura.data,
        descricao: i.descricao || "(item da fatura)",
        categoria: i.categoria || "Outros",
        subcategoria: i.subcategoria || null,
        tipo: "saida",
        valor: Number(i.valor) || 0,
        notas: `Da fatura: ${fatura.descricao}`,
        status: "pago",
      }));
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
              <Combobox
                valor={it.categoria}
                onChange={(v) => set(idx, "categoria", v)}
                opcoes={catalogo.opcoesCategorias()}
                placeholder="Categoria"
                rotuloNovo="Nova categoria"
                onCriarNovo={(nome) => catalogo.criarCategoria(nome)}
              />
              <input
                type="number"
                step="0.01"
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 toque"
                placeholder="Valor R$"
                value={it.valor}
                onChange={(e) => set(idx, "valor", e.target.value)}
              />
            </div>
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
