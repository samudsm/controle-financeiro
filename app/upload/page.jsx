"use client";
import { useMemo, useRef, useState } from "react";
import { UploadCloud, FileText, Split, Loader2 } from "lucide-react";
import CamposTransacao from "../../components/CamposTransacao";
import DecomporFatura from "../../components/DecomporFatura";
import { useCatalogo } from "../../hooks/useCatalogo";
import { useToast } from "../../components/Toast";
import { supabaseConfigurado } from "../../lib/supabase";
import { extrairTextoPDF, extrairTransacoes, chaveDuplicata } from "../../lib/pdf";
import { listarTodasTransacoes, criarTransacoes, definirTagsDaTransacao } from "../../lib/db";
import { dataBRparaISO, formatBRL, formatData } from "../../lib/format";
import { pareceFatura } from "../../lib/categorias";

export default function UploadPage() {
  const toast = useToast();
  const catalogo = useCatalogo();
  const inputRef = useRef(null);

  const [processandoPDF, setProcessandoPDF] = useState(false);
  const [extraidas, setExtraidas] = useState([]); // [{data(BR), descricao, valor, nova}]
  const [selecionadas, setSelecionadas] = useState({}); // idx -> bool
  const [apenasNovas, setApenasNovas] = useState(true);
  const [etapa, setEtapa] = useState("upload"); // 'upload' | 'preencher'
  const [itens, setItens] = useState([]); // itens em preenchimento
  const [decompor, setDecompor] = useState(null);
  const [salvando, setSalvando] = useState(false);

  async function processarArquivo(file) {
    if (!file || file.type !== "application/pdf") {
      toast("Envie um arquivo PDF.", "erro");
      return;
    }
    setProcessandoPDF(true);
    try {
      const linhas = await extrairTextoPDF(file);
      const trans = extrairTransacoes(linhas);
      // Detecção de duplicatas.
      const existentes = await listarTodasTransacoes();
      const chaves = new Set(
        existentes.map((e) =>
          chaveDuplicata({ data: formatData(e.data), descricao: e.descricao, valor: e.valor })
        )
      );
      const comFlag = trans.map((t) => ({
        ...t,
        nova: !chaves.has(chaveDuplicata(t)),
      }));
      setExtraidas(comFlag);
      // Pré-seleciona as novas.
      const sel = {};
      comFlag.forEach((t, i) => {
        if (t.nova) sel[i] = true;
      });
      setSelecionadas(sel);
      if (comFlag.length === 0) toast("Nenhuma transação reconhecida no PDF.", "erro");
    } catch (e) {
      toast("Erro ao ler PDF: " + e.message, "erro");
    } finally {
      setProcessandoPDF(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    processarArquivo(file);
  }

  const visiveis = useMemo(
    () => extraidas.map((t, i) => ({ ...t, i })).filter((t) => (apenasNovas ? t.nova : true)),
    [extraidas, apenasNovas]
  );

  function processarSelecionadas() {
    const escolhidas = extraidas
      .map((t, i) => ({ ...t, i }))
      .filter((t) => selecionadas[t.i]);
    if (escolhidas.length === 0) {
      toast("Selecione ao menos uma transação.", "erro");
      return;
    }
    setItens(
      escolhidas.map((t) => ({
        dataBR: t.data,
        descricao: t.descricao,
        categoria: "",
        subcategoria: "",
        tipo: t.valorBruto < 0 ? "despesa" : "receita",
        valor: t.valor,
        estabelecimento: "",
        forma_pagamento: "",
        tags: [],
        notas: "",
        status: "pago",
        is_fixa: false,
        _fatura: pareceFatura(t.descricao),
      }))
    );
    setEtapa("preencher");
  }

  function setItem(idx, campo, valor) {
    setItens((arr) => arr.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)));
  }

  async function salvarTudo() {
    // Categoria virou lista fechada e obrigatória — nada mais cai em "Outros".
    const semCategoria = itens.filter((it) => !it.categoria).length;
    if (semCategoria > 0) {
      toast(`${semCategoria} lançamento(s) sem categoria. Escolha uma para cada.`, "erro");
      return;
    }
    const invalida = itens.find(
      (it) => it.subcategoria && !catalogo.subcategoriaValida(it.categoria, it.subcategoria)
    );
    if (invalida) {
      toast(`"${invalida.subcategoria}" não pertence a ${invalida.categoria}.`, "erro");
      return;
    }

    setSalvando(true);
    try {
      const lista = itens.map((it) => {
        const { categoria_id, subcategoria_id } = catalogo.idsDe(it.categoria, it.subcategoria);
        return {
          data: dataBRparaISO(it.dataBR) || it.dataBR,
          descricao: it.descricao,
          categoria: it.categoria,
          subcategoria: it.subcategoria || null,
          categoria_id,
          subcategoria_id,
          tipo: it.tipo,
          valor: Number(it.valor) || 0,
          estabelecimento: it.estabelecimento || null,
          forma_pagamento: it.forma_pagamento || null,
          notas: it.notas || null,
          status: it.status || "pago",
          is_fixa: !!it.is_fixa,
        };
      });
      const criadas = await criarTransacoes(lista);
      // Grava as tags de cada lançamento recém-criado.
      for (let i = 0; i < criadas.length; i++) {
        const tags = itens[i]?.tags || [];
        if (tags.length) await definirTagsDaTransacao(criadas[i].id, tags);
      }
      toast(`✓ ${lista.length} transação(ões) salva(s)`);
      // Reset.
      setEtapa("upload");
      setExtraidas([]);
      setSelecionadas({});
      setItens([]);
    } catch (e) {
      toast("Erro ao salvar: " + e.message, "erro");
    } finally {
      setSalvando(false);
    }
  }

  if (!supabaseConfigurado) {
    return (
      <div className="mt-10 bg-yellow-50 border border-yellow-300 rounded-xl p-4 text-yellow-800">
        Configure o Supabase (.env.local) para usar a importação.
      </div>
    );
  }

  // ---------- ETAPA: PREENCHER ----------
  if (etapa === "preencher") {
    return (
      <div>
        <h1 className="text-xl font-bold mb-3">Preencher transações</h1>
        <div className="space-y-4">
          {itens.map((it, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-neutral-200 p-3">
              <div className="flex items-center justify-between mb-2 text-sm text-neutral-500">
                <span>{it.dataBR}</span>
                {it._fatura && (
                  <button
                    onClick={() =>
                      setDecompor({
                        data: dataBRparaISO(it.dataBR) || it.dataBR,
                        descricao: it.descricao,
                        valor: it.valor,
                        _idx: idx,
                      })
                    }
                    className="flex items-center gap-1 text-marca font-medium"
                  >
                    <Split size={15} /> Decompor fatura
                  </button>
                )}
              </div>
              <CamposTransacao t={it} set={(c, v) => setItem(idx, c, v)} catalogo={catalogo} />
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setEtapa("upload")}
            className="flex-1 px-4 py-3 rounded-lg border border-neutral-300 toque"
          >
            Voltar
          </button>
          <button
            onClick={salvarTudo}
            disabled={salvando}
            className="flex-1 px-4 py-3 rounded-lg bg-marca text-white toque disabled:opacity-40"
          >
            {salvando ? "Salvando…" : "Salvar todas"}
          </button>
        </div>

        {decompor && (
          <DecomporFatura
            fatura={decompor}
            catalogo={catalogo}
            onFechar={() => setDecompor(null)}
            onSalvo={() => {
              // Remove o item de fatura da lista (virou vários).
              setItens((arr) => arr.filter((_, i) => i !== decompor._idx));
            }}
          />
        )}
      </div>
    );
  }

  // ---------- ETAPA: UPLOAD ----------
  return (
    <div>
      <h1 className="text-xl font-bold mb-3">Importar extrato (PDF)</h1>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-neutral-300 rounded-2xl p-8 text-center cursor-pointer bg-white hover:border-marca transition"
      >
        {processandoPDF ? (
          <div className="flex flex-col items-center gap-2 text-neutral-500">
            <Loader2 className="animate-spin" /> Lendo PDF…
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-neutral-500">
            <UploadCloud size={40} className="text-marca" />
            <p className="font-medium">Arraste o PDF aqui ou toque para escolher</p>
            <p className="text-xs">Somente arquivos .pdf</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => processarArquivo(e.target.files?.[0])}
        />
      </div>

      {extraidas.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">
              {extraidas.length} transação(ões) encontradas
            </h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={apenasNovas}
                onChange={(e) => setApenasNovas(e.target.checked)}
              />
              Apenas novas
            </label>
          </div>

          <div className="space-y-2">
            {visiveis.map((t) => (
              <label
                key={t.i}
                className="flex items-center gap-3 bg-white rounded-xl border border-neutral-200 p-3"
              >
                <input
                  type="checkbox"
                  checked={!!selecionadas[t.i]}
                  onChange={(e) =>
                    setSelecionadas((s) => ({ ...s, [t.i]: e.target.checked }))
                  }
                />
                <FileText size={18} className="text-neutral-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{t.descricao}</p>
                  <p className="text-xs text-neutral-500">
                    {t.data} · {formatBRL(t.valorBruto)}
                  </p>
                </div>
                <span
                  className={`text-xs shrink-0 ${
                    t.nova ? "text-receita" : "text-neutral-400"
                  }`}
                >
                  {t.nova ? "○ Nova" : "✓ Já existe"}
                </span>
              </label>
            ))}
          </div>

          <button
            onClick={processarSelecionadas}
            className="w-full mt-4 px-4 py-3 rounded-lg bg-marca text-white toque"
          >
            Processar selecionadas
          </button>
        </div>
      )}
    </div>
  );
}
