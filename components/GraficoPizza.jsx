"use client";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { corDaCategoria } from "../lib/categorias";
import { apenasDespesas } from "../lib/totais";
import { formatBRL } from "../lib/format";

// Gráfico de pizza: distribuição das DESPESAS do mês por categoria.
// Estornos e transferências ficam de fora (não são gasto).
export default function GraficoPizza({ transacoes }) {
  const saidas = apenasDespesas(transacoes);

  // Agrupa por categoria e soma.
  const soma = {};
  for (const t of saidas) {
    const cat = t.categoria || "(sem categoria)";
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
    <section className="mt-6 bg-superficie rounded-xl border border-neutral-200 p-4">
      <h2 className="font-semibold mb-1">Distribuição de gastos</h2>
      <p className="text-xs text-neutral-500 mb-2">Total de despesas: {formatBRL(total)}</p>
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
              {/* O espaçador entre fatias é a própria superfície, não um traço */}
              {dados.map((d) => (
                <Cell key={d.name} fill={d.cor} stroke="var(--superficie)" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [formatBRL(value), name]}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--n200)",
                background: "var(--superficie)",
                color: "var(--n900)",
                fontSize: 13,
              }}
              itemStyle={{ color: "var(--n900)" }}
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
