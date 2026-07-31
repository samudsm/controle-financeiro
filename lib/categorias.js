// Listas fechadas do novo modelo de classificação.
// As categorias e subcategorias vivem no banco (tabelas categorias/subcategorias),
// com chave estrangeira: subcategoria pertence a UMA categoria só.

// ---------- TIPO DE LANÇAMENTO ----------
// receita       = dinheiro que entra
// despesa       = dinheiro que sai
// transferencia = troca entre contas próprias; não é receita nem despesa
// estorno       = devolução de uma despesa anterior; ABATE despesa, não soma receita
export const TIPOS = [
  { valor: "despesa", rotulo: "Despesa" },
  { valor: "receita", rotulo: "Receita" },
  { valor: "estorno", rotulo: "Estorno" },
  { valor: "transferencia", rotulo: "Transferência" },
];

export const FORMAS_PAGAMENTO = [
  "Pix",
  "Dinheiro",
  "Débito",
  "Crédito à vista",
  "Crédito parcelado",
];

// ---------- HELPERS DE TIPO ----------
export const ehDespesa = (t) => t.tipo === "despesa";
export const ehReceita = (t) => t.tipo === "receita";
export const ehEstorno = (t) => t.tipo === "estorno";
export const ehTransferencia = (t) => t.tipo === "transferencia";

// Transferência não entra em nenhum total (é dinheiro andando de bolso pra bolso).
export const contaNoTotal = (t) => t.tipo !== "transferencia";

export function rotuloTipo(valor) {
  return TIPOS.find((t) => t.valor === valor)?.rotulo || valor;
}

// ---------- CORES DAS 8 CATEGORIAS OFICIAIS ----------
const CORES_CATEGORIA = {
  "Alimentação": "#FF6B6B",
  "Transporte": "#4ECDC4",
  "Vestuário": "#C55A11",
  "Lazer": "#FFD93D",
  "Assinaturas": "#95E1D3",
  "Doações e Presentes": "#B07AA1",
  "Eletrônicos": "#4472C4",
  "Receitas": "#70AD47",
};

// Reserva, caso apareça um nome fora da lista.
const PALETA = [
  "#4472C4", "#ED7D31", "#A5A5A5", "#5B9BD5", "#264478",
  "#9E480E", "#636363", "#997300", "#43682B", "#7F6000",
];

export function corDaCategoria(nome, indice = 0) {
  return CORES_CATEGORIA[nome] || PALETA[indice % PALETA.length];
}

// ---------- DETECÇÃO DE FATURA ----------
const PALAVRAS_FATURA = ["fatura", "cartão", "cartao", "inter", "crédito", "credito", "pagamento"];

export function pareceFatura(descricao) {
  const d = String(descricao || "").toLowerCase();
  return PALAVRAS_FATURA.some((p) => d.includes(p));
}
