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
// Paleta validada para daltonismo e contraste sobre fundo branco.
// A cor pertence à CATEGORIA, não à posição dela no ranking — filtrar
// ou reordenar um gráfico nunca repinta as categorias restantes.
//
// A paleta anterior reprovava: #FFD93D tinha contraste 1,34:1 (invisível no
// branco) e #95E1D3 / #B07AA1 ficavam abaixo do piso de saturação (liam como
// cinza). Esta passa em todos os testes; três cores ficam abaixo de 3:1, e por
// isso todo gráfico traz rótulo com nome e valor — a cor nunca é o único canal.
const CORES_CATEGORIA = {
  "Alimentação": "#2a78d6",         // azul
  "Transporte": "#eb6834",          // laranja
  "Lazer": "#1baf7a",               // água
  "Assinaturas": "#eda100",         // amarelo
  "Doações e Presentes": "#e87ba4", // magenta
  "Receitas": "#008300",            // verde
  "Eletrônicos": "#4a3aa7",         // violeta
  "Vestuário": "#e34948",           // vermelho
};

// Reserva, caso apareça um nome fora da lista.
const PALETA = [
  "#2a78d6", "#eb6834", "#1baf7a", "#eda100",
  "#e87ba4", "#008300", "#4a3aa7", "#e34948",
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
