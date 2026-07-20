"use client";
import { useState } from "react";
import Modal from "./Modal";
import CamposTransacao from "./CamposTransacao";
import { useToast } from "./Toast";
import { atualizarTransacao, deletarTransacao } from "../lib/db";

export default function EditarTransacaoModal({ transacao, catalogo, onFechar, onSalvo }) {
  const toast = useToast();
  const [t, setT] = useState({ ...transacao });
  const [salvando, setSalvando] = useState(false);

  const ehParcela = t.parcela_numero && t.parcela_total;
  const set = (campo, valor) => setT((prev) => ({ ...prev, [campo]: valor }));

  async function salvar() {
    setSalvando(true);
    try {
      await atualizarTransacao(t.id, {
        data: t.data,
        descricao: t.descricao,
        categoria: t.categoria,
        subcategoria: t.subcategoria || null,
        tipo: t.tipo,
        valor: Number(t.valor) || 0,
        notas: t.notas || null,
        status: t.status || "pago",
        is_fixa: !!t.is_fixa,
      });
      toast("✓ Transação atualizada");
      onSalvo?.();
      onFechar();
    } catch (e) {
      toast("Erro: " + e.message, "erro");
    } finally {
      setSalvando(false);
    }
  }

  async function apagar() {
    const msg = ehParcela
      ? "Apagar esta parcela? As outras parcelas continuam existindo."
      : "Apagar esta transação?";
    if (!window.confirm(msg)) return;
    try {
      await deletarTransacao(t.id);
      toast("✓ Transação apagada");
      onSalvo?.();
      onFechar();
    } catch (e) {
      toast("Erro: " + e.message, "erro");
    }
  }

  return (
    <Modal
      titulo="Editar transação"
      onFechar={onFechar}
      rodape={
        <div className="flex items-center justify-between">
          <button onClick={apagar} className="text-despesa text-sm toque px-2">
            Apagar
          </button>
          <div className="flex gap-2">
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
        </div>
      }
    >
      {ehParcela && (
        <div className="mb-3 rounded-lg bg-yellow-50 border border-yellow-300 text-yellow-800 text-sm px-3 py-2">
          ⚠️ Isto é uma parcela ({t.parcela_numero}/{t.parcela_total}). Editar pode afetar a sequência.
        </div>
      )}

      <label className="block mb-3">
        <span className="block text-xs font-medium text-neutral-500 mb-1">Data</span>
        <input
          type="date"
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 toque"
          value={(t.data || "").slice(0, 10)}
          onChange={(e) => set("data", e.target.value)}
        />
      </label>

      <CamposTransacao t={t} set={set} catalogo={catalogo} autoSugerir={false} />
    </Modal>
  );
}
