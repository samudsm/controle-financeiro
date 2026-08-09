"use client";
import { useEffect, useMemo, useState } from "react";
import { Search, Plus } from "lucide-react";
import Modal from "../Modal";
import { listarExercicios, criarExercicio } from "../../lib/academia";
import { GRUPOS_MUSCULARES, EQUIPAMENTOS } from "../../lib/treino";

// Busca na biblioteca e devolve o exercício escolhido.
// Se não achar, permite criar um novo na hora.
export default function EscolherExercicio({ onFechar, onEscolher, aoAvisar }) {
  const [lista, setLista] = useState([]);
  const [busca, setBusca] = useState("");
  const [criando, setCriando] = useState(false);
  const [novo, setNovo] = useState({ nome: "", grupo_muscular: "Peito", equipamento: "Barra" });

  useEffect(() => {
    listarExercicios().then(setLista).catch((e) => aoAvisar?.("Erro: " + e.message, "erro"));
  }, [aoAvisar]);

  const filtrados = useMemo(() => {
    const t = busca.toLowerCase().trim();
    if (!t) return lista;
    return lista.filter((e) => `${e.nome} ${e.grupo_muscular} ${e.equipamento || ""}`.toLowerCase().includes(t));
  }, [lista, busca]);

  const porGrupo = useMemo(() => {
    const mapa = {};
    filtrados.forEach((e) => {
      (mapa[e.grupo_muscular] = mapa[e.grupo_muscular] || []).push(e);
    });
    return mapa;
  }, [filtrados]);

  async function salvarNovo() {
    if (!novo.nome.trim()) {
      aoAvisar?.("Dê um nome ao exercício.", "erro");
      return;
    }
    try {
      const criado = await criarExercicio({ ...novo, nome: novo.nome.trim() });
      onEscolher(criado);
    } catch (e) {
      aoAvisar?.("Erro (talvez já exista): " + e.message, "erro");
    }
  }

  if (criando) {
    return (
      <Modal
        titulo="Novo exercício"
        onFechar={() => setCriando(false)}
        rodape={
          <div className="flex justify-end gap-2">
            <button onClick={() => setCriando(false)} className="px-4 py-2 rounded-lg border border-neutral-300 toque">
              Voltar
            </button>
            <button onClick={salvarNovo} className="px-4 py-2 rounded-lg bg-marca text-white toque">
              Criar e adicionar
            </button>
          </div>
        }
      >
        <label className="block mb-3">
          <span className="block text-xs font-medium text-neutral-500 mb-1">Nome</span>
          <input
            autoFocus
            value={novo.nome}
            onChange={(e) => setNovo((n) => ({ ...n, nome: e.target.value }))}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 toque"
            placeholder="Ex: Supino declinado"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-neutral-500 mb-1">Grupo muscular</span>
            <select
              value={novo.grupo_muscular}
              onChange={(e) => setNovo((n) => ({ ...n, grupo_muscular: e.target.value }))}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 bg-superficie toque"
            >
              {GRUPOS_MUSCULARES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-neutral-500 mb-1">Equipamento</span>
            <select
              value={novo.equipamento}
              onChange={(e) => setNovo((n) => ({ ...n, equipamento: e.target.value }))}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 bg-superficie toque"
            >
              {EQUIPAMENTOS.map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </label>
        </div>
      </Modal>
    );
  }

  return (
    <Modal titulo="Escolher exercício" onFechar={onFechar}>
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          autoFocus
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar exercício…"
          className="w-full border border-neutral-300 rounded-lg pl-9 pr-3 py-2.5 toque"
        />
      </div>

      <button
        onClick={() => {
          setNovo((n) => ({ ...n, nome: busca }));
          setCriando(true);
        }}
        className="w-full mb-3 flex items-center justify-center gap-2 border border-dashed border-neutral-300 text-marca rounded-lg py-2.5 text-sm font-medium toque"
      >
        <Plus size={16} /> Criar exercício novo
      </button>

      {Object.entries(porGrupo).map(([grupo, itens]) => (
        <div key={grupo} className="mb-3">
          <p className="text-[10px] uppercase tracking-wide text-neutral-400 mb-1">{grupo}</p>
          <div className="space-y-1">
            {itens.map((e) => (
              <button
                key={e.id}
                onClick={() => onEscolher(e)}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-neutral-200 hover:border-marca toque"
              >
                <span className="font-medium">{e.nome}</span>
                {e.equipamento && <span className="text-xs text-neutral-400 ml-2">{e.equipamento}</span>}
              </button>
            ))}
          </div>
        </div>
      ))}

      {filtrados.length === 0 && (
        <p className="text-sm text-neutral-400 text-center py-4">
          Nenhum exercício encontrado. Use o botão acima para criar.
        </p>
      )}
    </Modal>
  );
}
