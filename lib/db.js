// Camada de acesso ao Supabase. Todas as queries do app passam por aqui.
import { supabase, supabaseConfigurado } from "./supabase";
import { intervaloDoMes } from "./dates";

function garantir() {
  if (!supabaseConfigurado) {
    throw new Error(
      "Supabase não configurado. Preencha .env.local com NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
}

// ---------------- TRANSAÇÕES ----------------

// Traz o lançamento junto com as tags ligadas a ele.
const SELECT_TRANSACAO = "*, transacao_tags(tags(id, nome))";

// Achata as tags numa lista simples de nomes: t.tags = ["América", "Destine"]
function comTags(t) {
  return {
    ...t,
    tags: (t.transacao_tags || []).map((x) => x.tags?.nome).filter(Boolean).sort(),
  };
}

export async function listarTransacoesDoMes(chaveMes) {
  garantir();
  const { inicio, fim } = intervaloDoMes(chaveMes);
  const { data, error } = await supabase
    .from("transactions")
    .select(SELECT_TRANSACAO)
    .gte("data", inicio)
    .lt("data", fim)
    .order("data", { ascending: false });
  if (error) throw error;
  return (data || []).map(comTags);
}

// Filtros: { categoria, tipo, status, de, ate, busca, apenasFixas, tag, estabelecimento }
export async function listarTransacoes(filtros = {}) {
  garantir();
  let q = supabase.from("transactions").select(SELECT_TRANSACAO);

  if (filtros.categoria) q = q.eq("categoria", filtros.categoria);
  if (filtros.subcategoria) q = q.eq("subcategoria", filtros.subcategoria);
  if (filtros.tipo) q = q.eq("tipo", filtros.tipo);
  if (filtros.status) q = q.eq("status", filtros.status);
  if (filtros.formaPagamento) q = q.eq("forma_pagamento", filtros.formaPagamento);
  if (filtros.estabelecimento) q = q.eq("estabelecimento", filtros.estabelecimento);
  if (filtros.apenasFixas) q = q.eq("is_fixa", true);
  if (filtros.de) q = q.gte("data", filtros.de);
  if (filtros.ate) q = q.lte("data", filtros.ate);
  if (filtros.busca) q = q.ilike("descricao", `%${filtros.busca}%`);

  q = q.order("data", { ascending: false });
  const { data, error } = await q;
  if (error) throw error;

  const lista = (data || []).map(comTags);
  // Filtro por tag é feito aqui (a query acima já trouxe as tags de cada lançamento).
  return filtros.tag ? lista.filter((t) => t.tags.includes(filtros.tag)) : lista;
}

// Todas as transações (para detecção de duplicatas no upload).
export async function listarTodasTransacoes() {
  garantir();
  const { data, error } = await supabase
    .from("transactions")
    .select("data, descricao, valor");
  if (error) throw error;
  return data || [];
}

export async function criarTransacao(t) {
  garantir();
  const { data, error } = await supabase.from("transactions").insert(t).select().single();
  if (error) throw error;
  return data;
}

export async function criarTransacoes(lista) {
  garantir();
  const { data, error } = await supabase.from("transactions").insert(lista).select();
  if (error) throw error;
  return data || [];
}

export async function atualizarTransacao(id, campos) {
  garantir();
  const { data, error } = await supabase
    .from("transactions")
    .update({ ...campos, data_atualizacao: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletarTransacao(id) {
  garantir();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}

// Antecipar parcelas: move as parcelas futuras (> numeroAtual) para o mês/data indicados.
export async function anteciparParcelas({ descricao, parcelaTotal, numeroAtual, novaData }) {
  garantir();
  const { data, error } = await supabase
    .from("transactions")
    .update({ data: novaData, antecipado: true, data_atualizacao: new Date().toISOString() })
    .eq("descricao", descricao)
    .eq("parcela_total", parcelaTotal)
    .gt("parcela_numero", numeroAtual)
    .select();
  if (error) throw error;
  return data || [];
}

// Editar gasto fixo em lote (a partir de uma data, ou tudo).
// modo: 'apenas' | 'apartir' | 'todos'
export async function atualizarGastoFixo({ descricao, novoValor, modo, aPartirDe, idAtual }) {
  garantir();
  if (modo === "apenas") {
    return atualizarTransacao(idAtual, { valor: novoValor });
  }
  let q = supabase
    .from("transactions")
    .update({ valor: novoValor, data_atualizacao: new Date().toISOString() })
    .eq("descricao", descricao)
    .eq("is_fixa", true);
  if (modo === "apartir" && aPartirDe) q = q.gte("data", aPartirDe);
  const { data, error } = await q.select();
  if (error) throw error;
  return data || [];
}

// ---------------- PENDÊNCIAS ----------------

export async function listarPendenciasDoMes(chaveMes) {
  garantir();
  const { data, error } = await supabase
    .from("pendencias")
    .select("*")
    .eq("mes_referencia", chaveMes)
    .order("tipo", { ascending: false })
    .order("valor", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function criarPendencia(p) {
  garantir();
  const { data, error } = await supabase.from("pendencias").insert(p).select().single();
  if (error) throw error;
  return data;
}

export async function atualizarPendencia(id, campos) {
  garantir();
  const { data, error } = await supabase
    .from("pendencias")
    .update(campos)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletarPendencia(id) {
  garantir();
  const { error } = await supabase.from("pendencias").delete().eq("id", id);
  if (error) throw error;
}

// ---------------- CATEGORIAS / SUBCATEGORIAS ----------------

export async function listarCategorias() {
  garantir();
  const { data, error } = await supabase.from("categorias").select("*").order("nome");
  if (error) throw error;
  return data || [];
}

export async function criarCategoria(nome, tipo = "despesa") {
  garantir();
  const { data, error } = await supabase
    .from("categorias")
    .insert({ nome, tipo })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listarSubcategorias(categoriaId) {
  garantir();
  const { data, error } = await supabase
    .from("subcategorias")
    .select("*")
    .eq("categoria_id", categoriaId)
    .order("nome");
  if (error) throw error;
  return data || [];
}

// Todas as subcategorias de uma vez, já com o nome da categoria dona.
// É isso que permite o seletor filtrar sem ir ao banco a cada troca.
export async function listarTodasSubcategorias() {
  garantir();
  const { data, error } = await supabase
    .from("subcategorias")
    .select("id, nome, categoria_id, categorias(nome)")
    .order("nome");
  if (error) throw error;
  return (data || []).map((s) => ({
    id: s.id,
    nome: s.nome,
    categoria_id: s.categoria_id,
    categoria: s.categorias?.nome || null,
  }));
}

export async function criarSubcategoria(categoriaId, nome) {
  garantir();
  const { data, error } = await supabase
    .from("subcategorias")
    .insert({ categoria_id: categoriaId, nome })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------------- TAGS ----------------

export async function listarTags() {
  garantir();
  const { data, error } = await supabase.from("tags").select("*").order("nome");
  if (error) throw error;
  return data || [];
}

export async function criarTag(nome) {
  garantir();
  const { data, error } = await supabase
    .from("tags")
    .insert({ nome })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Substitui TODAS as tags de um lançamento pelas informadas (por nome).
// Cria as que ainda não existirem.
export async function definirTagsDaTransacao(transacaoId, nomes = []) {
  garantir();
  const limpos = [...new Set(nomes.map((n) => String(n).trim()).filter(Boolean))];

  // Garante que cada tag exista e pega os ids.
  const ids = [];
  for (const nome of limpos) {
    const { data: achada } = await supabase.from("tags").select("id").eq("nome", nome).maybeSingle();
    if (achada) {
      ids.push(achada.id);
    } else {
      const nova = await criarTag(nome);
      ids.push(nova.id);
    }
  }

  // Apaga as ligações antigas e grava as novas.
  const { error: eDel } = await supabase
    .from("transacao_tags")
    .delete()
    .eq("transacao_id", transacaoId);
  if (eDel) throw eDel;

  if (ids.length) {
    const { error: eIns } = await supabase
      .from("transacao_tags")
      .insert(ids.map((tag_id) => ({ transacao_id: transacaoId, tag_id })));
    if (eIns) throw eIns;
  }
  return limpos;
}

// ---------------- ESTABELECIMENTOS ----------------

export async function listarEstabelecimentos() {
  garantir();
  const { data, error } = await supabase.from("estabelecimentos").select("*").order("nome");
  if (error) throw error;
  return data || [];
}

export async function criarEstabelecimento(nome) {
  garantir();
  const { data, error } = await supabase
    .from("estabelecimentos")
    .insert({ nome })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------------- IGNORADOS NA IMPORTAÇÃO ----------------
// Regras que fazem um lançamento sumir da lista de importação.
// 'lancamento' = aquele exato (data + descrição + valor).
// 'descricao'  = qualquer um com aquela descrição, em qualquer data.

const normalizar = (s) => String(s || "").toLowerCase().trim().replace(/\s+/g, " ");

export function chaveIgnorarLancamento({ data, descricao, valor }) {
  return `${data}|${normalizar(descricao)}|${Number(valor).toFixed(2)}`;
}

export function chaveIgnorarDescricao(descricao) {
  return normalizar(descricao);
}

export async function listarIgnorados() {
  garantir();
  const { data, error } = await supabase
    .from("importacoes_ignoradas")
    .select("*")
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function ignorarLancamento({ data, descricao, valor }) {
  garantir();
  const { data: linha, error } = await supabase
    .from("importacoes_ignoradas")
    .upsert(
      {
        criterio: "lancamento",
        chave: chaveIgnorarLancamento({ data, descricao, valor }),
        rotulo: `${descricao} — ${data}`,
      },
      { onConflict: "criterio,chave" }
    )
    .select()
    .single();
  if (error) throw error;
  return linha;
}

export async function ignorarDescricao(descricao) {
  garantir();
  const { data: linha, error } = await supabase
    .from("importacoes_ignoradas")
    .upsert(
      {
        criterio: "descricao",
        chave: chaveIgnorarDescricao(descricao),
        rotulo: descricao,
      },
      { onConflict: "criterio,chave" }
    )
    .select()
    .single();
  if (error) throw error;
  return linha;
}

export async function removerIgnorado(id) {
  garantir();
  const { error } = await supabase.from("importacoes_ignoradas").delete().eq("id", id);
  if (error) throw error;
}

// Monta os dois conjuntos de comparação a partir das regras salvas.
export function conjuntosDeIgnorados(regras = []) {
  return {
    lancamentos: new Set(regras.filter((r) => r.criterio === "lancamento").map((r) => r.chave)),
    descricoes: new Set(regras.filter((r) => r.criterio === "descricao").map((r) => r.chave)),
  };
}

// ---------------- HISTÓRICO (autocomplete inteligente) ----------------

export async function sugestoesPorHistorico() {
  garantir();
  const { data, error } = await supabase
    .from("transactions")
    .select("descricao, categoria, subcategoria, estabelecimento, forma_pagamento");
  if (error) throw error;
  return data || [];
}
