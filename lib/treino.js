// Cálculos do módulo academia. Funções puras — nada de banco aqui.

export const TIPOS_SERIE = [
  { valor: "aquecimento", rotulo: "Aquecimento", curto: "A", conta: false },
  { valor: "normal", rotulo: "Série válida", curto: "", conta: true },
  { valor: "falha", rotulo: "Até a falha", curto: "F", conta: true },
  { valor: "dropset", rotulo: "Drop set", curto: "D", conta: true },
  { valor: "backoff", rotulo: "Back-off", curto: "B", conta: true },
  { valor: "top", rotulo: "Top set", curto: "T", conta: true },
  { valor: "amrap", rotulo: "AMRAP", curto: "M", conta: true },
];

export const GRUPOS_MUSCULARES = [
  "Peito", "Costas", "Ombros", "Bíceps", "Tríceps",
  "Quadríceps", "Posterior de coxa", "Glúteos", "Panturrilha",
  "Abdômen", "Antebraço", "Cardio", "Outros",
];

export const EQUIPAMENTOS = [
  "Barra", "Halteres", "Máquina", "Cabo/polia", "Smith",
  "Peso corporal", "Anilha", "Kettlebell", "Elástico", "Outro",
];

// Aquecimento não conta para volume nem para recorde.
export const contaNoVolume = (s) =>
  s.concluida && s.tipo !== "aquecimento" && Number(s.peso) > 0 && Number(s.reps) > 0;

// Volume = peso × repetições, somado.
export function volumeDasSeries(series = []) {
  return series
    .filter(contaNoVolume)
    .reduce((soma, s) => soma + Number(s.peso) * Number(s.reps), 0);
}

// 1RM estimado pela fórmula de Epley: peso × (1 + reps/30).
// Acima de ~12 repetições a estimativa perde precisão, então limitamos.
export function estimar1RM(peso, reps) {
  const p = Number(peso) || 0;
  const r = Number(reps) || 0;
  if (p <= 0 || r <= 0) return 0;
  if (r === 1) return p;
  if (r > 12) return 0; // não estima a partir de série muito longa
  return p * (1 + r / 30);
}

// O melhor 1RM estimado de um conjunto de séries.
export function melhor1RM(series = []) {
  return series.filter(contaNoVolume).reduce((max, s) => {
    const e = estimar1RM(s.peso, s.reps);
    return e > max ? e : max;
  }, 0);
}

// A série mais pesada (desempate por repetições).
export function melhorSerie(series = []) {
  return series.filter(contaNoVolume).reduce((melhor, s) => {
    if (!melhor) return s;
    const pesoAtual = Number(s.peso), pesoMelhor = Number(melhor.peso);
    if (pesoAtual > pesoMelhor) return s;
    if (pesoAtual === pesoMelhor && Number(s.reps) > Number(melhor.reps)) return s;
    return melhor;
  }, null);
}

export function maiorCarga(series = []) {
  return series.filter(contaNoVolume).reduce((m, s) => Math.max(m, Number(s.peso)), 0);
}

// Compara a série de hoje com a mesma série da sessão anterior.
// Retorna null quando não há com o que comparar.
export function compararSerie(hoje, anterior) {
  if (!hoje || !anterior) return null;
  const pHoje = Number(hoje.peso) || 0, pAnt = Number(anterior.peso) || 0;
  const rHoje = Number(hoje.reps) || 0, rAnt = Number(anterior.reps) || 0;
  if (!pHoje || !rHoje) return null;

  if (pHoje > pAnt) {
    return { direcao: "subiu", texto: `+${formatarPeso(pHoje - pAnt)} kg de carga` };
  }
  if (pHoje < pAnt) {
    return { direcao: "desceu", texto: `−${formatarPeso(pAnt - pHoje)} kg de carga` };
  }
  // Mesma carga: compara repetições.
  if (rHoje > rAnt) {
    const d = rHoje - rAnt;
    return { direcao: "subiu", texto: `+${d} repetiç${d === 1 ? "ão" : "ões"}` };
  }
  if (rHoje < rAnt) {
    const d = rAnt - rHoje;
    return { direcao: "desceu", texto: `−${d} repetiç${d === 1 ? "ão" : "ões"}` };
  }
  return { direcao: "igual", texto: "igual à última vez" };
}

