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
// Cada matiz é uma variável CSS com um valor por tema (ver globals.css):
// o tom do modo escuro é escolhido para o fundo escuro, não é o claro clareado.
const CORES_CATEGORIA = {
  "Alimentação": "var(--cat-1)",         // azul
  "Transporte": "var(--cat-2)",          // laranja
  "Lazer": "var(--cat-3)",               // água
  "Assinaturas": "var(--cat-4)",         // amarelo
  "Doações e Presentes": "var(--cat-5)", // magenta
  "Receitas": "var(--cat-6)",            // verde
  "Eletrônicos": "var(--cat-7)",         // violeta
  "Vestuário": "var(--cat-8)",           // vermelho
};

// Reserva, caso apareça um nome fora da lista.
const PALETA = [
  "var(--cat-1)", "var(--cat-2)", "var(--cat-3)", "var(--cat-4)",
  "var(--cat-5)", "var(--cat-6)", "var(--cat-7)", "var(--cat-8)",
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
