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

export async function listarTransacoesDoMes(chaveMes) {
  garantir();
  const { inicio, fim } = intervaloDoMes(chaveMes);
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .gte("data", inicio)
    .lt("data", fim)
    .order("data", { ascending: false });
  if (error) throw error;
  return data || [];
}

// Filtros: { categoria, tipo, status, de, ate, busca, apenasFixas }
export async function listarTransacoes(filtros = {}) {
  garantir();
  let q = supabase.from("transactions").select("*");

  if (filtros.categoria) q = q.eq("categoria", filtros.categoria);
  if (filtros.tipo) q = q.eq("tipo", filtros.tipo);
  if (filtros.status) q = q.eq("status", filtros.status);
  if (filtros.apenasFixas) q = q.eq("is_fixa", true);
  if (filtros.de) q = q.gte("data", filtros.de);
  if (filtros.ate) q = q.lte("data", filtros.ate);
  if (filtros.busca) q = q.ilike("descricao", `%${filtros.busca}%`);

  q = q.order("data", { ascending: false });
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
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

// Histórico de descrições -> sugestão de categoria (autocomplete inteligente).
export async function sugestoesPorHistorico() {
  garantir();
  const { data, error } = await supabase
    .from("transactions")
    .select("descricao, categoria, subcategoria");
  if (error) throw error;
  return data || [];
}
