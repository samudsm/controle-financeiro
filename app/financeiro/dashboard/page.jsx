"use client";
import { useCallback, useEffect, useState } from "react";
import { FastForward, Pencil, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import SeletorMes from "../../../components/SeletorMes";
import GraficoPizza from "../../../components/GraficoPizza";
import ResumoCategorias from "../../../components/ResumoCategorias";
import RankingGastos from "../../../components/RankingGastos";
import AnaliseInterativa from "../../../components/AnaliseInterativa";
import EditarGastoFixoModal from "../../../components/EditarGastoFixoModal";
import { useToast } from "../../../components/Toast";
import { supabaseConfigurado } from "../../../lib/supabase";
import { mesAtual, primeiroDiaDoMes, rotuloMes } from "../../../lib/dates";
import { formatBRL } from "../../../lib/format";
import { calcularTotais } from "../../../lib/totais";
import {
  listarTransacoesDoMes,
  listarPendenciasDoMes,
  anteciparParcelas,
} from "../../../lib/db";

export default function Dashboard() {
  const toast = useToast();
  const [mes, setMes] = useState(mesAtual());
  const [transacoes, setTransacoes] = useState([]);
  const [pendencias, setPendencias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [editandoFixo, setEditandoFixo] = useState(null);
  const [antecipando, setAntecipando] = useState(null);

  const carregar = useCallback(async () => {
    if (!supabaseConfigurado) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    try {
      const [ts, ps] = await Promise.all([
        listarTransacoesDoMes(mes),
        listarPendenciasDoMes(mes),
      ]);
      setTransacoes(ts);
      setPendencias(ps);
    } catch (e) {
      toast("Erro ao carregar: " + e.message, "erro");
    } finally {
      setCarregando(false);
    }
  }, [mes, toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // ----- KPIs -----
  // calcularTotais aplica as regras do modelo: estorno abate despesa,
  // transferência fica fora de tudo.
  const totais = calcularTotais(transacoes);
  const entradasReal = totais.receitas;
  const saidasReal = totais.despesas; // já com os estornos descontados
  const previstoReceber = pendencias
    .filter((p) => p.tipo === "a_receber" && p.status === "pendente")
    .reduce((s, p) => s + Math.abs(Number(p.valor) || 0), 0);
  const previstoPagar = pendencias
    .filter((p) => p.tipo === "a_pagar" && p.status === "pendente")
    .reduce((s, p) => s + Math.abs(Number(p.valor) || 0), 0);

  const totalEntradas = entradasReal + previstoReceber;
  const totalSaidas = saidasReal + previstoPagar;
  const saldo = totalEntradas - totalSaidas;

  const parcelas = transacoes.filter((t) => t.parcela_numero && t.parcela_total);
  const fixos = transacoes.filter((t) => t.is_fixa);

  async function confirmarAntecipacao() {
    const p = antecipando;
    try {
      const movidas = await anteciparParcelas({
        descricao: p.descricao,
        parcelaTotal: p.parcela_total,
        numeroAtual: p.parcela_numero,
        novaData: primeiroDiaDoMes(mes),
      });
      toast(`✓ ${movidas.length} parcela(s) antecipada(s) para ${rotuloMes(mes)}`);
      setAntecipando(null);
      carregar();
    } catch (e) {
      toast("Erro: " + e.message, "erro");
    }
  }

  if (!supabaseConfigurado) return <AvisoSemSupabase />;

  return (
    <div>
      <h1 className="text-xl font-bold mb-3">Painel</h1>
      <SeletorMes mes={mes} onChange={setMes} />

      {/* KPIs */}
      <div className="grid gap-3 mt-4">
        <Kpi
          titulo="Total Entradas"
          valor={totalEntradas}
          cor="text-receita"
          Icone={TrendingUp}
          real={entradasReal}
          previsto={previstoReceber}
          rotuloPrevisto="A Receber"
        />
        <Kpi
          titulo="Total Saídas"
          valor={-totalSaidas}
          cor="text-despesa"
          Icone={TrendingDown}
          real={saidasReal}
          previsto={previstoPagar}
          rotuloPrevisto="A Pagar"
          extra={
            totais.estornos > 0
              ? `Já descontado ${formatBRL(totais.estornos)} de estornos (de ${formatBRL(totais.despesasBrutas)} brutos)`
              : null
          }
        />
        <div className="bg-marca text-white rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet size={20} />
            <span className="font-medium">Saldo Líquido Previsto</span>
          </div>
          <span className="text-xl font-bold">{formatBRL(saldo)}</span>
        </div>
      </div>

      {carregando && <p className="text-neutral-400 text-sm mt-4">Carregando…</p>}

      {/* Gráfico de distribuição de gastos */}
      <GraficoPizza transacoes={transacoes} />

      {/* Exploração interativa: clique para descer ao detalhe */}
      <AnaliseInterativa transacoes={transacoes} />

      {/* Análises: resumo por categoria e ranking de gastos */}
      <ResumoCategorias transacoes={transacoes} />
      <RankingGastos transacoes={transacoes} />

      {/* Parcelas do mês (com antecipação) */}
      {parcelas.length > 0 && (
        <section className="mt-6">
          <h2 className="font-semibold mb-2">Parcelas deste mês</h2>
          <div className="space-y-2">
            {parcelas.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-xl border border-neutral-200 p-3 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">
                    {t.descricao}{" "}
                    <span className="text-neutral-400 text-sm">
                      ({t.parcela_numero}/{t.parcela_total})
                    </span>
                  </p>
                  <p className="text-despesa text-sm">{formatBRL(Math.abs(t.valor))}</p>
                </div>
                {t.parcela_numero < t.parcela_total && (
                  <button
                    onClick={() => setAntecipando(t)}
                    className="flex items-center gap-1 text-marca text-sm font-medium toque px-2"
                  >
                    <FastForward size={16} /> Antecipar
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Gastos fixos */}
      {fixos.length > 0 && (
        <section className="mt-6">
          <h2 className="font-semibold mb-2">Gastos fixos</h2>
          <div className="space-y-2">
            {fixos.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-xl border border-neutral-200 p-3 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{t.descricao}</p>
                  <p className="text-neutral-500 text-sm">{formatBRL(Math.abs(t.valor))}</p>
                </div>
                <button
                  onClick={() => setEditandoFixo(t)}
                  className="flex items-center gap-1 text-marca text-sm toque px-2"
                >
                  <Pencil size={15} /> Editar
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {!carregando && transacoes.length === 0 && (
        <p className="text-neutral-400 text-sm mt-6 text-center">
          Nenhuma transação em {rotuloMes(mes)}. Importe um extrato na aba Importar.
        </p>
      )}

      {editandoFixo && (
        <EditarGastoFixoModal
          transacao={editandoFixo}
          onFechar={() => setEditandoFixo(null)}
          onSalvo={carregar}
        />
      )}

      {antecipando && (
        <ConfirmarAntecipacao
          transacao={antecipando}
          mes={mes}
          onConfirmar={confirmarAntecipacao}
          onCancelar={() => setAntecipando(null)}
        />
      )}
    </div>
  );
}

function Kpi({ titulo, valor, cor, Icone, real, previsto, rotuloPrevisto, extra }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-neutral-600">
          <Icone size={18} />
          <span className="font-medium">{titulo}</span>
        </div>
        <span className={`text-lg font-bold ${cor}`}>{formatBRL(valor)}</span>
      </div>
      <div className="mt-2 text-xs text-neutral-500 space-y-0.5">
        <p>├─ Real: {formatBRL(real)}</p>
        <p>└─ Previsto ({rotuloPrevisto}): {formatBRL(previsto)}</p>
        {extra && <p className="text-neutral-400 pt-0.5">{extra}</p>}
      </div>
    </div>
  );
}

function ConfirmarAntecipacao({ transacao, mes, onConfirmar, onCancelar }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-5 max-w-sm w-full">
        <h3 className="font-semibold mb-2">Antecipar parcelas?</h3>
        <p className="text-sm text-neutral-600 mb-4">
          Isso moverá as próximas parcelas de <strong>{transacao.descricao}</strong> (após a{" "}
          {transacao.parcela_numero}/{transacao.parcela_total}) para {rotuloMes(mes)}.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancelar} className="px-4 py-2 rounded-lg border border-neutral-300 toque">
            Cancelar
          </button>
          <button onClick={onConfirmar} className="px-4 py-2 rounded-lg bg-marca text-white toque">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

function AvisoSemSupabase() {
  return (
    <div className="mt-10 bg-yellow-50 border border-yellow-300 rounded-xl p-4 text-yellow-800">
      <h2 className="font-semibold mb-1">Configure o Supabase</h2>
      <p className="text-sm">
        Crie o arquivo <code>.env.local</code> com <code>NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
        <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> e rode o <code>supabase/schema.sql</code> no seu
        projeto Supabase (conta nova, separada). Depois reinicie o <code>npm run dev</code>.
      </p>
    </div>
  );
}
