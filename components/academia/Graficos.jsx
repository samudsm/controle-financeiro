"use client";
import { useState } from "react";

// Cor única: uma série = uma cor. A cor não codifica o tamanho da barra.
const COR = "#2a78d6";

/* ---------------- LINHA (evolução ao longo do tempo) ---------------- */
// Usa SVG para desenhar; o valor final fica rotulado direto no gráfico.
export function GraficoLinha({ pontos = [], formatar = (v) => v, altura = 140 }) {
  const [ativo, setAtivo] = useState(null);

  if (pontos.length < 2) {
    return (
      <p className="text-sm text-neutral-400 text-center py-6">
        {pontos.length === 0
          ? "Sem dados ainda."
          : "Só um registro até agora — o gráfico aparece a partir do segundo."}
      </p>
    );
  }

  const valores = pontos.map((p) => p.valor);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const faixa = max - min || 1;

  const L = 100; // viewBox em porcentagem
  const A = 100;
  const coordenadas = pontos.map((p, i) => ({
    ...p,
    x: (i / (pontos.length - 1)) * L,
    y: A - ((p.valor - min) / faixa) * (A * 0.8) - A * 0.1,
  }));

  const linha = coordenadas.map((c) => `${c.x},${c.y}`).join(" ");
  const area = `0,${A} ${linha} ${L},${A}`;
  const ultimo = coordenadas[coordenadas.length - 1];
  const primeiro = coordenadas[0];
  const variacao = primeiro.valor ? ((ultimo.valor - primeiro.valor) / primeiro.valor) * 100 : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-neutral-400">
          {formatar(min)} — {formatar(max)}
        </span>
        {Math.abs(variacao) >= 0.5 && (
          <span className={`text-xs font-medium ${variacao > 0 ? "text-receita" : "text-despesa"}`}>
            {variacao > 0 ? "↑" : "↓"} {Math.abs(variacao).toFixed(1)}% no período
          </span>
        )}
      </div>

      <div className="relative" style={{ height: altura }}>
        <svg
          viewBox={`0 0 ${L} ${A}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          {/* Área de apoio: um lavado da própria cor, nunca um bloco saturado */}
          <polygon points={area} fill={COR} opacity="0.1" />
          <polyline
            points={linha}
            fill="none"
            stroke={COR}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {coordenadas.map((c, i) => (
            <circle
              key={i}
              cx={c.x}
              cy={c.y}
              r={i === coordenadas.length - 1 ? 3 : 2.2}
              fill={COR}
              stroke="#fff"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              onMouseEnter={() => setAtivo(i)}
              onMouseLeave={() => setAtivo(null)}
              style={{ cursor: "pointer" }}
            />
          ))}
        </svg>

        {/* Rótulo direto no último ponto — o número que mais importa */}
        <span
          className="absolute text-xs font-semibold tabular-nums bg-white/90 px-1 rounded"
          style={{ left: "auto", right: 0, top: `${(ultimo.y / A) * 100}%`, transform: "translateY(-130%)" }}
        >
          {formatar(ultimo.valor)}
        </span>
      </div>

      <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
        <span>{pontos[0].rotulo}</span>
        {ativo != null && (
          <span className="font-medium text-neutral-600">
            {pontos[ativo].rotulo}: {formatar(pontos[ativo].valor)}
          </span>
        )}
        <span>{pontos[pontos.length - 1].rotulo}</span>
      </div>
    </div>
  );
}

/* ---------------- COLUNAS (volume por semana) ---------------- */
export function GraficoColunas({ dados = [], formatar = (v) => v, altura = 120 }) {
  if (dados.every((d) => !d.valor)) {
    return <p className="text-sm text-neutral-400 text-center py-6">Sem dados ainda.</p>;
  }
  const max = Math.max(...dados.map((d) => d.valor), 1);
  const maior = dados.reduce((a, d) => (d.valor > a.valor ? d : a), dados[0]);

  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height: altura }}>
        {dados.map((d, i) => (
          <div key={i} className="flex-1 h-full flex flex-col justify-end min-w-0" title={`${d.rotulo}: ${formatar(d.valor)}`}>
            {d.rotulo === maior.rotulo && d.valor > 0 && (
              <span className="text-[9px] text-neutral-500 text-center tabular-nums whitespace-nowrap mb-0.5">
                {formatar(d.valor)}
              </span>
            )}
            <div
              className="rounded-t w-full"
              style={{
                height: `${Math.max((d.valor / max) * 100, d.valor > 0 ? 3 : 1)}%`,
                background: d.valor > 0 ? COR : "#e5e5e5",
              }}
            />
          </div>
        ))}
      </div>
      <div className="h-px bg-neutral-200 my-1" />
      <div className="flex gap-1.5">
        {dados.map((d, i) => (
          <span key={i} className="flex-1 text-[9px] text-neutral-400 text-center truncate min-w-0">
            {d.rotulo}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- BARRAS HORIZONTAIS (volume por grupo muscular) ---------------- */
export function GraficoBarras({ dados = [], formatar = (v) => v, onClicar }) {
  if (dados.length === 0) {
    return <p className="text-sm text-neutral-400 text-center py-6">Sem dados ainda.</p>;
  }
  const max = Math.max(...dados.map((d) => d.valor), 1);

  return (
    <div className="space-y-2">
      {dados.map((d) => {
        const Elemento = onClicar ? "button" : "div";
        return (
          <Elemento
            key={d.rotulo}
            onClick={onClicar ? () => onClicar(d) : undefined}
            className={`w-full text-left ${onClicar ? "toque" : ""}`}
          >
            {/* Rótulo e valor sempre visíveis: a cor nunca é o único canal */}
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="flex-1 text-sm truncate">{d.rotulo}</span>
              {d.secundario && (
                <span className="text-xs text-neutral-400 tabular-nums">{d.secundario}</span>
              )}
              <span className="text-sm font-semibold tabular-nums">{formatar(d.valor)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-neutral-100 overflow-hidden">
              <div
                className="h-full rounded-r"
                style={{ width: `${Math.max((d.valor / max) * 100, 2)}%`, background: d.cor || COR }}
              />
            </div>
          </Elemento>
        );
      })}
    </div>
  );
}
