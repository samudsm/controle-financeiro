// Utilitários de mês. Trabalhamos com "chave de mês" no formato "YYYY-MM".

// Data de hoje em ISO local (sem UTC surpresa).
export function hojeISO() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

// "YYYY-MM" do mês atual.
export function mesAtual() {
  return hojeISO().slice(0, 7);
}

// Primeiro dia do mês (ISO) a partir da chave "YYYY-MM".
export function primeiroDiaDoMes(chave) {
  return `${chave}-01`;
}

// Avança/retrocede n meses a partir de "YYYY-MM".
export function deslocarMes(chave, n) {
  const [ano, mes] = chave.split("-").map(Number);
  const base = new Date(ano, mes - 1 + n, 1);
  const m = String(base.getMonth() + 1).padStart(2, "0");
  return `${base.getFullYear()}-${m}`;
}

const NOMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// "2026-07" -> "Julho 2026"
export function rotuloMes(chave) {
  const [ano, mes] = chave.split("-").map(Number);
  return `${NOMES[mes - 1]} ${ano}`;
}

// Intervalo [inicio, fim) em ISO para uma chave de mês — útil no filtro do Supabase.
export function intervaloDoMes(chave) {
  const inicio = primeiroDiaDoMes(chave);
  const fim = primeiroDiaDoMes(deslocarMes(chave, 1));
  return { inicio, fim };
}
