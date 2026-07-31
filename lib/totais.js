// Cálculo dos totais. Ponto único de verdade para "quanto entrou / quanto saiu".
//
// Regras do modelo:
//   - despesa       soma nas despesas
//   - receita       soma nas receitas
//   - estorno       ABATE despesa (é devolução de gasto, não é receita nova)
//   - transferência fica FORA de tudo (dinheiro trocando de bolso)

const abs = (t) => Math.abs(Number(t.valor) || 0);

export function calcularTotais(transacoes = []) {
  const soma = (tipo) => transacoes.filter((t) => t.tipo === tipo).reduce((s, t) => s + abs(t), 0);

  const receitas = soma("receita");
  const despesasBrutas = soma("despesa");
  const estornos = soma("estorno");
  const transferencias = soma("transferencia");
  const despesas = despesasBrutas - estornos;

  return {
    receitas,
    despesasBrutas,
    estornos,
    despesas,        // líquidas: já com o estorno abatido
    transferencias,  // informativo; não entra no saldo
    saldo: receitas - despesas,
  };
}

// Só o que é despesa de verdade — usado nos gráficos e rankings.
// Estornos ficam de fora porque pertencem à categoria "Receitas", e não
// dá para saber qual gasto específico eles devolvem.
export function apenasDespesas(transacoes = []) {
  return transacoes.filter((t) => t.tipo === "despesa");
}

// Agrupa despesas por categoria, do maior para o menor.
export function despesasPorCategoria(transacoes = []) {
  const grupos = {};
  for (const t of apenasDespesas(transacoes)) {
    const cat = t.categoria || "(sem categoria)";
    grupos[cat] = grupos[cat] || { total: 0, qtd: 0 };
    grupos[cat].total += abs(t);
    grupos[cat].qtd += 1;
  }
  return Object.entries(grupos).sort((a, b) => b[1].total - a[1].total);
}
