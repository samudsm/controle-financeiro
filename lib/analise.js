// Análises da academia: volume por grupo, evolução, comparação de períodos,
// consistência e insights. Funções puras — recebem sessões, devolvem números.
import { volumeDasSeries, contaNoVolume, estimar1RM, formatarPeso, formatarVolume } from "./treino";

const abs = (n) => Math.abs(Number(n) || 0);

// Todas as séries válidas de um conjunto de sessões.
export function seriesDe(sessoes = []) {
  return sessoes.flatMap((s) => s.exercicios.flatMap((e) => e.series)).filter(contaNoVolume);
}

export function volumeDe(sessoes = []) {
  return sessoes.reduce((soma, s) => soma + volumeDasSeries(s.exercicios.flatMap((e) => e.series)), 0);
}

// Filtra sessões dentro de um intervalo [de, ate).
export function noPeriodo(sessoes = [], de, ate) {
  return sessoes.filter((s) => {
    const d = new Date(s.inicio);
    return d >= de && (!ate || d < ate);
  });
}

// ---------------- VOLUME POR GRUPO MUSCULAR (item 17) ----------------
// Precisa do mapa exercicioId -> grupo muscular, que vem da biblioteca.
export function volumePorGrupo(sessoes = [], grupoPorExercicio = {}) {
  const mapa = {};
  for (const s of sessoes) {
    for (const se of s.exercicios) {
      const grupo = grupoPorExercicio[se.exercicio_id] || "Outros";
      const validas = se.series.filter(contaNoVolume);
      if (validas.length === 0) continue;
      mapa[grupo] = mapa[grupo] || { grupo, series: 0, volume: 0 };
      mapa[grupo].series += validas.length;
      mapa[grupo].volume += validas.reduce((soma, x) => soma + abs(x.peso) * abs(x.reps), 0);
    }
  }
  return Object.values(mapa).sort((a, b) => b.series - a.series);
}

// ---------------- EVOLUÇÃO DE UM EXERCÍCIO (itens 15 e 18) ----------------
// Uma linha do tempo com o melhor 1RM, a maior carga e o volume de cada sessão.
export function evolucaoDoExercicio(historico = []) {
  return [...historico]
    .sort((a, b) => new Date(a.data) - new Date(b.data))
    .map((h) => {
      const validas = h.series.filter(contaNoVolume);
      const rm = validas.reduce((m, s) => Math.max(m, estimar1RM(s.peso, s.reps)), 0);
      const carga = validas.reduce((m, s) => Math.max(m, abs(s.peso)), 0);
      const volume = validas.reduce((soma, s) => soma + abs(s.peso) * abs(s.reps), 0);
      const reps = validas.reduce((soma, s) => soma + abs(s.reps), 0);
      return { data: h.data, rm, carga, volume, reps, series: validas.length };
    })
    .filter((p) => p.series > 0);
}

// ---------------- COMPARAÇÃO ENTRE PERÍODOS (item 33) ----------------
export function compararPeriodos(sessoes = [], dias = 30) {
  const agora = new Date();
  const inicioAtual = new Date(agora);
  inicioAtual.setDate(agora.getDate() - dias);
  const inicioAnterior = new Date(agora);
  inicioAnterior.setDate(agora.getDate() - dias * 2);

  const atual = noPeriodo(sessoes, inicioAtual, null);
  const anterior = noPeriodo(sessoes, inicioAnterior, inicioAtual);

  const medir = (lista) => {
    const series = seriesDe(lista);
    const volume = volumeDe(lista);
    const tempo = lista.reduce((s, x) => s + (Number(x.duracao_seg) || 0), 0);
    const cargas = series.map((s) => abs(s.peso)).filter((p) => p > 0);
    return {
      treinos: lista.length,
      series: series.length,
      volume,
      tempo,
      cargaMedia: cargas.length ? cargas.reduce((a, b) => a + b, 0) / cargas.length : 0,
    };
  };

  const a = medir(atual);
  const b = medir(anterior);

  return {
    dias,
    atual: a,
    anterior: b,
    variacao: {
      treinos: variacao(a.treinos, b.treinos),
      series: variacao(a.series, b.series),
      volume: variacao(a.volume, b.volume),
      tempo: variacao(a.tempo, b.tempo),
      cargaMedia: variacao(a.cargaMedia, b.cargaMedia),
    },
  };
}

// Variação percentual. null quando não há base de comparação.
export function variacao(atual, anterior) {
  if (!anterior) return atual > 0 ? null : 0;
  return ((atual - anterior) / anterior) * 100;
}

// ---------------- CONSISTÊNCIA (item 27) ----------------
export function consistencia(sessoes = [], metaSemanal = 4, semanas = 8) {
  const hoje = new Date();
  const inicioSemanaAtual = new Date(hoje);
  inicioSemanaAtual.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
  inicioSemanaAtual.setHours(0, 0, 0, 0);

  const linhas = [];
  for (let i = semanas - 1; i >= 0; i--) {
    const de = new Date(inicioSemanaAtual);
    de.setDate(de.getDate() - i * 7);
    const ate = new Date(de);
    ate.setDate(ate.getDate() + 7);
    const treinos = noPeriodo(sessoes, de, ate).length;
    linhas.push({
      inicio: de,
      treinos,
      meta: metaSemanal,
      bateu: treinos >= metaSemanal,
      atual: i === 0,
    });
  }

  const fechadas = linhas.filter((l) => !l.atual);
  const aderencia = fechadas.length
    ? (fechadas.filter((l) => l.bateu).length / fechadas.length) * 100
    : 0;

  // Semanas seguidas batendo a meta, contando de trás para frente.
  let seguidas = 0;
  for (let i = linhas.length - 1; i >= 0; i--) {
    if (linhas[i].atual && !linhas[i].bateu) continue; // a semana em curso ainda pode fechar
    if (linhas[i].bateu) seguidas++;
    else break;
  }

  return { semanas: linhas, aderencia, seguidas, metaSemanal };
}

