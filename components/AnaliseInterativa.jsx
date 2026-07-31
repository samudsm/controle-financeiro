"use client";
import { useMemo, useState } from "react";
import { ChevronRight, ChevronLeft, Table2, BarChart3, Tag as IconeTag } from "lucide-react";
import { corDaCategoria } from "../lib/categorias";
import { apenasDespesas } from "../lib/totais";
import { formatBRL, formatData } from "../lib/format";

// Cor única para as visões de série única (por dia, por tag, por local).
// Regra: uma série = uma cor; a cor não codifica o tamanho da barra.
const COR_UNICA = "#2a78d6";

const ABAS = [
  { id: "categoria", rotulo: "Categorias" },
  { id: "dia", rotulo: "Por dia" },
  { id: "tag", rotulo: "Tags" },
  { id: "local", rotulo: "Locais" },
];

const SEM_CATEGORIA = "(sem categoria)";
const SEM_SUB = "(sem subcategoria)";
const SEM_TAG = "(sem tag)";

export default function AnaliseInterativa({ transacoes }) {
  const [aba, setAba] = useState("categoria");
  const [caminho, setCaminho] = useState([]); // ex.: ["Alimentação", "Restaurante"]
  const [tabela, setTabela] = useState(false);

  const despesas = useMemo(() => apenasDespesas(transacoes), [transacoes]);

  function trocarAba(id) {
    setAba(id);
    setCaminho([]);
  }

  // Lançamentos que sobram depois das escolhas feitas no caminho.
  const filtradas = useMemo(() => {
    let lista = despesas;
    if (aba === "categoria") {
      if (caminho[0]) lista = lista.filter((t) => (t.categoria || SEM_CATEGORIA) === caminho[0]);
      if (caminho[1]) lista = lista.filter((t) => (t.subcategoria || SEM_SUB) === caminho[1]);
    } else if (caminho[0]) {
      if (aba === "dia") lista = lista.filter((t) => t.data === caminho[0]);
      if (aba === "tag") {
        lista = lista.filter((t) =>
          caminho[0] === SEM_TAG ? !t.tags?.length : t.tags?.includes(caminho[0])
        );
      }
      if (aba === "local") {
        lista = lista.filter((t) => (t.estabelecimento || t.descricao) === caminho[0]);
      }
    }
    return lista;
  }, [despesas, aba, caminho]);

  // O que desenhar agora: um conjunto de barras, ou a lista final de lançamentos.
  const grupos = useMemo(() => {
    if (aba === "categoria") {
      if (caminho.length === 0) return agrupar(filtradas, (t) => t.categoria || SEM_CATEGORIA);
      if (caminho.length === 1) return agrupar(filtradas, (t) => t.subcategoria || SEM_SUB);
      return null;
    }
    if (caminho.length > 0) return null;
    if (aba === "dia") return agrupar(filtradas, (t) => t.data, true);
    if (aba === "tag") return agruparPorTag(filtradas);
    return agrupar(filtradas, (t) => t.estabelecimento || t.descricao);
  }, [filtradas, aba, caminho]);

  const total = filtradas.reduce((s, t) => s + Math.abs(Number(t.valor) || 0), 0);
  const maior = grupos?.length ? Math.max(...grupos.map((g) => g.total)) : 0;

  // A cor da barra pertence à entidade: subcategoria herda a cor da sua categoria.
  function corDe(nome) {
    if (aba !== "categoria") return COR_UNICA;
    return corDaCategoria(caminho.length === 1 ? caminho[0] : nome);
  }

  if (despesas.length === 0) return null;

  return (
    <section className="mt-6 bg-white rounded-xl border border-neutral-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Explorar gastos</h2>
        <button
          onClick={() => setTabela((v) => !v)}
          className="flex items-center gap-1 text-xs text-marca toque px-2 py-1"
          aria-label={tabela ? "Ver como gráfico" : "Ver como tabela"}
        >
          {tabela ? <BarChart3 size={15} /> : <Table2 size={15} />}
          {tabela ? "Gráfico" : "Tabela"}
        </button>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-3 overflow-x-auto">
        {ABAS.map((a) => (
          <button
            key={a.id}
            onClick={() => trocarAba(a.id)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap toque ${
              aba === a.id
                ? "bg-marca text-white font-medium"
                : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      {/* Caminho percorrido (clique para voltar) */}
      {caminho.length > 0 && (
        <div className="flex items-center flex-wrap gap-1 mb-3 text-sm">
          <button
            onClick={() => setCaminho([])}
            className="flex items-center gap-1 text-marca font-medium toque"
          >
            <ChevronLeft size={15} /> Tudo
          </button>
          {caminho.map((passo, i) => (
            <span key={passo} className="flex items-center gap-1">
              <ChevronRight size={13} className="text-neutral-300" />
              <button
                onClick={() => setCaminho(caminho.slice(0, i + 1))}
                className="text-neutral-700 font-medium toque"
              >
                {aba === "dia" && i === 0 ? formatData(passo) : passo}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Total do recorte atual */}
      <div className="flex items-baseline justify-between mb-3 pb-3 border-b border-neutral-100">
        <span className="text-sm text-neutral-500">
          {filtradas.length} lançamento{filtradas.length === 1 ? "" : "s"}
        </span>
        <span className="text-lg font-bold text-despesa">{formatBRL(total)}</span>
      </div>

      {tabela ? (
        <Tabela grupos={grupos} lancamentos={filtradas} total={total} />
      ) : grupos ? (
        aba === "dia" ? (
          <Colunas
            grupos={grupos}
            maior={maior}
            onEscolher={(g) => setCaminho([g.chave])}
          />
        ) : (
          <Barras
            grupos={grupos}
            maior={maior}
            total={total}
            corDe={corDe}
            onEscolher={(g) => setCaminho([...caminho, g.chave])}
            podeAprofundar={aba !== "categoria" || caminho.length === 0}
          />
        )
      ) : (
        <Lancamentos lista={filtradas} />
      )}
    </section>
  );
}

/* ---------------- BARRAS HORIZONTAIS (clicáveis) ---------------- */
function Barras({ grupos, maior, total, corDe, onEscolher, podeAprofundar }) {
  return (
    <div className="space-y-2.5">
      {grupos.map((g) => {
        const largura = maior ? (g.total / maior) * 100 : 0;
        const pct = total ? (g.total / total) * 100 : 0;
        return (
          <button
            key={g.chave}
            onClick={() => onEscolher(g)}
            className="w-full text-left toque"
            title={`${g.chave}: ${formatBRL(g.total)} em ${g.qtd} lançamento(s)`}
          >
            {/* Rótulo direto: nome e valor sempre visíveis, nunca só a cor */}
            <div className="flex items-baseline gap-2 mb-1">
              <span className="flex-1 text-sm font-medium truncate">{g.chave}</span>
              <span className="text-xs text-neutral-400 tabular-nums">{g.qtd}x</span>
              <span className="text-xs text-neutral-400 tabular-nums w-10 text-right">
                {pct.toFixed(0)}%
              </span>
              <span className="text-sm font-semibold tabular-nums w-24 text-right">
                {formatBRL(g.total)}
              </span>
              {podeAprofundar && <ChevronRight size={15} className="text-neutral-300 shrink-0" />}
            </div>
            <div className="h-3 rounded-full bg-neutral-100 overflow-hidden">
              <div
                className="h-full rounded-r"
                style={{ width: `${Math.max(largura, 1.5)}%`, background: corDe(g.chave) }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- COLUNAS POR DIA (clicáveis) ---------------- */
function Colunas({ grupos, maior, onEscolher }) {
  const maiorDia = grupos.reduce((a, g) => (g.total > a.total ? g : a), grupos[0]);
  return (
    <div>
      <div className="flex items-end gap-1 h-44">
        {grupos.map((g) => {
          const altura = maior ? (g.total / maior) * 100 : 0;
          const destaque = g.chave === maiorDia.chave;
          return (
            <button
              key={g.chave}
              onClick={() => onEscolher(g)}
              className="flex-1 h-full flex flex-col justify-end min-w-0 toque group"
              title={`${formatData(g.chave)}: ${formatBRL(g.total)} em ${g.qtd} lançamento(s)`}
              aria-label={`${formatData(g.chave)}: ${formatBRL(g.total)}`}
            >
              {/* Rótulo direto só no maior dia — um número em cada barra vira ruído */}
              {destaque && (
                <span className="text-[10px] text-neutral-500 tabular-nums text-center mb-0.5 whitespace-nowrap">
                  {formatBRL(g.total)}
                </span>
              )}
              <div
                className="rounded-t w-full group-hover:opacity-80 transition-opacity"
                style={{ height: `${Math.max(altura, 2)}%`, background: COR_UNICA }}
              />
            </button>
          );
        })}
      </div>
      {/* Eixo X: hairline sólida, cinza recessivo */}
      <div className="h-px bg-neutral-200 my-1" />
      <div className="flex gap-1">
        {grupos.map((g) => (
          <span
            key={g.chave}
            className="flex-1 text-[10px] text-neutral-400 text-center tabular-nums min-w-0 truncate"
          >
            {Number(String(g.chave).slice(8, 10))}
          </span>
        ))}
      </div>
      <p className="text-xs text-neutral-400 mt-2 text-center">
        Dia do mês · toque numa coluna para ver os lançamentos
      </p>
    </div>
  );
}

/* ---------------- LISTA FINAL DE LANÇAMENTOS ---------------- */
function Lancamentos({ lista }) {
  if (lista.length === 0) {
    return <p className="text-sm text-neutral-400 text-center py-4">Nada aqui.</p>;
  }
  return (
    <div className="space-y-2">
      {[...lista]
        .sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor))
        .map((t) => (
          <div key={t.id} className="flex items-start gap-2 text-sm border-b border-neutral-50 pb-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{t.descricao}</p>
              <p className="text-xs text-neutral-400 truncate">
                {formatData(t.data)} · {t.categoria}
                {t.subcategoria && ` › ${t.subcategoria}`}
                {t.estabelecimento && ` · ${t.estabelecimento}`}
              </p>
              {t.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {t.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-0.5 text-[10px] bg-marca/10 text-marca px-1.5 py-0.5 rounded-full"
                    >
                      <IconeTag size={9} />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span className="font-semibold text-despesa shrink-0 tabular-nums">
              {formatBRL(Math.abs(t.valor))}
            </span>
          </div>
        ))}
    </div>
  );
}

/* ---------------- VISÃO EM TABELA (mesmos números, sem depender de cor) ---------------- */
function Tabela({ grupos, lancamentos, total }) {
  const linhas = grupos
    ? grupos.map((g) => ({ nome: g.chave, qtd: g.qtd, valor: g.total }))
    : [...lancamentos]
        .sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor))
        .map((t) => ({ nome: t.descricao, qtd: 1, valor: Math.abs(Number(t.valor) || 0) }));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-neutral-500 border-b border-neutral-200">
            <th className="py-2 font-medium">Item</th>
            <th className="py-2 font-medium text-right">Qtd</th>
            <th className="py-2 font-medium text-right">Valor</th>
            <th className="py-2 font-medium text-right">%</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={`${l.nome}-${i}`} className="border-b border-neutral-50">
              <td className="py-1.5 pr-2">{l.nome}</td>
              <td className="py-1.5 text-right text-neutral-400 tabular-nums">{l.qtd}</td>
              <td className="py-1.5 text-right font-medium tabular-nums">{formatBRL(l.valor)}</td>
              <td className="py-1.5 text-right text-neutral-400 tabular-nums">
                {total ? ((l.valor / total) * 100).toFixed(0) : 0}%
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td className="py-2">Total</td>
            <td />
            <td className="py-2 text-right tabular-nums">{formatBRL(total)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ---------------- AGRUPADORES ---------------- */
function agrupar(lista, chaveDe, ordenarPorChave = false) {
  const mapa = {};
  for (const t of lista) {
    const chave = chaveDe(t) || "—";
    mapa[chave] = mapa[chave] || { chave, total: 0, qtd: 0 };
    mapa[chave].total += Math.abs(Number(t.valor) || 0);
    mapa[chave].qtd += 1;
  }
  const arr = Object.values(mapa);
  return ordenarPorChave
    ? arr.sort((a, b) => String(a.chave).localeCompare(String(b.chave)))
    : arr.sort((a, b) => b.total - a.total);
}

// Um lançamento pode ter várias tags, então ele conta em cada uma.
// Por isso a soma das tags pode passar do total — é esperado.
function agruparPorTag(lista) {
  const mapa = {};
  for (const t of lista) {
    const tags = t.tags?.length ? t.tags : [SEM_TAG];
    for (const tag of tags) {
      mapa[tag] = mapa[tag] || { chave: tag, total: 0, qtd: 0 };
      mapa[tag].total += Math.abs(Number(t.valor) || 0);
      mapa[tag].qtd += 1;
    }
  }
  return Object.values(mapa).sort((a, b) => b.total - a.total);
}
