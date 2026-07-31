"use client";
import { useEffect } from "react";
import Combobox from "./Combobox";
import SeletorTags from "./SeletorTags";
import { TIPOS, FORMAS_PAGAMENTO } from "../lib/categorias";

// Campos de um lançamento. Controlado: recebe `t` e `set(campo, valor)`.
// `catalogo` vem do hook useCatalogo (compartilhado pelo pai).
export default function CamposTransacao({ t, set, catalogo, autoSugerir = true }) {
  const {
    opcoesCategorias,
    opcoesSubcategorias,
    subcategoriaValida,
    opcoesEstabelecimentos,
    criarEstabelecimento,
    opcoesTags,
    criarTag,
    sugerirCategoria,
    sugerirSubcategoria,
  } = catalogo;

  // Sugere categoria a partir da descrição (só se ainda estiver vazia).
  useEffect(() => {
    if (autoSugerir && t.descricao && !t.categoria) {
      const sug = sugerirCategoria(t.descricao);
      if (sug) set("categoria", sug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.descricao]);

  // Sugere subcategoria dentro da categoria escolhida.
  useEffect(() => {
    if (autoSugerir && t.categoria && t.descricao && !t.subcategoria) {
      const sug = sugerirSubcategoria(t.descricao, t.categoria);
      if (sug) set("subcategoria", sug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.categoria]);

  const subs = opcoesSubcategorias(t.categoria);
  const subInvalida = t.categoria && t.subcategoria && !subcategoriaValida(t.categoria, t.subcategoria);

  // Trocar de categoria zera a subcategoria: ela pertence a UMA categoria só.
  function trocarCategoria(nova) {
    set("categoria", nova);
    set("subcategoria", "");
  }

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
          <select
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 toque bg-white"
            value={t.categoria || ""}
            onChange={(e) => trocarCategoria(e.target.value)}
          >
            <option value="">Escolha…</option>
            {opcoesCategorias().map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.rotulo}
              </option>
            ))}
          </select>
        </Campo>

        <Campo rotulo="Subcategoria">
          <select
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 toque bg-white disabled:bg-neutral-100 disabled:text-neutral-400"
            value={t.subcategoria || ""}
            disabled={!t.categoria}
            onChange={(e) => set("subcategoria", e.target.value)}
          >
            <option value="">{t.categoria ? "Escolha…" : "Escolha a categoria antes"}</option>
            {subs.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.rotulo}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      {subInvalida && (
        <p className="text-xs text-despesa -mt-1">
          "{t.subcategoria}" não pertence a {t.categoria}. Escolha uma da lista.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Tipo">
          <select
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 toque bg-white"
            value={t.tipo || "despesa"}
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

      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Estabelecimento (opcional)">
          <Combobox
            valor={t.estabelecimento || ""}
            onChange={(v) => set("estabelecimento", v)}
            opcoes={opcoesEstabelecimentos()}
            placeholder="Ex: McDonalds"
            rotuloNovo="Novo estabelecimento"
            onCriarNovo={(nome) => criarEstabelecimento(nome)}
          />
        </Campo>
        <Campo rotulo="Forma de pagamento">
          <select
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 toque bg-white"
            value={t.forma_pagamento || ""}
            onChange={(e) => set("forma_pagamento", e.target.value)}
          >
            <option value="">Não informada</option>
            {FORMAS_PAGAMENTO.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <Campo rotulo="Tags (opcional)">
        <SeletorTags
          valor={t.tags || []}
          onChange={(v) => set("tags", v)}
          opcoes={opcoesTags()}
          onCriarNova={(nome) => criarTag(nome)}
        />
      </Campo>

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
