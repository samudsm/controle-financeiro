// Formatação de valores e datas em pt-BR.

export function formatBRL(valor) {
  const n = Number(valor) || 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Valor com sinal conforme o tipo (entrada/reembolso = +, saída = -).
export function valorComSinal(t) {
  const n = Math.abs(Number(t.valor) || 0);
  const negativo = t.tipo === "saida";
  return negativo ? -n : n;
}

// "2026-07-20" -> "20/07/2026"
export function formatData(iso) {
  if (!iso) return "";
  const [ano, mes, dia] = String(iso).slice(0, 10).split("-");
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
}

// "20/07/2026" -> "2026-07-20" (ISO). Retorna null se inválido.
export function dataBRparaISO(br) {
  const m = String(br).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dia, mes, ano] = m;
  return `${ano}-${mes}-${dia}`;
}
