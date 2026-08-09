"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Scale, Ruler, Camera, Target, Settings, Calculator, Download,
  Plus, Trash2, Check, ArrowLeftRight,
} from "lucide-react";
import { GraficoLinha } from "../../../components/academia/Graficos";
import Modal from "../../../components/Modal";
import { useToast } from "../../../components/Toast";
import { supabaseConfigurado } from "../../../lib/supabase";
import {
  obterConfig, salvarConfig, listarExercicios,
  listarPesos, salvarPeso, deletarPeso,
  listarMedidas, salvarMedida, deletarMedida, MEDIDAS_PADRAO,
  listarFotos, enviarFoto, deletarFoto,
  listarMetas, criarMeta, atualizarMeta, deletarMeta,
  exportarTudo, seriesParaCSV, listarSessoes,
} from "../../../lib/academia";
import { formatarPeso, sugerirAquecimento, calcularAnilhas } from "../../../lib/treino";

const ABAS = [
  { id: "corpo", rotulo: "Corpo", Icone: Scale },
  { id: "metas", rotulo: "Metas", Icone: Target },
  { id: "ferramentas", rotulo: "Ferramentas", Icone: Calculator },
  { id: "ajustes", rotulo: "Ajustes", Icone: Settings },
];

export default function Perfil() {
  const toast = useToast();
  const [aba, setAba] = useState("corpo");

  if (!supabaseConfigurado) {
    return (
      <div className="mt-10 bg-yellow-50 border border-yellow-300 rounded-xl p-4 text-yellow-800">
        Configure o Supabase (.env.local) para usar a academia.
      </div>
    );
  }

  return (
    <div className="pb-2">
      <h1 className="text-xl font-bold mb-3">Perfil</h1>

      <div className="flex gap-1.5 overflow-x-auto mb-4 -mx-4 px-4">
        {ABAS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap toque ${
              aba === a.id ? "bg-marca text-white font-medium" : "bg-neutral-100 text-neutral-600"
            }`}
          >
            <a.Icone size={14} /> {a.rotulo}
          </button>
        ))}
      </div>

      {aba === "corpo" && <AbaCorpo toast={toast} />}
      {aba === "metas" && <AbaMetas toast={toast} />}
      {aba === "ferramentas" && <AbaFerramentas />}
      {aba === "ajustes" && <AbaAjustes toast={toast} />}
    </div>
  );
}

/* ==================== CORPO: peso, medidas e fotos ==================== */
function AbaCorpo({ toast }) {
  const [pesos, setPesos] = useState([]);
  const [medidas, setMedidas] = useState([]);
  const [fotos, setFotos] = useState([]);
  const [erroTabelas, setErroTabelas] = useState(false);
  const [novoPeso, setNovoPeso] = useState({ data: hojeISO(), peso: "" });
  const [novaMedida, setNovaMedida] = useState({ data: hojeISO(), tipo: MEDIDAS_PADRAO[0], valor: "" });
  const [medidaVista, setMedidaVista] = useState(MEDIDAS_PADRAO[0]);
  const [comparando, setComparando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const [ps, ms, fs] = await Promise.all([listarPesos(), listarMedidas(), listarFotos()]);
      setPesos(ps);
      setMedidas(ms);
      setFotos(fs);
      setErroTabelas(false);
    } catch {
      setErroTabelas(true);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (erroTabelas) {
    return (
      <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 text-yellow-800 text-sm">
        Rode o <code>supabase/migration-005-academia-corpo.sql</code> no Supabase para ativar peso,
        medidas, fotos e metas.
      </div>
    );
  }

  async function gravarPeso() {
    if (!novoPeso.peso) return toast("Informe o peso.", "erro");
    try {
      await salvarPeso(novoPeso);
      toast("✓ Peso registrado");
      setNovoPeso({ data: hojeISO(), peso: "" });
      carregar();
    } catch (e) {
      toast("Erro: " + e.message, "erro");
    }
  }

  async function gravarMedida() {
    if (!novaMedida.valor) return toast("Informe a medida.", "erro");
    try {
      await salvarMedida(novaMedida);
      toast("✓ Medida registrada");
      setNovaMedida((m) => ({ ...m, valor: "" }));
      carregar();
    } catch (e) {
      toast("Erro: " + e.message, "erro");
    }
  }

  async function subirFoto(arquivo, categoria) {
    if (!arquivo) return;
    setEnviando(true);
    try {
      await enviarFoto(arquivo, { data: hojeISO(), categoria });
      toast("✓ Foto enviada");
      carregar();
    } catch (e) {
      toast("Erro ao enviar: " + e.message, "erro");
    } finally {
      setEnviando(false);
    }
  }

  const ordenados = [...pesos].sort((a, b) => new Date(a.data) - new Date(b.data));
  const atual = ordenados[ordenados.length - 1];
  const inicial = ordenados[0];
  const maior = pesos.reduce((m, p) => Math.max(m, Number(p.peso)), 0);
  const menor = pesos.reduce((m, p) => (m === 0 ? Number(p.peso) : Math.min(m, Number(p.peso))), 0);

  const ha30 = new Date();
  ha30.setDate(ha30.getDate() - 30);
  const base30 = ordenados.filter((p) => new Date(p.data) <= ha30).pop() || inicial;
  const variacao30 = atual && base30 ? Number(atual.peso) - Number(base30.peso) : 0;

  const tiposUsados = [...new Set([...MEDIDAS_PADRAO, ...medidas.map((m) => m.tipo)])];
  const serieMedida = medidas
    .filter((m) => m.tipo === medidaVista)
    .sort((a, b) => new Date(a.data) - new Date(b.data));

  const porCategoria = { frente: [], lado: [], costas: [] };
  fotos.forEach((f) => (porCategoria[f.categoria] || porCategoria.frente).push(f));

  return (
    <div className="space-y-4">
      {/* PESO CORPORAL */}
      <section className="bg-white rounded-xl border border-neutral-200 p-4">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Scale size={17} className="text-marca" /> Peso corporal
        </h2>

        {pesos.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <Mini rotulo="Atual" valor={`${formatarPeso(atual.peso)} kg`} />
              <Mini
                rotulo="Últimos 30 dias"
                valor={`${variacao30 > 0 ? "+" : ""}${formatarPeso(variacao30)} kg`}
              />
              <Mini rotulo="Menor" valor={`${formatarPeso(menor)} kg`} />
              <Mini rotulo="Maior" valor={`${formatarPeso(maior)} kg`} />
            </div>
            <GraficoLinha
              pontos={ordenados.map((p) => ({ rotulo: dataCurta(p.data), valor: Number(p.peso) }))}
              formatar={(v) => `${formatarPeso(v)} kg`}
            />
          </>
        )}

        <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-100">
          <input
            type="date"
            value={novoPeso.data}
            onChange={(e) => setNovoPeso((p) => ({ ...p, data: e.target.value }))}
            className="border border-neutral-300 rounded-lg px-2 py-2 text-sm"
          />
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="kg"
            value={novoPeso.peso}
            onChange={(e) => setNovoPeso((p) => ({ ...p, peso: e.target.value }))}
            className="flex-1 min-w-0 border border-neutral-300 rounded-lg px-3 py-2 tabular-nums"
          />
          <button onClick={gravarPeso} className="bg-marca text-white rounded-lg px-4 toque">
            <Plus size={18} />
          </button>
        </div>

        {pesos.slice(0, 5).map((p) => (
          <div key={p.id} className="flex items-center gap-2 text-sm mt-1.5">
            <span className="text-neutral-400 text-xs w-16">{dataCurta(p.data)}</span>
            <span className="flex-1 tabular-nums">{formatarPeso(p.peso)} kg</span>
            <button
              onClick={() => deletarPeso(p.id).then(carregar)}
              className="text-neutral-300 hover:text-despesa p-1"
              aria-label="Apagar registro"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </section>

      {/* MEDIDAS */}
      <section className="bg-white rounded-xl border border-neutral-200 p-4">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Ruler size={17} className="text-marca" /> Medidas
        </h2>

        <select
          value={medidaVista}
          onChange={(e) => setMedidaVista(e.target.value)}
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 bg-white mb-3"
        >
          {tiposUsados.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {serieMedida.length > 0 ? (
          <GraficoLinha
            pontos={serieMedida.map((m) => ({ rotulo: dataCurta(m.data), valor: Number(m.valor) }))}
            formatar={(v) => `${formatarPeso(v)} cm`}
          />
        ) : (
          <p className="text-sm text-neutral-400 text-center py-4">
            Sem registros de {medidaVista.toLowerCase()}.
          </p>
        )}

        <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-100">
          <input
            type="date"
            value={novaMedida.data}
            onChange={(e) => setNovaMedida((m) => ({ ...m, data: e.target.value }))}
            className="border border-neutral-300 rounded-lg px-2 py-2 text-sm"
          />
          <select
            value={novaMedida.tipo}
            onChange={(e) => setNovaMedida((m) => ({ ...m, tipo: e.target.value }))}
            className="flex-1 min-w-0 border border-neutral-300 rounded-lg px-2 py-2 bg-white text-sm"
          >
            {tiposUsados.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            placeholder="cm"
            value={novaMedida.valor}
            onChange={(e) => setNovaMedida((m) => ({ ...m, valor: e.target.value }))}
            className="w-16 border border-neutral-300 rounded-lg px-2 py-2 tabular-nums"
          />
          <button onClick={gravarMedida} className="bg-marca text-white rounded-lg px-3 toque">
            <Plus size={18} />
          </button>
        </div>
      </section>

      {/* FOTOS */}
      <section className="bg-white rounded-xl border border-neutral-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Camera size={17} className="text-marca" /> Fotos
          </h2>
          {fotos.length >= 2 && (
            <button
              onClick={() => setComparando(true)}
              className="flex items-center gap-1 text-xs text-marca toque"
            >
              <ArrowLeftRight size={13} /> Comparar
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          {["frente", "lado", "costas"].map((cat) => (
            <label
              key={cat}
              className="border-2 border-dashed border-neutral-300 rounded-lg py-4 text-center cursor-pointer toque"
            >
              <Camera size={18} className="mx-auto text-neutral-400 mb-1" />
              <span className="text-xs capitalize text-neutral-500">{cat}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={enviando}
                onChange={(e) => subirFoto(e.target.files?.[0], cat)}
              />
            </label>
          ))}
        </div>

        {enviando && <p className="text-sm text-neutral-400 text-center">Enviando…</p>}

        {Object.entries(porCategoria).map(([cat, lista]) =>
          lista.length > 0 ? (
            <div key={cat} className="mb-3">
              <p className="text-[10px] uppercase tracking-wide text-neutral-400 mb-1">{cat}</p>
              <div className="flex gap-2 overflow-x-auto">
                {lista.map((f) => (
                  <div key={f.id} className="relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={f.url}
                      alt={`${cat} em ${dataCurta(f.data)}`}
                      className="w-24 h-32 object-cover rounded-lg border border-neutral-200"
                    />
                    <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1 rounded">
                      {dataCurta(f.data)}
                    </span>
                    <button
                      onClick={() => deletarFoto(f).then(carregar)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded p-0.5"
                      aria-label="Apagar foto"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null
        )}

        {fotos.length === 0 && !enviando && (
          <p className="text-sm text-neutral-400 text-center">Nenhuma foto ainda.</p>
        )}
      </section>

      {comparando && <CompararFotos fotos={fotos} onFechar={() => setComparando(false)} />}
    </div>
  );
}

function CompararFotos({ fotos, onFechar }) {
  const ordenadas = [...fotos].sort((a, b) => new Date(a.data) - new Date(b.data));
  const [a, setA] = useState(ordenadas[0]?.id);
  const [b, setB] = useState(ordenadas[ordenadas.length - 1]?.id);
  const fa = fotos.find((f) => f.id === a);
  const fb = fotos.find((f) => f.id === b);

  return (
    <Modal titulo="Comparar fotos" onFechar={onFechar}>
      <div className="grid grid-cols-2 gap-2">
        {[[a, setA, fa], [b, setB, fb]].map(([valor, setar, foto], i) => (
          <div key={i}>
            <select
              value={valor}
              onChange={(e) => setar(e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-2 py-1.5 text-xs bg-white mb-1"
            >
              {ordenadas.map((f) => (
                <option key={f.id} value={f.id}>
                  {dataCurta(f.data)} · {f.categoria}
                </option>
              ))}
            </select>
            {foto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto.url} alt={`Foto de ${dataCurta(foto.data)}`} className="w-full rounded-lg border border-neutral-200" />
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}

/* ==================== METAS ==================== */
function AbaMetas({ toast }) {
  const [metas, setMetas] = useState([]);
  const [exercicios, setExercicios] = useState([]);
  const [criando, setCriandoMeta] = useState(false);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const [ms, ex] = await Promise.all([listarMetas(), listarExercicios()]);
      setMetas(ms);
      setExercicios(ex);
      setErro(false);
    } catch {
      setErro(true);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (erro) {
    return (
      <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 text-yellow-800 text-sm">
        Rode o <code>supabase/migration-005-academia-corpo.sql</code> no Supabase para ativar as metas.
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setCriandoMeta(true)}
        className="w-full flex items-center justify-center gap-2 bg-marca text-white rounded-xl py-3 font-medium toque mb-3"
      >
        <Plus size={18} /> Nova meta
      </button>

      {metas.length === 0 && (
        <p className="text-sm text-neutral-400 text-center py-6">
          Nenhuma meta ainda. Ex: supino 100 kg × 5, ou 20 treinos no mês.
        </p>
      )}

      <div className="space-y-2">
        {metas.map((m) => (
          <div
            key={m.id}
            className={`bg-white rounded-xl border p-3 flex items-center gap-3 ${
              m.concluida ? "border-receita/40 bg-receita/5" : "border-neutral-200"
            }`}
          >
            <button
              onClick={() => atualizarMeta(m.id, { concluida: !m.concluida }).then(carregar)}
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                m.concluida ? "bg-receita text-white" : "bg-neutral-100 text-neutral-300"
              }`}
              aria-label={m.concluida ? "Marcar como pendente" : "Marcar como concluída"}
            >
              <Check size={17} strokeWidth={3} />
            </button>
            <div className="flex-1 min-w-0">
              <p className={`font-medium ${m.concluida ? "line-through text-neutral-400" : ""}`}>
                {m.titulo}
              </p>
              <p className="text-xs text-neutral-400">
                {m.exercicio?.nome && `${m.exercicio.nome} · `}
                {m.alvo_peso ? `${formatarPeso(m.alvo_peso)} kg` : ""}
                {m.alvo_reps ? ` × ${m.alvo_reps}` : ""}
                {m.alvo_valor ? `${m.alvo_valor}` : ""}
                {m.prazo ? ` · até ${dataCurta(m.prazo)}` : ""}
              </p>
            </div>
            <button
              onClick={() => deletarMeta(m.id).then(carregar)}
              className="text-neutral-300 hover:text-despesa p-1 shrink-0"
              aria-label="Excluir meta"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      {criando && (
        <FormMeta
          exercicios={exercicios}
          onFechar={() => setCriandoMeta(false)}
          onSalvo={carregar}
          toast={toast}
        />
      )}
    </div>
  );
}

