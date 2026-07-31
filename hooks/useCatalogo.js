"use client";
import { useCallback, useEffect, useState } from "react";
import {
  listarCategorias,
  listarTodasSubcategorias,
  listarTags,
  criarTag as dbCriarTag,
  listarEstabelecimentos,
  criarEstabelecimento as dbCriarEstabelecimento,
  sugestoesPorHistorico,
} from "../lib/db";

// Carrega as listas oficiais (categorias, subcategorias, tags, estabelecimentos)
// e o histórico, que alimenta o autocomplete e a sugestão automática.
export function useCatalogo() {
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]); // [{id, nome, categoria}]
  const [tags, setTags] = useState([]);
  const [estabelecimentos, setEstabelecimentos] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(async () => {
    try {
      const [cats, subs, tgs, estabs, hist] = await Promise.all([
        listarCategorias(),
        listarTodasSubcategorias(),
        listarTags(),
        listarEstabelecimentos(),
        sugestoesPorHistorico(),
      ]);
      setCategorias(cats);
      setSubcategorias(subs);
      setTags(tgs);
      setEstabelecimentos(estabs);
      setHistorico(hist);
      setErro(null);
    } catch (e) {
      setErro(e.message);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // ---------- CATEGORIAS (lista fechada) ----------
  function opcoesCategorias() {
    const freq = {};
    for (const h of historico) {
      if (h.categoria) freq[h.categoria] = (freq[h.categoria] || 0) + 1;
    }
    return categorias.map((c) => ({ valor: c.nome, rotulo: c.nome, freq: freq[c.nome] || 0 }));
  }

  // ---------- SUBCATEGORIAS (só as da categoria escolhida) ----------
  function opcoesSubcategorias(categoriaNome) {
    if (!categoriaNome) return [];
    const freq = {};
    for (const h of historico) {
      if (h.categoria === categoriaNome && h.subcategoria) {
        freq[h.subcategoria] = (freq[h.subcategoria] || 0) + 1;
      }
    }
    return subcategorias
      .filter((s) => s.categoria === categoriaNome)
      .map((s) => ({ valor: s.nome, rotulo: s.nome, id: s.id, freq: freq[s.nome] || 0 }));
  }

  // A subcategoria informada pertence mesmo à categoria? (trava de integridade na UI)
  function subcategoriaValida(categoriaNome, subNome) {
    if (!subNome) return true; // vazio é permitido
    return subcategorias.some((s) => s.categoria === categoriaNome && s.nome === subNome);
  }

  function idsDe(categoriaNome, subNome) {
    const cat = categorias.find((c) => c.nome === categoriaNome);
    const sub = subcategorias.find((s) => s.categoria === categoriaNome && s.nome === subNome);
    return { categoria_id: cat?.id ?? null, subcategoria_id: sub?.id ?? null };
  }

  // ---------- ESTABELECIMENTOS (texto livre com autocomplete) ----------
  function opcoesEstabelecimentos() {
    const freq = {};
    for (const h of historico) {
      if (h.estabelecimento) freq[h.estabelecimento] = (freq[h.estabelecimento] || 0) + 1;
    }
    const nomes = new Set([...estabelecimentos.map((e) => e.nome), ...Object.keys(freq)]);
    return [...nomes].map((n) => ({ valor: n, rotulo: n, freq: freq[n] || 0 }));
  }

  async function criarEstabelecimento(nome) {
    try {
      await dbCriarEstabelecimento(nome);
    } catch {
      /* pode já existir */
    }
    await carregar();
  }

  // ---------- TAGS ----------
  function opcoesTags() {
    return tags.map((t) => ({ valor: t.nome, rotulo: t.nome }));
  }

  async function criarTag(nome) {
    try {
      await dbCriarTag(nome);
    } catch {
      /* pode já existir */
    }
    await carregar();
  }

  // ---------- SUGESTÃO AUTOMÁTICA ----------
  // Olha o histórico e chuta a categoria a partir da descrição.
  function sugerirCategoria(descricao) {
    const d = String(descricao || "").toLowerCase().trim();
    if (!d) return "";
    const contagem = {};
    for (const h of historico) {
      if (!h.categoria || !h.descricao) continue;
      const hd = h.descricao.toLowerCase();
      const palavras = d.split(/\s+/).filter((w) => w.length >= 3);
      if (palavras.some((w) => hd.includes(w))) {
        contagem[h.categoria] = (contagem[h.categoria] || 0) + 1;
      }
    }
    const ranking = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
    return ranking.length ? ranking[0][0] : "";
  }

  // Sugere também a subcategoria, dentro da categoria já escolhida.
  function sugerirSubcategoria(descricao, categoriaNome) {
    const d = String(descricao || "").toLowerCase().trim();
    if (!d || !categoriaNome) return "";
    const contagem = {};
    for (const h of historico) {
      if (h.categoria !== categoriaNome || !h.subcategoria || !h.descricao) continue;
      const hd = h.descricao.toLowerCase();
      const palavras = d.split(/\s+/).filter((w) => w.length >= 3);
      if (palavras.some((w) => hd.includes(w))) {
        contagem[h.subcategoria] = (contagem[h.subcategoria] || 0) + 1;
      }
    }
    const ranking = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
    return ranking.length ? ranking[0][0] : "";
  }

  return {
    categorias,
    subcategorias,
    tags,
    estabelecimentos,
    erro,
    opcoesCategorias,
    opcoesSubcategorias,
    subcategoriaValida,
    idsDe,
    opcoesEstabelecimentos,
    criarEstabelecimento,
    opcoesTags,
    criarTag,
    sugerirCategoria,
    sugerirSubcategoria,
    recarregar: carregar,
  };
}
