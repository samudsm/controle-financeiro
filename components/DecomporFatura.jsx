"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Modal from "./Modal";
import CamposTransacao from "./CamposTransacao";
import { formatBRL } from "../lib/format";
import { useToast } from "./Toast";
import { criarTransacoes, definirTagsDaTransacao } from "../lib/db";

// Um item novo já nasce com a data e a descrição da fatura — dá pra editar,
// mas quem quiser manter o original não precisa digitar nada.
// A data é editável por item porque a fatura costuma juntar compras de
// dias diferentes, muitas vezes do mês anterior.
function itemVazio(descricaoFatura, dataFatura) {
  return {
    data: dataFatura || "",
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
  const [itens, setItens] = useState([
    itemVazio(fatura.descricao, fatura.data),
    itemVazio(fatura.descricao, fatura.data),
  ]);
  const [salvando, setSalvando] = useState(false);

  // O tipo de cada item decide o sinal dentro da fatura:
  // despesa soma; receita e estorno são créditos e ABATEM o valor da fatura
  // (uma devolução ou cashback reduz o que você tem a pagar).
  // Transferência não entra na conta.
  const valorDe = (i) => Number(i.valor) || 0;
  const somaDespesas = itens.filter((i) => i.tipo === "despesa").reduce((s, i) => s + valorDe(i), 0);
  const somaCreditos = itens
    .filter((i) => i.tipo === "receita" || i.tipo === "estorno")
    .reduce((s, i) => s + valorDe(i), 0);

  const somaDistribuida = somaDespesas - somaCreditos;
  const bate = Math.abs(somaDistribuida - total) < 0.005;
  const falta = total - somaDistribuida;
  const temCredito = somaCreditos > 0;

  function set(idx, campo, valor) {
    setItens((arr) => arr.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)));
  }
  function adicionar() {
    // O item novo herda a data do último preenchido: compras da mesma
    // fatura tendem a ser de dias próximos.
    const ultima = itens[itens.length - 1]?.data || fatura.data;
    setItens((arr) => [...arr, itemVazio(fatura.descricao, ultima)]);
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
          data: i.data || fatura.data,
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
            <div>
              Distribuído:{" "}
              <strong className={bate ? "text-receita" : "text-yellow-600"}>
                {formatBRL(somaDistribuida)}
              </strong>{" "}
              / {formatBRL(total)} {bate ? "✅" : "⚠️"}
            </div>
            {/* Mostra a conta quando há crédito, senão o número parece errado */}
            {temCredito && (
              <div className="text-xs text-neutral-500 mt-0.5">
                {formatBRL(somaDespesas)} em gastos − {formatBRL(somaCreditos)} em créditos
              </div>
            )}
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

      <div className="mb-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs px-3 py-2 space-y-1.5">
        <p>
          <strong>Compra de outro mês?</strong> Mude a data do item. O lançamento passa a
          contar no painel daquele mês — nos totais, no gráfico e nas análises.
        </p>
        <p>
          <strong>Veio um crédito na fatura?</strong> Marque o tipo como{" "}
          <strong>Estorno</strong> e ele abate do total, em vez de somar. Use Estorno para
          devolução, cashback ou desconto de uma compra; Receita só para dinheiro que
          entrou de fora.
        </p>
      </div>

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

            {/* Data por item: a fatura junta compras de dias diferentes,
                muitas vezes do mês anterior. */}
            <label className="block mb-3">
              <span className="block text-xs font-medium text-neutral-500 mb-1">Data</span>
              <input
                type="date"
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 toque"
                value={(it.data || "").slice(0, 10)}
                onChange={(e) => set(idx, "data", e.target.value)}
              />
            </label>

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
