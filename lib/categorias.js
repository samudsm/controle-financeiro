// Categorias padrão e detecção de fatura.

export const CATEGORIAS_PADRAO = [
  "Comida",
  "Combustível",
  "Streaming",
  "Entrada",
  "Reembolso",
  "Cartão Parcelado",
  "Presente",
  "Outros",
];

export const TIPOS = [
  { valor: "entrada", rotulo: "Entrada" },
  { valor: "saida", rotulo: "Saída" },
  { valor: "reembolso", rotulo: "Reembolso" },
];

// Cores das categorias padrão (iguais às do schema.sql).
const CORES_CATEGORIA = {
  Comida: "#FF6B6B",
  "Combustível": "#4ECDC4",
  Streaming: "#95E1D3",
  Entrada: "#70AD47",
  Reembolso: "#70AD47",
  "Cartão Parcelado": "#C55A11",
  Presente: "#FFD93D",
  Outros: "#E7E6E6",
};

// Paleta de reserva para categorias criadas pelo usuário.
const PALETA = [
  "#4472C4", "#ED7D31", "#A5A5A5", "#5B9BD5", "#264478",
  "#9E480E", "#636363", "#997300", "#43682B", "#7F6000",
];

export function corDaCategoria(nome, indice = 0) {
  return CORES_CATEGORIA[nome] || PALETA[indice % PALETA.length];
}

// Detecta se uma descrição parece ser uma fatura de cartão.
const PALAVRAS_FATURA = ["fatura", "cartão", "cartao", "inter", "crédito", "credito", "pagamento"];

export function pareceFatura(descricao) {
  const d = String(descricao || "").toLowerCase();
  return PALAVRAS_FATURA.some((p) => d.includes(p));
}
