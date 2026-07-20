"use client";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { corDaCategoria } from "../lib/categorias";
import { formatBRL } from "../lib/format";

// Gráfico de pizza: distribuição das SAÍDAS do mês por categoria.
export default function GraficoPizza({ transacoes }) {
  const saidas = transacoes.filter((t) => t.tipo === "saida");

  // Agrupa por categoria e soma.
  const soma = {};
  for (const t of saidas) {
    const cat = t.categoria || "Outros";
    soma[cat] = (soma[cat] || 0) + Math.abs(Number(t.valor) || 0);
  }
  const dados = Object.entries(soma)
    .map(([name, value], i) => ({ name, value, cor: corDaCategoria(name, i) }))
    .sort((a, b) => b.value - a.value);

  const total = dados.reduce((s, d) => s + d.value, 0);

  if (dados.length === 0) {
    return null;
  }

  return (
    <section className="mt-6 bg-white rounded-xl border border-neutral-200 p-4">
      <h2 className="font-semibold mb-1">Distribuição de gastos</h2>
      <p className="text-xs text-neutral-500 mb-2">Total de saídas: {formatBRL(total)}</p>
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={dados}
              cx="50%"
              cy="50%"
              outerRadius={90}
              innerRadius={45}
              dataKey="value"
              nameKey="name"
              label={({ percent }) => (percent > 0.06 ? `${(percent * 100).toFixed(0)}%` : "")}
              labelLine={false}
            >
              {dados.map((d) => (
                <Cell key={d.name} fill={d.cor} stroke="#fff" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [formatBRL(value), name]}
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e5e5", fontSize: 13 }}
            />
            <Legend
              formatter={(value) => <span className="text-xs text-neutral-600">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
