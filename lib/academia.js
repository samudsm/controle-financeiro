// Acesso ao banco do módulo academia. Todas as queries passam por aqui.
import { supabase, supabaseConfigurado } from "./supabase";

function garantir() {
  if (!supabaseConfigurado) {
    throw new Error("Supabase não configurado. Preencha o .env.local.");
  }
}

// ---------------- CONFIGURAÇÕES ----------------

export async function obterConfig() {
  garantir();
  const { data, error } = await supabase.from("academia_config").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return data || { unidade: "kg", esforco: "nenhum", incremento_padrao: 2.5, descanso_padrao: 90, meta_semanal: 4 };
}

export async function salvarConfig(campos) {
  garantir();
  const { data, error } = await supabase
    .from("academia_config")
    .update(campos)
    .eq("id", 1)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------------- EXERCÍCIOS ----------------

export async function listarExercicios() {
  garantir();
  const { data, error } = await supabase.from("academia_exercicios").select("*").order("nome");
  if (error) throw error;
  return data || [];
}

export async function criarExercicio(ex) {
  garantir();
  const { data, error } = await supabase.from("academia_exercicios").insert(ex).select().single();
  if (error) throw error;
  return data;
}

export async function atualizarExercicio(id, campos) {
  garantir();
  const { data, error } = await supabase
    .from("academia_exercicios")
    .update(campos)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------------- FICHAS ----------------

const SELECT_FICHA =
  "*, academia_ficha_exercicios(*, academia_exercicios(id, nome, grupo_muscular, equipamento, notas))";

export async function listarFichas() {
  garantir();
  const { data, error } = await supabase
    .from("academia_fichas")
    .select(SELECT_FICHA)
    .eq("arquivada", false)
    .order("ordem");
  if (error) throw error;
  return (data || []).map(normalizarFicha);
}

export async function obterFicha(id) {
  garantir();
  const { data, error } = await supabase.from("academia_fichas").select(SELECT_FICHA).eq("id", id).single();
  if (error) throw error;
  return normalizarFicha(data);
}

// Ordena os exercícios e simplifica o nome do campo aninhado.
function normalizarFicha(f) {
  if (!f) return f;
  const exs = (f.academia_ficha_exercicios || [])
    .map((fe) => ({ ...fe, exercicio: fe.academia_exercicios }))
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  return { ...f, exercicios: exs };
}

export async function criarFicha({ nome, descricao, programa_id = null }) {
  garantir();
  const { data, error } = await supabase
    .from("academia_fichas")
    .insert({ nome, descricao, programa_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function atualizarFicha(id, campos) {
  garantir();
  const { data, error } = await supabase.from("academia_fichas").update(campos).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deletarFicha(id) {
  garantir();
  const { error } = await supabase.from("academia_fichas").delete().eq("id", id);
  if (error) throw error;
}

// Copia uma ficha inteira, com os exercícios configurados (item 37).
export async function duplicarFicha(id, novoNome) {
  garantir();
  const original = await obterFicha(id);
  const nova = await criarFicha({
    nome: novoNome || `${original.nome} (cópia)`,
    descricao: original.descricao,
    programa_id: original.programa_id,
  });
  if (original.exercicios.length) {
    const linhas = original.exercicios.map((e) => ({
      ficha_id: nova.id,
      exercicio_id: e.exercicio_id,
      ordem: e.ordem,
      series_alvo: e.series_alvo,
      reps_min: e.reps_min,
      reps_max: e.reps_max,
      descanso_seg: e.descanso_seg,
      superset_grupo: e.superset_grupo,
      observacoes: e.observacoes,
    }));
    const { error } = await supabase.from("academia_ficha_exercicios").insert(linhas);
    if (error) throw error;
  }
  return nova;
}

export async function adicionarExercicioNaFicha(ficha_id, exercicio_id, config = {}) {
  garantir();
  const { data: existentes } = await supabase
    .from("academia_ficha_exercicios")
    .select("ordem")
    .eq("ficha_id", ficha_id);
  const ordem = (existentes || []).reduce((m, e) => Math.max(m, e.ordem ?? 0), -1) + 1;

  const { data, error } = await supabase
    .from("academia_ficha_exercicios")
    .insert({
      ficha_id,
      exercicio_id,
      ordem,
      series_alvo: config.series_alvo ?? 3,
      reps_min: config.reps_min ?? 8,
      reps_max: config.reps_max ?? 12,
      descanso_seg: config.descanso_seg ?? 90,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function atualizarFichaExercicio(id, campos) {
  garantir();
  const { data, error } = await supabase
    .from("academia_ficha_exercicios")
    .update(campos)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removerExercicioDaFicha(id) {
  garantir();
  const { error } = await supabase.from("academia_ficha_exercicios").delete().eq("id", id);
  if (error) throw error;
}

// ---------------- SESSÕES ----------------

const SELECT_SESSAO = "*, academia_sessao_exercicios(*, academia_series(*))";

function normalizarSessao(s) {
  if (!s) return s;
  const exs = (s.academia_sessao_exercicios || [])
    .map((se) => ({
      ...se,
      series: (se.academia_series || []).sort((a, b) => a.numero - b.numero),
    }))
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  return { ...s, exercicios: exs };
}

// Cria a sessão copiando o que a ficha tem HOJE. A partir daqui a sessão é
// independente: mexer na ficha depois não altera este treino.
export async function iniciarSessaoDeFicha(fichaId) {
  garantir();
  const ficha = await obterFicha(fichaId);

  const { data: sessao, error } = await supabase
    .from("academia_sessoes")
    .insert({ ficha_id: ficha.id, nome: ficha.nome })
    .select()
    .single();
  if (error) throw error;

  if (ficha.exercicios.length) {
    const linhas = ficha.exercicios.map((e, i) => ({
      sessao_id: sessao.id,
      exercicio_id: e.exercicio_id,
      nome: e.exercicio?.nome || "Exercício",
      ordem: e.ordem ?? i,
      descanso_seg: e.descanso_seg ?? 90,
      observacoes: e.observacoes,
    }));
    const { data: criados, error: e2 } = await supabase
      .from("academia_sessao_exercicios")
      .insert(linhas)
      .select();
    if (e2) throw e2;

    // Cria as séries em branco conforme o planejado na ficha.
    const series = [];
    criados.forEach((se) => {
      const conf = ficha.exercicios.find((x) => x.exercicio_id === se.exercicio_id);
      const qtd = conf?.series_alvo ?? 3;
      for (let n = 1; n <= qtd; n++) {
        series.push({ sessao_exercicio_id: se.id, numero: n, tipo: "normal", concluida: false });
      }
    });
    if (series.length) {
      const { error: e3 } = await supabase.from("academia_series").insert(series);
      if (e3) throw e3;
    }
  }

  return sessao;
}

export async function iniciarSessaoVazia(nome = "Treino livre") {
  garantir();
  const { data, error } = await supabase
    .from("academia_sessoes")
    .insert({ nome })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function obterSessao(id) {
  garantir();
  const { data, error } = await supabase.from("academia_sessoes").select(SELECT_SESSAO).eq("id", id).single();
  if (error) throw error;
  return normalizarSessao(data);
}

// A sessão em andamento (se houver). Só pode existir uma por vez.
export async function sessaoEmAndamento() {
  garantir();
  const { data, error } = await supabase
    .from("academia_sessoes")
    .select("*")
    .eq("finalizada", false)
    .order("inicio", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

export async function listarSessoes({ limite = 50 } = {}) {
  garantir();
  const { data, error } = await supabase
    .from("academia_sessoes")
    .select(SELECT_SESSAO)
    .eq("finalizada", true)
    .order("inicio", { ascending: false })
    .limit(limite);
  if (error) throw error;
  return (data || []).map(normalizarSessao);
}

export async function finalizarSessao(id, { notas } = {}) {
  garantir();
  const sessao = await obterSessao(id);
  const fim = new Date();
  const duracao = Math.round((fim - new Date(sessao.inicio)) / 1000);

  const { data, error } = await supabase
    .from("academia_sessoes")
    .update({ fim: fim.toISOString(), duracao_seg: duracao, finalizada: true, notas: notas ?? sessao.notas })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletarSessao(id) {
  garantir();
  const { error } = await supabase.from("academia_sessoes").delete().eq("id", id);
  if (error) throw error;
}

export async function adicionarExercicioNaSessao(sessaoId, exercicio, { series = 3, descanso = 90 } = {}) {
  garantir();
  const { data: existentes } = await supabase
    .from("academia_sessao_exercicios")
    .select("ordem")
    .eq("sessao_id", sessaoId);
  const ordem = (existentes || []).reduce((m, e) => Math.max(m, e.ordem ?? 0), -1) + 1;

  const { data: se, error } = await supabase
    .from("academia_sessao_exercicios")
    .insert({
      sessao_id: sessaoId,
      exercicio_id: exercicio.id,
      nome: exercicio.nome,
      ordem,
      descanso_seg: descanso,
    })
    .select()
    .single();
  if (error) throw error;

  const linhas = [];
  for (let n = 1; n <= series; n++) {
    linhas.push({ sessao_exercicio_id: se.id, numero: n, tipo: "normal", concluida: false });
  }
  const { error: e2 } = await supabase.from("academia_series").insert(linhas);
  if (e2) throw e2;

  return se;
}

export async function removerExercicioDaSessao(id) {
  garantir();
  const { error } = await supabase.from("academia_sessao_exercicios").delete().eq("id", id);
  if (error) throw error;
}

export async function atualizarSessaoExercicio(id, campos) {
  garantir();
  const { data, error } = await supabase
    .from("academia_sessao_exercicios")
    .update(campos)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------------- SÉRIES ----------------

export async function salvarSerie(id, campos) {
  garantir();
  const { data, error } = await supabase.from("academia_series").update(campos).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function adicionarSerie(sessaoExercicioId, numero, tipo = "normal") {
  garantir();
  const { data, error } = await supabase
    .from("academia_series")
    .insert({ sessao_exercicio_id: sessaoExercicioId, numero, tipo, concluida: false })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletarSerie(id) {
  garantir();
  const { error } = await supabase.from("academia_series").delete().eq("id", id);
  if (error) throw error;
}

// ---------------- HISTÓRICO DO EXERCÍCIO (o coração do app) ----------------

// Todas as execuções anteriores de um exercício, da mais recente para a mais
// antiga. Ignora a sessão atual, para comparar com o passado de verdade.
export async function historicoDoExercicio(exercicioId, { ignorarSessaoId = null, limite = 30 } = {}) {
  garantir();
  if (!exercicioId) return [];

  const { data, error } = await supabase
    .from("academia_sessao_exercicios")
    .select("id, nome, sessao_id, academia_sessoes!inner(id, nome, inicio, finalizada), academia_series(*)")
    .eq("exercicio_id", exercicioId)
    .eq("academia_sessoes.finalizada", true)
    .order("inicio", { referencedTable: "academia_sessoes", ascending: false })
    .limit(limite);
  if (error) throw error;

  return (data || [])
    .map((se) => ({
      sessaoExercicioId: se.id,
      sessaoId: se.sessao_id,
      sessaoNome: se.academia_sessoes?.nome,
      data: se.academia_sessoes?.inicio,
      series: (se.academia_series || []).sort((a, b) => a.numero - b.numero),
    }))
    .filter((x) => x.sessaoId !== ignorarSessaoId && x.series.some((s) => s.concluida))
    .sort((a, b) => new Date(b.data) - new Date(a.data));
}

// Todas as séries já feitas neste exercício (para recordes).
export async function todasSeriesDoExercicio(exercicioId, { ignorarSessaoId = null } = {}) {
  const hist = await historicoDoExercicio(exercicioId, { ignorarSessaoId, limite: 200 });
  return hist.flatMap((h) => h.series);
}

// ---------------- ESTATÍSTICAS DO PAINEL ----------------

export async function estatisticas({ desde } = {}) {
  garantir();
  let q = supabase
    .from("academia_sessoes")
    .select("id, nome, inicio, duracao_seg, academia_sessao_exercicios(id, nome, academia_series(*))")
    .eq("finalizada", true)
    .order("inicio", { ascending: false });
  if (desde) q = q.gte("inicio", desde);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(normalizarSessao);
}
