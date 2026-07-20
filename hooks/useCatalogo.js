"use client";
import { useCallback, useEffect, useState } from "react";
import {
  listarCategorias,
  criarCategoria as dbCriarCategoria,
  listarSubcategorias,
  criarSubcategoria as dbCriarSubcategoria,
  sugestoesPorHistorico,
} from "../lib/db";
import { CATEGORIAS_PADRAO } from "../lib/categorias";

// Carrega categorias + histórico e oferece autocomplete inteligente.
export function useCatalogo() {
  const [categorias, setCategorias] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [subsPorCategoria, setSubsPorCategoria] = useState({}); // { categoriaNome: [nomes] }
  const [erro, setErro] = useState(null);

  const carregar = useCallback(async () => {
    try {
      const [cats, hist] = await Promise.all([
        listarCategorias(),
        sugestoesPorHistorico(),
      ]);
      // Garante que as padrão apareçam mesmo se o banco vier vazio.
      const nomes = new Set(cats.map((c) => c.nome));
      const combinadas = [...cats];
      for (const p of CATEGORIAS_PADRAO) {
        if (!nomes.has(p)) combinadas.push({ id: null, nome: p, tipo: "despesa" });
      }
      setCategorias(combinadas);
      setHistorico(hist);
      setErro(null);
    } catch (e) {
      setErro(e.message);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Frequência de categorias no histórico (para ordenar).
  function opcoesCategorias() {
    const freq = {};
    for (const h of historico) {
      if (h.categoria) freq[h.categoria] = (freq[h.categoria] || 0) + 1;
    }
    return categorias.map((c) => ({
      valor: c.nome,
      rotulo: c.nome,
      freq: freq[c.nome] || 0,
    }));
  }

  // Sugere categoria a partir da descrição, olhando o histórico.
  function sugerirCategoria(descricao) {
    const d = String(descricao || "").toLowerCase().trim();
    if (!d) return "";
    const contagem = {};
    for (const h of historico) {
      if (!h.categoria || !h.descricao) continue;
      const hd = h.descricao.toLowerCase();
      // Similaridade simples: compartilham alguma palavra >= 3 letras.
      const palavras = d.split(/\s+/).filter((w) => w.length >= 3);
      const casa = palavras.some((w) => hd.includes(w));
      if (casa) contagem[h.categoria] = (contagem[h.categoria] || 0) + 1;
    }
    const ranking = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
    return ranking.length ? ranking[0][0] : "";
  }

  // Subcategorias de uma categoria (do histórico + do banco), carregadas sob demanda.
  const carregarSubs = useCallback(
    async (categoriaNome) => {
      const doHistorico = [
        ...new Set(
          historico
            .filter((h) => h.categoria === categoriaNome && h.subcategoria)
            .map((h) => h.subcategoria)
        ),
      ];
      // Busca no banco (se a categoria existir lá).
      const cat = categorias.find((c) => c.nome === categoriaNome && c.id);
      let doBanco = [];
      if (cat) {
        try {
          const subs = await listarSubcategorias(cat.id);
          doBanco = subs.map((s) => s.nome);
        } catch {
          /* ignora */
        }
      }
      const todas = [...new Set([...doHistorico, ...doBanco])];
      setSubsPorCategoria((prev) => ({ ...prev, [categoriaNome]: todas }));
      return todas;
    },
    [historico, categorias]
  );

  function opcoesSubcategorias(categoriaNome) {
    const subs = subsPorCategoria[categoriaNome] || [];
    const freq = {};
    for (const h of historico) {
      if (h.categoria === categoriaNome && h.subcategoria) {
        freq[h.subcategoria] = (freq[h.subcategoria] || 0) + 1;
      }
    }
    return subs.map((s) => ({ valor: s, rotulo: s, freq: freq[s] || 0 }));
  }

  async function criarCategoria(nome) {
    try {
      await dbCriarCategoria(nome);
    } catch {
      /* pode já existir */
    }
    await carregar();
  }

  async function criarSubcategoria(categoriaNome, nome) {
    const cat = categorias.find((c) => c.nome === categoriaNome && c.id);
    if (cat) {
      try {
        await dbCriarSubcategoria(cat.id, nome);
      } catch {
        /* pode já existir */
      }
    }
    setSubsPorCategoria((prev) => ({
      ...prev,
      [categoriaNome]: [...new Set([...(prev[categoriaNome] || []), nome])],
    }));
  }

  return {
    categorias,
    erro,
    opcoesCategorias,
    sugerirCategoria,
    carregarSubs,
    opcoesSubcategorias,
    criarCategoria,
    criarSubcategoria,
    recarregar: carregar,
  };
}
