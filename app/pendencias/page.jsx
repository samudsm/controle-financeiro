"use client";
import { useCallback, useEffect, useState } from "react";
import { Plus, Check, Clock, AlertTriangle } from "lucide-react";
import SeletorMes from "../../components/SeletorMes";
import Modal from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { supabaseConfigurado } from "../../lib/supabase";
import { mesAtual, rotuloMes } from "../../lib/dates";
import { formatBRL } from "../../lib/format";
import {
  listarPendenciasDoMes,
  atualizarPendencia,
  criarPendencia,
  deletarPendencia,
} from "../../lib/db";

export default function Pendencias() {
  const toast = useToast();
  const [mes, setMes] = useState(mesAtual());
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [novo, setNovo] = useState(null); // { tipo }

  const carregar = useCallback(async () => {
    if (!supabaseConfigurado) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    try {
      setLista(await listarPendenciasDoMes(mes));
    } catch (e) {
      toast("Erro: " + e.message, "erro");
    } finally {
      setCarregando(false);
    }
  }, [mes, toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const aPagar = lista.filter((p) => p.tipo === "a_pagar");
  const aReceber = lista.filter((p) => p.tipo === "a_receber");

  async function marcar(p) {
    const novoStatus = p.tipo === "a_pagar" ? "pago" : "recebido";
    const rotulo = p.tipo === "a_pagar" ? "pago" : "recebido";
    if (!window.confirm(`Marcar "${p.descricao}" como ${rotulo}?`)) return;
    try {
      await atualizarPendencia(p.id, { status: novoStatus });
      toast(`✓ Marcado como ${rotulo}`);
      carregar();
    } catch (e) {
      toast("Erro: " + e.message, "erro");
    }
  }

  if (!supabaseConfigurado) {
    return (
      <div className="mt-10 bg-yellow-50 border border-yellow-300 rounded-xl p-4 text-yellow-800">
        Configure o Supabase (.env.local) para usar as pendências.
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-3">Pendências</h1>
      <SeletorMes mes={mes} onChange={setMes} />
      <p className="text-xs text-neutral-500 mt-2">Mostrando apenas {rotuloMes(mes)}.</p>

      {/* A PAGAR */}
      <Secao
        titulo="A Pagar"
        cor="text-despesa"
        onNovo={() => setNovo({ tipo: "a_pagar" })}
        itens={aPagar}
        carregando={carregando}
        render={(p) => (
          <Cartao
            key={p.id}
            p={p}
            corValor="text-despesa"
            status={
              p.status === "pago"
                ? { txt: "✅ Pago", cls: "text-receita" }
                : { txt: "⚠️ Pendente", cls: "text-yellow-600", Icone: AlertTriangle }
            }
            acao={p.status !== "pago" ? { txt: "Marcar como Pago", fn: () => marcar(p) } : null}
          />
        )}
      />

      {/* A RECEBER */}
      <Secao
        titulo="A Receber"
        cor="text-receita"
        onNovo={() => setNovo({ tipo: "a_receber" })}
        itens={aReceber}
        carregando={carregando}
        render={(p) => (
          <Cartao
            key={p.id}
            p={p}
            corValor="text-receita"
            status={
              p.status === "recebido"
                ? { txt: "✅ Recebido", cls: "text-receita" }
                : { txt: "⏳ Aguardando", cls: "text-yellow-600", Icone: Clock }
            }
            acao={
              p.status !== "recebido" ? { txt: "Marcar como Recebido", fn: () => marcar(p) } : null
            }
          />
        )}
      />

      {novo && (
        <NovaPendencia
          tipo={novo.tipo}
          mes={mes}
          onFechar={() => setNovo(null)}
          onSalvo={carregar}
        />
      )}
    </div>
  );
}

function Secao({ titulo, cor, onNovo, itens, carregando, render }) {
  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className={`font-semibold ${cor}`}>{titulo} Este Mês</h2>
        <button onClick={onNovo} className="flex items-center gap-1 text-marca text-sm toque">
          <Plus size={16} /> Adicionar
        </button>
      </div>
      {!carregando && itens.length === 0 && (
        <p className="text-neutral-400 text-sm">Nada aqui.</p>
      )}
      <div className="space-y-2">{itens.map(render)}</div>
    </section>
  );
}

function Cartao({ p, corValor, status, acao }) {
  const Icone = status.Icone;
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{p.descricao}</p>
          <p className={`text-sm ${corValor}`}>{formatBRL(Math.abs(p.valor))}</p>
        </div>
        <span className={`text-sm flex items-center gap-1 ${status.cls}`}>
          {Icone && <Icone size={15} />} {status.txt}
        </span>
      </div>
      {acao && (
        <button
          onClick={acao.fn}
          className="mt-3 w-full flex items-center justify-center gap-1 bg-marca text-white rounded-lg py-2 toque"
        >
          <Check size={16} /> {acao.txt}
        </button>
      )}
    </div>
  );
}

function NovaPendencia({ tipo, mes, onFechar, onSalvo }) {
  const toast = useToast();
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [salvando, setSalvando] = useState(false);
  const titulo = tipo === "a_pagar" ? "Nova conta a pagar" : "Novo valor a receber";

  async function salvar() {
    if (!descricao || !valor) {
      toast("Preencha descrição e valor.", "erro");
      return;
    }
    setSalvando(true);
    try {
      await criarPendencia({
        descricao,
        tipo,
        valor: Number(valor) || 0,
        status: "pendente",
        mes_referencia: mes,
      });
      toast("✓ Pendência criada");
      onSalvo?.();
      onFechar();
    } catch (e) {
      toast("Erro: " + e.message, "erro");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      titulo={titulo}
      onFechar={onFechar}
      rodape={
        <div className="flex justify-end gap-2">
          <button onClick={onFechar} className="px-4 py-2 rounded-lg border border-neutral-300 toque">
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="px-4 py-2 rounded-lg bg-marca text-white toque disabled:opacity-40"
          >
            Salvar
          </button>
        </div>
      }
    >
      <label className="block mb-3">
        <span className="block text-xs font-medium text-neutral-500 mb-1">Descrição</span>
        <input
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 toque"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />
      </label>
      <label className="block">
        <span className="block text-xs font-medium text-neutral-500 mb-1">Valor (R$)</span>
        <input
          type="number"
          step="0.01"
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 toque"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
      </label>
    </Modal>
  );
}