function FormMeta({ exercicios, onFechar, onSalvo, toast }) {
  const [m, setM] = useState({
    tipo: "exercicio",
    titulo: "",
    exercicio_id: "",
    alvo_peso: "",
    alvo_reps: "",
    alvo_valor: "",
    prazo: "",
  });

  async function salvar() {
    if (!m.titulo.trim()) return toast("Dê um nome à meta.", "erro");
    try {
      await criarMeta({
        tipo: m.tipo,
        titulo: m.titulo.trim(),
        exercicio_id: m.exercicio_id || null,
        alvo_peso: m.alvo_peso ? Number(m.alvo_peso) : null,
        alvo_reps: m.alvo_reps ? Number(m.alvo_reps) : null,
        alvo_valor: m.alvo_valor ? Number(m.alvo_valor) : null,
        prazo: m.prazo || null,
      });
      toast("✓ Meta criada");
      onSalvo?.();
      onFechar();
    } catch (e) {
      toast("Erro: " + e.message, "erro");
    }
  }

  return (
    <Modal
      titulo="Nova meta"
      onFechar={onFechar}
      rodape={
        <div className="flex justify-end gap-2">
          <button onClick={onFechar} className="px-4 py-2 rounded-lg border border-neutral-300 toque">
            Cancelar
          </button>
          <button onClick={salvar} className="px-4 py-2 rounded-lg bg-marca text-white toque">
            Criar
          </button>
        </div>
      }
    >
      <Rotulo>Tipo</Rotulo>
      <select
        value={m.tipo}
        onChange={(e) => setM((x) => ({ ...x, tipo: e.target.value }))}
        className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 bg-white mb-3"
      >
        <option value="exercicio">Exercício (carga × reps)</option>
        <option value="peso_corporal">Peso corporal</option>
        <option value="treinos_mes">Treinos no mês</option>
        <option value="livre">Livre</option>
      </select>

      <Rotulo>Título</Rotulo>
      <input
        value={m.titulo}
        onChange={(e) => setM((x) => ({ ...x, titulo: e.target.value }))}
        placeholder="Ex: Supino 100 kg × 5"
        className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 mb-3"
      />

      {m.tipo === "exercicio" && (
        <>
          <Rotulo>Exercício</Rotulo>
          <select
            value={m.exercicio_id}
            onChange={(e) => setM((x) => ({ ...x, exercicio_id: e.target.value }))}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 bg-white mb-3"
          >
            <option value="">Escolha…</option>
            {exercicios.map((e) => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Rotulo>Carga (kg)</Rotulo>
              <input
                type="number"
                step="0.5"
                value={m.alvo_peso}
                onChange={(e) => setM((x) => ({ ...x, alvo_peso: e.target.value }))}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 tabular-nums"
              />
            </div>
            <div>
              <Rotulo>Repetições</Rotulo>
              <input
                type="number"
                value={m.alvo_reps}
                onChange={(e) => setM((x) => ({ ...x, alvo_reps: e.target.value }))}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 tabular-nums"
              />
            </div>
          </div>
        </>
      )}

      {(m.tipo === "peso_corporal" || m.tipo === "treinos_mes") && (
        <>
          <Rotulo>{m.tipo === "peso_corporal" ? "Peso alvo (kg)" : "Quantidade de treinos"}</Rotulo>
          <input
            type="number"
            step={m.tipo === "peso_corporal" ? "0.1" : "1"}
            value={m.alvo_valor}
            onChange={(e) => setM((x) => ({ ...x, alvo_valor: e.target.value }))}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 tabular-nums mb-3"
          />
        </>
      )}

      <Rotulo>Prazo (opcional)</Rotulo>
      <input
        type="date"
        value={m.prazo}
        onChange={(e) => setM((x) => ({ ...x, prazo: e.target.value }))}
        className="w-full border border-neutral-300 rounded-lg px-3 py-2.5"
      />
    </Modal>
  );
}

/* ==================== FERRAMENTAS: calculadoras ==================== */
function AbaFerramentas() {
  const [carga, setCarga] = useState("100");
  const [barra, setBarra] = useState("20");
  const [disponiveis, setDisponiveis] = useState("20,15,10,5,2.5,1.25");

  const aquecimento = useMemo(() => sugerirAquecimento(Number(carga), Number(barra)), [carga, barra]);
  const anilhas = useMemo(() => {
    const lista = disponiveis
      .split(",")
      .map((x) => Number(x.trim()))
      .filter((x) => x > 0);
    return calcularAnilhas(Number(carga), Number(barra), lista);
  }, [carga, barra, disponiveis]);

  return (
    <div className="space-y-4">
      <section className="bg-white rounded-xl border border-neutral-200 p-4">
        <h2 className="font-semibold mb-3">Carga de trabalho</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Rotulo>Peso alvo (kg)</Rotulo>
            <input
              type="number"
              inputMode="decimal"
              step="2.5"
              value={carga}
              onChange={(e) => setCarga(e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-lg font-semibold tabular-nums"
            />
          </div>
          <div>
            <Rotulo>Peso da barra (kg)</Rotulo>
            <input
              type="number"
              inputMode="decimal"
              step="1"
              value={barra}
              onChange={(e) => setBarra(e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 text-lg font-semibold tabular-nums"
            />
          </div>
        </div>
      </section>

      {/* AQUECIMENTO (item 12) */}
      <section className="bg-white rounded-xl border border-neutral-200 p-4">
        <h2 className="font-semibold mb-1">Aquecimento sugerido</h2>
        <p className="text-xs text-neutral-500 mb-3">Progressão até a carga de trabalho</p>
        <div className="space-y-1.5">
          {aquecimento.map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-6 text-xs text-neutral-400">{i + 1}</span>
              <span className="flex-1 font-medium tabular-nums">
                {a.rotulo || `${formatarPeso(a.peso)} kg`}
              </span>
              <span className="text-neutral-500 tabular-nums">× {a.reps}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 text-sm pt-1.5 border-t border-neutral-100">
            <span className="w-6" />
            <span className="flex-1 font-bold tabular-nums text-marca">
              {formatarPeso(Number(carga))} kg
            </span>
            <span className="text-marca text-xs font-medium">séries válidas</span>
          </div>
        </div>
      </section>

      {/* ANILHAS (item 13) */}
      <section className="bg-white rounded-xl border border-neutral-200 p-4">
        <h2 className="font-semibold mb-1">Anilhas por lado</h2>
        <p className="text-xs text-neutral-500 mb-3">Para chegar em {formatarPeso(Number(carga))} kg</p>

        {anilhas.lado.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {anilhas.lado.map((a, i) => (
              <span
                key={i}
                className="bg-marca/10 text-marca font-semibold rounded-lg px-3 py-2 tabular-nums"
              >
                {formatarPeso(a)}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-400">Só a barra.</p>
        )}

        {!anilhas.possivel && anilhas.sobra > 0.01 && (
          <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-300 rounded-lg px-2.5 py-1.5 mt-2">
            Faltam {formatarPeso(anilhas.sobra)} kg — não dá para fechar com as anilhas disponíveis.
          </p>
        )}

        <div className="mt-3 pt-3 border-t border-neutral-100">
          <Rotulo>Anilhas da sua academia (kg, separadas por vírgula)</Rotulo>
          <input
            value={disponiveis}
            onChange={(e) => setDisponiveis(e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm tabular-nums"
          />
        </div>
      </section>
    </div>
  );
}

/* ==================== AJUSTES ==================== */
function AbaAjustes({ toast }) {
  const [cfg, setCfg] = useState(null);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    obterConfig().then(setCfg).catch(() => {});
  }, []);

  async function mudar(campo, valor) {
    setCfg((c) => ({ ...c, [campo]: valor }));
    try {
      await salvarConfig({ [campo]: valor });
    } catch (e) {
      toast("Erro ao salvar: " + e.message, "erro");
    }
  }

  async function exportar(formato) {
    setExportando(true);
    try {
      const dados = await exportarTudo();
      let conteudo, nome, tipo;
      if (formato === "csv") {
        const sessoes = await listarSessoes({ limite: 1000 });
        conteudo = "﻿" + seriesParaCSV(sessoes);
        nome = "academia-series.csv";
        tipo = "text/csv;charset=utf-8";
      } else {
        conteudo = JSON.stringify(dados, null, 2);
        nome = "academia-backup.json";
        tipo = "application/json";
      }
      const blob = new Blob([conteudo], { type: tipo });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nome;
      a.click();
      URL.revokeObjectURL(url);
      toast("✓ Arquivo baixado");
    } catch (e) {
      toast("Erro: " + e.message, "erro");
    } finally {
      setExportando(false);
    }
  }

  if (!cfg) return <p className="text-neutral-400 text-sm">Carregando…</p>;

  return (
    <div className="space-y-4">
      <section className="bg-white rounded-xl border border-neutral-200 p-4 space-y-3">
        <h2 className="font-semibold">Preferências</h2>

        <div>
          <Rotulo>Esforço percebido</Rotulo>
          <div className="flex gap-1.5">
            {[
              { v: "nenhum", r: "Nenhum" },
              { v: "rpe", r: "RPE" },
              { v: "rir", r: "RIR" },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => mudar("esforco", o.v)}
                className={`flex-1 py-2 rounded-lg text-sm toque ${
                  cfg.esforco === o.v ? "bg-marca text-white font-medium" : "bg-neutral-100 text-neutral-600"
                }`}
              >
                {o.r}
              </button>
            ))}
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            RPE: o quanto pegou (6 a 10). RIR: quantas repetições sobraram.
          </p>
        </div>

        <div>
          <Rotulo>Incremento de carga (kg)</Rotulo>
          <div className="flex gap-1.5">
            {[1, 2, 2.5, 5].map((v) => (
              <button
                key={v}
                onClick={() => mudar("incremento_padrao", v)}
                className={`flex-1 py-2 rounded-lg text-sm tabular-nums toque ${
                  Number(cfg.incremento_padrao) === v
                    ? "bg-marca text-white font-medium"
                    : "bg-neutral-100 text-neutral-600"
                }`}
              >
                {formatarPeso(v)}
              </button>
            ))}
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Quanto os botões + e − mudam durante o treino.
          </p>
        </div>

        <div>
          <Rotulo>Descanso padrão (segundos)</Rotulo>
          <input
            type="number"
            step="15"
            value={cfg.descanso_padrao}
            onChange={(e) => mudar("descanso_padrao", Number(e.target.value))}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 tabular-nums"
          />
        </div>

        <div>
          <Rotulo>Meta de treinos por semana</Rotulo>
          <input
            type="number"
            min="1"
            max="14"
            value={cfg.meta_semanal}
            onChange={(e) => mudar("meta_semanal", Number(e.target.value))}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2.5 tabular-nums"
          />
        </div>
      </section>

      <section className="bg-white rounded-xl border border-neutral-200 p-4">
        <h2 className="font-semibold mb-1 flex items-center gap-2">
          <Download size={17} className="text-marca" /> Seus dados
        </h2>
        <p className="text-xs text-neutral-500 mb-3">
          Baixe tudo quando quiser. Os dados são seus.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => exportar("csv")}
            disabled={exportando}
            className="flex-1 border border-neutral-300 rounded-lg py-2.5 text-sm font-medium toque disabled:opacity-40"
          >
            CSV (Excel)
          </button>
          <button
            onClick={() => exportar("json")}
            disabled={exportando}
            className="flex-1 border border-neutral-300 rounded-lg py-2.5 text-sm font-medium toque disabled:opacity-40"
          >
            JSON (backup)
          </button>
        </div>
      </section>
    </div>
  );
}

/* ---------------- auxiliares ---------------- */
function Mini({ rotulo, valor }) {
  return (
    <div className="bg-neutral-50 rounded-lg border border-neutral-200 px-3 py-2">
      <p className="text-xs text-neutral-500">{rotulo}</p>
      <p className="font-bold tabular-nums">{valor}</p>
    </div>
  );
}

function Rotulo({ children }) {
  return (
    <span className="block text-xs font-medium text-neutral-500 mb-1">{children}</span>
  );
}

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dataCurta(iso) {
  if (!iso) return "";
  const [ano, mes, dia] = String(iso).slice(0, 10).split("-");
  return `${dia}/${mes}`;
}
