"use client";
import { useState } from "react";
import Modal from "./Modal";
import { useToast } from "./Toast";
import { atualizarGastoFixo } from "../lib/db";
import { formatBRL } from "../lib/format";
import { primeiroDiaDoMes, mesAtual, rotuloMes, deslocarMes } from "../lib/dates";

// Edita um gasto fixo com opções de abrangência.
export default function EditarGastoFixoModal({ transacao, onFechar, onSalvo }) {
  const toast = useToast();
  const [novoValor, setNovoValor] = useState(Math.abs(Number(transacao.valor) || 0));
  const [modo, setModo] = useState("todos"); // 'apenas' | 'apartir' | 'todos'
  const [mesRef, setMesRef] = useState((transacao.data || "").slice(0, 7) || mesAtual());
  const [salvando, setSalvando] = useState(false);

  // Meses para o seletor "a partir de".
  const opcoesMes = [];
  let m = mesAtual();
  for (let i = 0; i < 18; i++) {
    opcoesMes.push(m);
    m = deslocarMes(m, 1);
  }

  async function salvar() {
    setSalvando(true);
    try {
      await atualizarGastoFixo({
        descricao: transacao.descricao,
        novoValor: Number(novoValor) || 0,
        modo,
        aPartirDe: primeiroDiaDoMes(mesRef),
        idAtual: transacao.id,
      });
      toast("✓ Gasto fixo atualizado");
      onSalvo?.();
      onFechar();
    } catch (e) {
      toast("Erro: " + e.message, "erro");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      titulo="Editar gasto fixo"
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
      <p className="mb-1 text-sm text-neutral-500">Nome</p>
      <p className="font-semibold mb-3">{transacao.descricao}</p>

      <p className="text-sm text-neutral-500">
        Valor atual: {formatBRL(Math.abs(Number(transacao.valor) || 0))}
      </p>

      <label className="block mt-3 mb-4">
        <span className="block text-xs font-medium text-neutral-500 mb-1">Novo valor (R$)</span>
        <input
          type="number"
          step="0.01"
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 toque"
          value={novoValor}
          onChange={(e) => setNovoValor(e.target.value)}
        />
      </label>

      <div className="space-y-2 text-sm">
        <Opcao valor="todos" modo={modo} setModo={setModo}>
          Todos os meses futuros (recomendado)
        </Opcao>
        <Opcao valor="apartir" modo={modo} setModo={setModo}>
          Este e próximos meses
        </Opcao>
        <Opcao valor="apenas" modo={modo} setModo={setModo}>
          Apenas este mês
        </Opcao>
      </div>

      {modo === "apartir" && (
        <label className="block mt-3">
          <span className="block text-xs font-medium text-neutral-500 mb-1">A partir de</span>
          <select
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 toque bg-superficie"
            value={mesRef}
            onChange={(e) => setMesRef(e.target.value)}
          >
            {opcoesMes.map((mm) => (
              <option key={mm} value={mm}>
                {rotuloMes(mm)}
              </option>
            ))}
          </select>
        </label>
      )}
    </Modal>
  );
}

function Opcao({ valor, modo, setModo, children }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="radio" checked={modo === valor} onChange={() => setModo(valor)} />
      {children}
    </label>
  );
}
