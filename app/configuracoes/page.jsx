"use client";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useToast } from "../../components/Toast";
import { supabaseConfigurado } from "../../lib/supabase";
import { listarCategorias, criarCategoria } from "../../lib/db";

export default function Configuracoes() {
  const toast = useToast();
  const [categorias, setCategorias] = useState([]);
  const [nova, setNova] = useState("");
  const [tipo, setTipo] = useState("despesa");

  async function carregar() {
    try {
      setCategorias(await listarCategorias());
    } catch (e) {
      toast("Erro: " + e.message, "erro");
    }
  }

  useEffect(() => {
    if (supabaseConfigurado) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function adicionar() {
    if (!nova.trim()) return;
    try {
      await criarCategoria(nova.trim(), tipo);
      toast("✓ Categoria criada");
      setNova("");
      carregar();
    } catch (e) {
      toast("Erro (talvez já exista): " + e.message, "erro");
    }
  }

  if (!supabaseConfigurado) {
    return (
      <div className="mt-10 bg-yellow-50 border border-yellow-300 rounded-xl p-4 text-yellow-800">
        Configure o Supabase (.env.local) primeiro.
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-3">Configurações</h1>

      <section className="bg-white rounded-xl border border-neutral-200 p-4">
        <h2 className="font-semibold mb-3">Categorias</h2>

        <div className="flex gap-2 mb-4">
          <input
            className="flex-1 border border-neutral-300 rounded-lg px-3 py-2 toque"
            placeholder="Nova categoria"
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && adicionar()}
          />
          <select
            className="border border-neutral-300 rounded-lg px-2 bg-white"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
          </select>
          <button onClick={adicionar} className="bg-marca text-white rounded-lg px-3 toque">
            <Plus size={18} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {categorias.map((c) => (
            <span
              key={c.id || c.nome}
              className="px-3 py-1 rounded-full text-sm border"
              style={{ borderColor: c.cor || "#ddd", background: (c.cor || "#eee") + "22" }}
            >
              {c.nome}
            </span>
          ))}
        </div>
      </section>

      <p className="text-xs text-neutral-400 mt-4">
        App de uso pessoal · Supabase em conta própria · Controle Financeiro
      </p>
    </div>
  );
}
