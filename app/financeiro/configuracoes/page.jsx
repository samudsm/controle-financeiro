"use client";
import { useEffect, useState } from "react";
import { Plus, Tag as IconeTag, Store, FolderTree, EyeOff, Trash2 } from "lucide-react";
import { useToast } from "../../../components/Toast";
import { supabaseConfigurado } from "../../../lib/supabase";
import { corDaCategoria } from "../../../lib/categorias";
import {
  listarCategorias,
  listarTodasSubcategorias,
  criarSubcategoria,
  listarTags,
  criarTag,
  listarEstabelecimentos,
  criarEstabelecimento,
  listarIgnorados,
  removerIgnorado,
} from "../../../lib/db";

export default function Configuracoes() {
  const toast = useToast();
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  const [tags, setTags] = useState([]);
  const [estabelecimentos, setEstabelecimentos] = useState([]);
  const [ignorados, setIgnorados] = useState([]);
  const [novaSub, setNovaSub] = useState({ categoriaId: "", nome: "" });
  const [novaTag, setNovaTag] = useState("");
  const [novoEstab, setNovoEstab] = useState("");

  async function carregar() {
    try {
      const [cats, subs, tgs, estabs, ign] = await Promise.all([
        listarCategorias(),
        listarTodasSubcategorias(),
        listarTags(),
        listarEstabelecimentos(),
        // A tabela de ignorados pode não existir ainda (migration-003).
        listarIgnorados().catch(() => null),
      ]);
      setCategorias(cats);
      setSubcategorias(subs);
      setTags(tgs);
      setEstabelecimentos(estabs);
      setIgnorados(ign);
    } catch (e) {
      toast("Erro: " + e.message, "erro");
    }
  }

  async function desfazerIgnorado(x) {
    try {
      await removerIgnorado(x.id);
      toast("✓ Voltará a aparecer nas importações");
      carregar();
    } catch (e) {
      toast("Erro: " + e.message, "erro");
    }
  }

  useEffect(() => {
    if (supabaseConfigurado) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function adicionarSub() {
    if (!novaSub.categoriaId || !novaSub.nome.trim()) {
      toast("Escolha a categoria e digite o nome.", "erro");
      return;
    }
    try {
      await criarSubcategoria(novaSub.categoriaId, novaSub.nome.trim());
      toast("✓ Subcategoria criada");
      setNovaSub({ categoriaId: "", nome: "" });
      carregar();
    } catch (e) {
      toast("Erro (talvez já exista nessa categoria): " + e.message, "erro");
    }
  }

  async function adicionarTag() {
    if (!novaTag.trim()) return;
    try {
      await criarTag(novaTag.trim());
      toast("✓ Tag criada");
      setNovaTag("");
      carregar();
    } catch (e) {
      toast("Erro (talvez já exista): " + e.message, "erro");
    }
  }

  async function adicionarEstab() {
    if (!novoEstab.trim()) return;
    try {
      await criarEstabelecimento(novoEstab.trim());
      toast("✓ Estabelecimento criado");
      setNovoEstab("");
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
    <div className="space-y-4">
      <h1 className="text-xl font-bold mb-3">Configurações</h1>

      {/* CATEGORIAS E SUBCATEGORIAS */}
      <section className="bg-white rounded-xl border border-neutral-200 p-4">
        <h2 className="font-semibold mb-1 flex items-center gap-2">
          <FolderTree size={18} className="text-marca" /> Categorias e subcategorias
        </h2>
        <p className="text-xs text-neutral-500 mb-3">
          As {categorias.length} categorias são fixas. Cada subcategoria pertence a uma só.
        </p>

        <div className="space-y-3">
          {categorias.map((c, i) => {
            const suas = subcategorias.filter((s) => s.categoria_id === c.id);
            return (
              <div key={c.id}>
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: corDaCategoria(c.nome, i) }}
                  />
                  <span className="font-medium">{c.nome}</span>
                  <span className="text-xs text-neutral-400">
                    {c.tipo} · {suas.length} subcategoria(s)
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1 ml-5">
                  {suas.map((s) => (
                    <span
                      key={s.id}
                      className="text-xs bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-full"
                    >
                      {s.nome}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 mt-4 pt-3 border-t border-neutral-200">
          <select
            className="border border-neutral-300 rounded-lg px-2 bg-white text-sm"
            value={novaSub.categoriaId}
            onChange={(e) => setNovaSub((s) => ({ ...s, categoriaId: e.target.value }))}
          >
            <option value="">Categoria…</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <input
            className="flex-1 border border-neutral-300 rounded-lg px-3 py-2 toque text-sm"
            placeholder="Nova subcategoria"
            value={novaSub.nome}
            onChange={(e) => setNovaSub((s) => ({ ...s, nome: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && adicionarSub()}
          />
          <button onClick={adicionarSub} className="bg-marca text-white rounded-lg px-3 toque">
            <Plus size={18} />
          </button>
        </div>
      </section>

      {/* TAGS */}
      <Lista
        titulo="Tags"
        descricao="Eventos e contextos que cruzam categorias."
        Icone={IconeTag}
        itens={tags}
        valor={novaTag}
        setValor={setNovaTag}
        onAdicionar={adicionarTag}
        placeholder="Nova tag"
      />

      {/* ESTABELECIMENTOS */}
      <Lista
        titulo="Estabelecimentos"
        descricao="Alimentam o autocomplete ao lançar."
        Icone={Store}
        itens={estabelecimentos}
        valor={novoEstab}
        setValor={setNovoEstab}
        onAdicionar={adicionarEstab}
        placeholder="Novo estabelecimento"
      />

      {/* IGNORADOS NA IMPORTAÇÃO */}
      <section className="bg-white rounded-xl border border-neutral-200 p-4">
        <h2 className="font-semibold mb-1 flex items-center gap-2">
          <EyeOff size={18} className="text-marca" /> Não mostrar na importação
        </h2>
        <p className="text-xs text-neutral-500 mb-3">
          Lançamentos que você mandou sumir da tela de importar extrato.
        </p>

        {ignorados === null ? (
          <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-300 rounded-lg px-3 py-2">
            Rode o <code>supabase/migration-003-ignorados.sql</code> no Supabase para ativar
            esta função.
          </p>
        ) : ignorados.length === 0 ? (
          <p className="text-sm text-neutral-400">
            Nada ignorado. Use o ícone de olho cortado na tela de importação.
          </p>
        ) : (
          <div className="space-y-2">
            {ignorados.map((x) => (
              <div
                key={x.id}
                className="flex items-center gap-2 border border-neutral-200 rounded-lg px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{x.rotulo || x.chave}</p>
                  <p className="text-xs text-neutral-400">
                    {x.criterio === "descricao"
                      ? "Sempre que essa descrição aparecer"
                      : "Só esse lançamento"}
                  </p>
                </div>
                <button
                  onClick={() => desfazerIgnorado(x)}
                  className="text-despesa p-1 shrink-0"
                  aria-label={`Voltar a mostrar ${x.rotulo || x.chave}`}
                  title="Voltar a mostrar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="text-xs text-neutral-400">
        App de uso pessoal · Supabase em conta própria · Controle Financeiro
      </p>
    </div>
  );
}

function Lista({ titulo, descricao, Icone, itens, valor, setValor, onAdicionar, placeholder }) {
  return (
    <section className="bg-white rounded-xl border border-neutral-200 p-4">
      <h2 className="font-semibold mb-1 flex items-center gap-2">
        <Icone size={18} className="text-marca" /> {titulo}
      </h2>
      <p className="text-xs text-neutral-500 mb-3">{descricao}</p>

      <div className="flex flex-wrap gap-2">
        {itens.map((x) => (
          <span
            key={x.id}
            className="px-3 py-1 rounded-full text-sm border border-neutral-200 bg-neutral-50"
          >
            {x.nome}
          </span>
        ))}
        {itens.length === 0 && <span className="text-sm text-neutral-400">Nada cadastrado.</span>}
      </div>

      <div className="flex gap-2 mt-4 pt-3 border-t border-neutral-200">
        <input
          className="flex-1 border border-neutral-300 rounded-lg px-3 py-2 toque text-sm"
          placeholder={placeholder}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onAdicionar()}
        />
        <button onClick={onAdicionar} className="bg-marca text-white rounded-lg px-3 toque">
          <Plus size={18} />
        </button>
      </div>
    </section>
  );
}