// Recordes desta sessão contra todo o histórico anterior do exercício.
export function detectarRecordes(seriesHoje = [], historicoAnterior = []) {
  const validas = seriesHoje.filter(contaNoVolume);
  if (validas.length === 0) return [];

  const antes = historicoAnterior.filter(contaNoVolume);
  const recordes = [];

  const cargaAntes = maiorCarga(antes);
  const cargaHoje = maiorCarga(validas);
  if (cargaHoje > cargaAntes && cargaAntes > 0) {
    recordes.push({ tipo: "carga", texto: `Maior carga: ${formatarPeso(cargaHoje)} kg`, anterior: `${formatarPeso(cargaAntes)} kg` });
  }

  const rmAntes = melhor1RM(antes);
  const rmHoje = melhor1RM(validas);
  if (rmHoje > rmAntes && rmAntes > 0) {
    recordes.push({ tipo: "1rm", texto: `1RM estimado: ${formatarPeso(rmHoje)} kg`, anterior: `${formatarPeso(rmAntes)} kg` });
  }

  // Mais repetições com a mesma carga (ou maior).
  const melhorHoje = melhorSerie(validas);
  if (melhorHoje) {
    const mesmaCarga = antes.filter((s) => Number(s.peso) === Number(melhorHoje.peso));
    const repsAntes = mesmaCarga.reduce((m, s) => Math.max(m, Number(s.reps)), 0);
    if (repsAntes > 0 && Number(melhorHoje.reps) > repsAntes) {
      recordes.push({
        tipo: "reps",
        texto: `${formatarPeso(melhorHoje.peso)} kg × ${melhorHoje.reps}`,
        anterior: `${formatarPeso(melhorHoje.peso)} kg × ${repsAntes}`,
      });
    }
  }

  return recordes;
}

// "82.5" -> "82,5" · "80.0" -> "80"
export function formatarPeso(v) {
  const n = Number(v) || 0;
  const s = n % 1 === 0 ? String(n) : n.toFixed(1);
  return s.replace(".", ",");
}

// 3785 -> "3.785 kg"
export function formatarVolume(v) {
  return `${Math.round(Number(v) || 0).toLocaleString("pt-BR")} kg`;
}

// 4325 -> "1h12min" · 320 -> "5min"
export function formatarDuracao(segundos) {
  const s = Math.max(0, Math.round(Number(segundos) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}min`;
  if (m > 0) return `${m}min`;
  return `${s}s`;
}

// 95 -> "01:35" (cronômetro)
export function formatarCronometro(segundos) {
  const s = Math.max(0, Math.round(Number(segundos) || 0));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// Sugestão de progressão (item 19): bateu o topo da meta em todas as séries?
export function sugerirProgressao(series = [], repsMax, incremento = 2.5) {
  if (!repsMax) return null;
  const validas = series.filter(contaNoVolume);
  if (validas.length === 0) return null;
  const todasNoTopo = validas.every((s) => Number(s.reps) >= repsMax);
  if (!todasNoTopo) return null;
  const carga = maiorCarga(validas);
  if (!carga) return null;
  return {
    proximaCarga: carga + Number(incremento),
    texto: `Meta atingida em todas as séries. No próximo treino, considere ${formatarPeso(
      carga + Number(incremento)
    )} kg.`,
  };
}

// Séries de aquecimento sugeridas para uma carga de trabalho (item 12).
export function sugerirAquecimento(cargaTrabalho, pesoBarra = 20) {
  const alvo = Number(cargaTrabalho) || 0;
  if (alvo <= 0) return [];
  const degraus = [
    { pct: 0, reps: 15, rotulo: "Barra" },
    { pct: 0.4, reps: 10 },
    { pct: 0.6, reps: 6 },
    { pct: 0.8, reps: 3 },
    { pct: 0.9, reps: 1 },
  ];
  return degraus
    .map((d) => ({
      peso: d.pct === 0 ? pesoBarra : arredondarPara(alvo * d.pct, 2.5),
      reps: d.reps,
      rotulo: d.rotulo,
    }))
    .filter((d) => d.peso < alvo && d.peso > 0);
}

// Anilhas de cada lado para atingir uma carga (item 13).
export function calcularAnilhas(alvo, pesoBarra = 20, disponiveis = [20, 15, 10, 5, 2.5, 1.25]) {
  const total = Number(alvo) || 0;
  if (total < pesoBarra) return { possivel: false, lado: [], sobra: 0 };
  let porLado = (total - pesoBarra) / 2;
  const lado = [];
  for (const a of [...disponiveis].sort((x, y) => y - x)) {
    while (porLado >= a - 0.001) {
      lado.push(a);
      porLado -= a;
    }
  }
  return { possivel: porLado < 0.001, lado, sobra: porLado * 2 };
}

export function arredondarPara(valor, passo) {
  const p = Number(passo) || 1;
  return Math.round(Number(valor) / p) * p;
}
