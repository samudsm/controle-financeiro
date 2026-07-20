"use client";
import { useEffect } from "react";
import Combobox from "./Combobox";
import { TIPOS } from "../lib/categorias";

// Campos de uma transação. Controlado: recebe `t` e `set(campo, valor)`.
// `catalogo` vem do hook useCatalogo (compartilhado pelo pai).
export default function CamposTransacao({ t, set, catalogo, autoSugerir = true }) {
  const {
    opcoesCategorias,
    sugerirCategoria,
    carregarSubs,
    opcoesSubcategorias,
    criarCategoria,
    criarSubcategoria,
  } = catalogo;

  // Sugere categoria automaticamente a partir da descrição (só se ainda vazia).
  useEffect(() => {
    if (autoSugerir && t.descricao && !t.categoria) {
      const sug = sugerirCategoria(t.descricao);
      if (sug) set("categoria", sug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.descricao]);

  // Ao mudar categoria, carrega subcategorias dela.
  useEffect(() => {
    if (t.categoria) carregarSubs(t.categoria);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.categoria]);

  return (
    <div className="space-y-3">
      <Campo rotulo="Descrição">
        <input
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 toque"
          value={t.descricao || ""}
          onChange={(e) => set("descricao", e.target.value)}
          placeholder="Ex: ARENA GRESS LTDA"
        />
      </Campo>

      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Categoria">
          <Combobox
            valor={t.categoria}
            onChange={(v) => set("categoria", v)}
            opcoes={opcoesCategorias()}
            placeholder="Categoria"
            rotuloNovo="Nova categoria"
            onCriarNovo={(nome) => criarCategoria(nome)}
          />
        </Campo>
        <Campo rotulo="Subcategoria">
          <Combobox
            valor={t.subcategoria}
            onChange={(v) => set("subcategoria", v)}
            opcoes={opcoesSubcategorias(t.categoria)}
            placeholder="Subcategoria"
            rotuloNovo="Nova subcategoria"
            onCriarNovo={(nome) => criarSubcategoria(t.categoria, nome)}
          />
        </Campo>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Tipo">
          <select
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 toque bg-white"
            value={t.tipo || "saida"}
            onChange={(e) => set("tipo", e.target.value)}
          >
            {TIPOS.map((tp) => (
              <option key={tp.valor} value={tp.valor}>
                {tp.rotulo}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Valor (R$)">
          <input
            type="number"
            step="0.01"
            min="0"
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 toque"
            value={t.valor ?? ""}
            onChange={(e) => set("valor", e.target.value)}
            placeholder="0,00"
          />
        </Campo>
      </div>

      <Campo rotulo="Notas (opcional)">
        <input
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 toque"
          value={t.notas || ""}
          onChange={(e) => set("notas", e.target.value)}
          placeholder="Observações"
        />
      </Campo>

      <div className="flex items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={t.status === "pendente"}
            onChange={(e) => set("status", e.target.checked ? "pendente" : "pago")}
          />
          Pendente
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!t.is_fixa}
            onChange={(e) => set("is_fixa", e.target.checked)}
          />
          Gasto fixo
        </label>
      </div>
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