// ---------------- INSIGHTS (item 47) ----------------
// Frases curtas e factuais. Nunca alteram nada sozinhas.
export function gerarInsights({ sessoes = [], exercicios = [], pesos = [], metaSemanal = 4 }) {
  const insights = [];
  if (sessoes.length === 0) return insights;

  const grupoPorExercicio = {};
  exercicios.forEach((e) => (grupoPorExercicio[e.id] = e.grupo_muscular));

  const comp = compararPeriodos(sessoes, 30);

  // Volume
  if (comp.anterior.treinos > 0 && comp.variacao.volume != null) {
    const v = comp.variacao.volume;
    if (Math.abs(v) >= 5) {
      insights.push({
        tipo: v > 0 ? "bom" : "atencao",
        texto: `Seu volume ${v > 0 ? "subiu" : "caiu"} ${Math.abs(v).toFixed(0)}% nos últimos 30 dias.`,
      });
    }
  }

  // Frequência
  if (comp.anterior.treinos > 0 && comp.atual.treinos !== comp.anterior.treinos) {
    const d = comp.atual.treinos - comp.anterior.treinos;
    insights.push({
      tipo: d > 0 ? "bom" : "atencao",
      texto: `${Math.abs(d)} treino${Math.abs(d) > 1 ? "s" : ""} ${d > 0 ? "a mais" : "a menos"} que nos 30 dias anteriores.`,
    });
  }

  // Grupo muscular com pouco estímulo na semana
  const inicioSemana = new Date();
  inicioSemana.setDate(inicioSemana.getDate() - ((inicioSemana.getDay() + 6) % 7));
  inicioSemana.setHours(0, 0, 0, 0);
  const daSemana = noPeriodo(sessoes, inicioSemana, null);
  const semanaPassadaDe = new Date(inicioSemana);
  semanaPassadaDe.setDate(semanaPassadaDe.getDate() - 7);
  const daSemanaPassada = noPeriodo(sessoes, semanaPassadaDe, inicioSemana);

  const gAtual = volumePorGrupo(daSemana, grupoPorExercicio);
  const gAnterior = volumePorGrupo(daSemanaPassada, grupoPorExercicio);
  gAnterior.forEach((ant) => {
    const at = gAtual.find((x) => x.grupo === ant.grupo);
    const seriesAgora = at?.series || 0;
    if (ant.series >= 6 && seriesAgora < ant.series * 0.6) {
      insights.push({
        tipo: "atencao",
        texto: `Menos séries de ${ant.grupo.toLowerCase()} esta semana: ${seriesAgora} contra ${ant.series} na anterior.`,
      });
    }
  });

  // Consistência
  const cons = consistencia(sessoes, metaSemanal);
  if (cons.seguidas >= 2) {
    insights.push({
      tipo: "bom",
      texto: `Você bateu a meta semanal por ${cons.seguidas} semanas seguidas.`,
    });
  }

  // Peso corporal
  if (pesos.length >= 2) {
    const ordenados = [...pesos].sort((a, b) => new Date(a.data) - new Date(b.data));
    const limite = new Date();
    limite.setDate(limite.getDate() - 30);
    const antigos = ordenados.filter((p) => new Date(p.data) <= limite);
    const base = antigos[antigos.length - 1] || ordenados[0];
    const atual = ordenados[ordenados.length - 1];
    const d = Number(atual.peso) - Number(base.peso);
    if (Math.abs(d) >= 0.5) {
      insights.push({
        tipo: "neutro",
        texto: `Peso corporal ${d > 0 ? "subiu" : "caiu"} ${formatarPeso(Math.abs(d))} kg desde ${formatarData(base.data)}.`,
      });
    }
  }

  return insights.slice(0, 6);
}

// ---------------- ESTATÍSTICAS GERAIS (item 26) ----------------
export function estatisticasGerais(sessoes = []) {
  const series = seriesDe(sessoes);
  const tempo = sessoes.reduce((s, x) => s + (Number(x.duracao_seg) || 0), 0);
  const volume = volumeDe(sessoes);
  const exercicios = new Set();
  sessoes.forEach((s) => s.exercicios.forEach((e) => e.exercicio_id && exercicios.add(e.exercicio_id)));

  return {
    treinos: sessoes.length,
    tempoTotal: tempo,
    tempoMedio: sessoes.length ? tempo / sessoes.length : 0,
    volumeTotal: volume,
    volumeMedio: sessoes.length ? volume / sessoes.length : 0,
    series: series.length,
    exercicios: exercicios.size,
  };
}

// Volume semana a semana, para o gráfico de tendência (item 16).
export function volumeSemanal(sessoes = [], semanas = 8) {
  const hoje = new Date();
  const inicioAtual = new Date(hoje);
  inicioAtual.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7));
  inicioAtual.setHours(0, 0, 0, 0);

  const linhas = [];
  for (let i = semanas - 1; i >= 0; i--) {
    const de = new Date(inicioAtual);
    de.setDate(de.getDate() - i * 7);
    const ate = new Date(de);
    ate.setDate(ate.getDate() + 7);
    const doPeriodo = noPeriodo(sessoes, de, ate);
    linhas.push({
      inicio: de,
      rotulo: `${String(de.getDate()).padStart(2, "0")}/${String(de.getMonth() + 1).padStart(2, "0")}`,
      volume: volumeDe(doPeriodo),
      treinos: doPeriodo.length,
      series: seriesDe(doPeriodo).length,
    });
  }
  return linhas;
}

function formatarData(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}
