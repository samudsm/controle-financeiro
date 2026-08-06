"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Modal from "./Modal";
import CamposTransacao from "./CamposTransacao";
import { formatBRL } from "../lib/format";
import { useToast } from "./Toast";
import { criarTransacoes, definirTagsDaTransacao } from "../lib/db";

// Um item novo já nasce com a descrição da fatura — dá pra editar,
// mas quem quiser manter o nome original não precisa digitar nada.
function itemVazio(descricaoFatura) {
  return {
    descricao: descricaoFatura || "",
    categoria: "",
    subcategoria: "",
    tipo: "despesa",
    valor: "",
    estabelecimento: "",
    forma_pagamento: "Crédito à vista",
    tags: [],
    notas: "",
    status: "pago",
    is_fixa: false,
  };
}

// Decompõe uma fatura (valor total) em vários itens = várias transações.
export default function DecomporFatura({ fatura, catalogo, onFechar, onSalvo }) {
  const toast = useToast();
  const total = Math.abs(Number(fatura.valor) || 0);
  const [itens, setItens] = useState([itemVazio(fatura.descricao), itemVazio(fatura.descricao)]);
  const [salvando, setSalvando] = useState(false);

  const somaDistribuida = itens.reduce((s, i) => s + (Number(i.valor) || 0), 0);
  const bate = Math.abs(somaDistribuida - total) < 0.005;
  const falta = total - somaDistribuida;

  function set(idx, campo, valor) {
    setItens((arr) => arr.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)));
  }
  function adicionar() {
    setItens((arr) => [...arr, itemVazio(fatura.descricao)]);
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
    const invalida = itens.find(
      (i) => i.subcategoria && !catalogo.subcategoriaValida(i.categoria, i.subcategoria)
    );
    if (invalida) {
      toast(`"${invalida.subcategoria}" não pertence a ${invalida.categoria}.`, "erro");
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
          tipo: i.tipo || "despesa",
          valor: Number(i.valor) || 0,
          estabelecimento: i.estabelecimento || null,
          forma_pagamento: i.forma_pagamento || null,
          notas: i.notas || `Da fatura: ${fatura.descricao}`,
          status: i.status || "pago",
          is_fixa: !!i.is_fixa,
        };
      });

      const criadas = await criarTransacoes(lista);
      for (let i = 0; i < criadas.length; i++) {
        const tags = itens[i]?.tags || [];
        if (tags.length) await definirTagsDaTransacao(criadas[i].id, tags);
      }

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
            {salvando ? "Salvando…" : "Salvar Tudo"}
          </button>
        </div>
      }
    >
      <p className="text-sm text-neutral-500 mb-3">
        Total original: <strong>{formatBRL(total)}</strong>. Cada item vira um lançamento
        separado, com todos os campos normais.
      </p>

      {!bate && (
        <div className="mb-3 rounded-lg bg-yellow-50 border border-yellow-300 text-yellow-800 text-sm px-3 py-2">
          {falta > 0
            ? `Faltam ${formatBRL(falta)} para fechar o total da fatura.`
            : `Passou ${formatBRL(Math.abs(falta))} do total da fatura.`}
        </div>
      )}

      <div className="space-y-4">
        {itens.map((it, idx) => (
          <div key={idx} className="rounded-xl border border-neutral-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-500">ITEM {idx + 1}</span>
              {itens.length > 1 && (
                <button
                  onClick={() => remover(idx)}
                  className="text-despesa p-1"
                  aria-label={`Remover item ${idx + 1}`}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {/* Mesmos campos de qualquer outro lançamento */}
            <CamposTransacao
              t={it}
              set={(campo, valor) => set(idx, campo, valor)}
              catalogo={catalogo}
              autoSugerir={false}
            />
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
