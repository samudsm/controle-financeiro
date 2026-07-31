// Migração dos 69 lançamentos para o novo modelo de categorias.
//
//   node scripts/migrar-categorias.mjs            -> SIMULA (não grava nada)
//   node scripts/migrar-categorias.mjs --aplicar  -> GRAVA de verdade
//
// Rode SOMENTE depois de executar supabase/migration-002-novo-modelo.sql.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import path from "path";

const APLICAR = process.argv.includes("--aplicar");

const env = readFileSync(".env.local", "utf8");
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)[1].trim();
const sb = createClient(url, key);

// =====================================================================
// DE-PARA — a chave é "categoria antiga|subcategoria antiga".
// Regras com "quando" são testadas primeiro (casos decididos por descrição).
// =====================================================================
const REGRAS = [
  // ---- Comida -> Alimentação ----
  { de: "Comida|Espetinho",        cat: "Alimentação", sub: "Lanche" },
  { de: "Comida|Esfiha",           cat: "Alimentação", sub: "Lanche" },
  { de: "Comida|Lanche",           cat: "Alimentação", sub: "Lanche" },
  { de: "Comida|Chocolate",        cat: "Alimentação", sub: "Doce e sobremesa" },
  { de: "Comida|Sorvete",          cat: "Alimentação", sub: "Doce e sobremesa" },
  { de: "Comida|McDonalds",        cat: "Alimentação", sub: "Restaurante", estab: "McDonalds" },
  { de: "Comida|Bonarabe",         cat: "Alimentação", sub: "Restaurante", estab: "Bonarabe" },
  { de: "Comida|Nemo",             cat: "Alimentação", sub: "Restaurante", estab: "Nemo" },
  { de: "Comida|América",          cat: "Alimentação", sub: "Restaurante", tags: ["América"] },
  { de: "Comida|Destine",          cat: "Alimentação", sub: "Restaurante", tags: ["Destine"] },
  { de: "Comida|Aniversário Duda", cat: "Alimentação", sub: "Restaurante", tags: ["Aniversário Duda"] },
  // DECIDIDO: ASSAI/ATACADÃO são supermercados, não cinema.
  { de: "Comida|Filme",            cat: "Alimentação", sub: "Supermercado" },
  // DECIDIDO: são corridas de Uber, não restaurante.
  { de: "Comida|Ronda",            cat: "Transporte",  sub: "App de transporte", tags: ["Ronda Jovem"] },

  // ---- Bebida -> Alimentação/Bebida ----
  { de: "Bebida|América",          cat: "Alimentação", sub: "Bebida", tags: ["América"] },
  { de: "Bebida|Destine",          cat: "Alimentação", sub: "Bebida", tags: ["Destine"] },
  { de: "Bebida|",                 cat: "Alimentação", sub: "Bebida" },

  // ---- Transporte ----
  { de: "Combustível|Gasolina",         cat: "Transporte", sub: "Combustível" },
  { de: "Combustível|",                 cat: "Transporte", sub: "Combustível" },
  // DECIDIDO: corrige o erro de digitação "Aniverário" -> "Aniversário".
  { de: "Uber|Aniverário Carol",        cat: "Transporte", sub: "App de transporte", tags: ["Aniversário Carol"] },
  { de: "Uber|",                        cat: "Transporte", sub: "App de transporte" },

  // ---- Assinaturas ----
  { de: "Streaming|Spotify",       cat: "Assinaturas", sub: "Streaming", estab: "Spotify" },
  { de: "Streaming|",              cat: "Assinaturas", sub: "Streaming" },

  // ---- Lazer ----
  { de: "Aposta|Bolão",            cat: "Lazer", sub: "Jogos e aposta" },
  { de: "Aposta|",                 cat: "Lazer", sub: "Jogos e aposta" },
  { de: "Lazer|Pelada",            cat: "Lazer", sub: "Esporte" },
  { de: "Lazer|SJ Ronda Jovem",    cat: "Lazer", sub: "Evento", tags: ["Ronda Jovem"] },

  // ---- Doações e Presentes ----
  { de: "Igreja|Ofertório",        cat: "Doações e Presentes", sub: "Dízimo e ofertas" },
  { de: "Igreja|",                 cat: "Doações e Presentes", sub: "Dízimo e ofertas" },
  { de: "Presente|Flor",           cat: "Doações e Presentes", sub: "Presente" },
  // DECIDIDO: o lançamento "Aniversário Duda" ganha a tag de mesmo nome.
  { de: "Presente|",               cat: "Doações e Presentes", sub: "Presente", tags: ["Aniversário Duda"] },

  // ---- Vestuário / Eletrônicos ----
  // DECIDIDO: óculos é acessório de vestuário; o resto é eletrônico.
  { de: "Acessório|", quando: (t) => /[oó]culos/i.test(t.descricao), cat: "Vestuário",   sub: "Acessório" },
  { de: "Acessório|",                                                cat: "Eletrônicos", sub: "Celular e acessórios" },
  // DECIDIDO: Birken(stock) é calçado.
  { de: "Vestimenta|",             cat: "Vestuário", sub: "Calçado" },

  // ---- Receitas ----
  { de: "Entrada|Salário",         cat: "Receitas", sub: "Salário", tipo: "receita" },
  { de: "Entrada|Mesada",          cat: "Receitas", sub: "Mesada",  tipo: "receita" },

  // ---- Reembolsos -> tipo Estorno (abatem despesa, não somam receita) ----
  { de: "Reembolso|América",        cat: "Receitas", sub: "Reembolso recebido", tipo: "estorno", tags: ["América"] },
  { de: "Reembolso|Destine",        cat: "Receitas", sub: "Reembolso recebido", tipo: "estorno", tags: ["Destine"] },
  { de: "Reembolso|Produtiva",      cat: "Receitas", sub: "Reembolso recebido", tipo: "estorno", tags: ["Produtiva"] },
  { de: "Reembolso|SJ Ronda Jovem", cat: "Receitas", sub: "Reembolso recebido", tipo: "estorno", tags: ["Ronda Jovem"] },
  { de: "Reembolso|",               cat: "Receitas", sub: "Reembolso recebido", tipo: "estorno" },
];

function acharRegra(t) {
  const chave = `${t.categoria || ""}|${t.subcategoria || ""}`;
  const candidatas = REGRAS.filter((r) => r.de === chave);
  return candidatas.find((r) => r.quando && r.quando(t)) || candidatas.find((r) => !r.quando) || null;
}

// =====================================================================
// CARREGA AS LISTAS OFICIAIS
// =====================================================================
const [cats, subs, tags, trans] = await Promise.all([
  sb.from("categorias").select("id, nome"),
  sb.from("subcategorias").select("id, nome, categoria_id"),
  sb.from("tags").select("id, nome"),
  sb.from("transactions").select("*").order("data"),
]);

for (const [nome, r] of [["categorias", cats], ["subcategorias", subs], ["tags", tags], ["transactions", trans]]) {
  if (r.error) {
    console.log(`ERRO ao ler ${nome}: ${r.error.message}`);
    console.log("Voce rodou o supabase/migration-002-novo-modelo.sql no Supabase?");
    process.exit(1);
  }
}

const idCat = Object.fromEntries(cats.data.map((c) => [c.nome, c.id]));
const idTag = Object.fromEntries(tags.data.map((t) => [t.nome, t.id]));
const idSub = {};
for (const s of subs.data) {
  const nomeCat = cats.data.find((c) => c.id === s.categoria_id)?.nome;
  idSub[`${nomeCat}|${s.nome}`] = s.id;
}

if (cats.data.length !== 8) {
  console.log(`ERRO: esperava 8 categorias, encontrei ${cats.data.length}. Rode o migration-002 primeiro.`);
  process.exit(1);
}

// =====================================================================
// MONTA O PLANO
// =====================================================================
const plano = [];
const problemas = [];

for (const t of trans.data) {
  const r = acharRegra(t);
  if (!r) {
    problemas.push(`SEM REGRA: ${t.data} | ${t.descricao} | ${t.categoria}/${t.subcategoria ?? "-"}`);
    continue;
  }
  const catId = idCat[r.cat];
  const subId = idSub[`${r.cat}|${r.sub}`];
  if (!catId) problemas.push(`CATEGORIA INEXISTENTE: ${r.cat}`);
  if (!subId) problemas.push(`SUBCATEGORIA INEXISTENTE: ${r.cat}/${r.sub}`);

  const tipoNovo = r.tipo || (t.tipo === "saida" ? "despesa" : "receita");
  const tagsNovas = r.tags || [];
  for (const nome of tagsNovas) {
    if (!idTag[nome]) problemas.push(`TAG INEXISTENTE: ${nome}`);
  }

  plano.push({
    id: t.id,
    data: t.data,
    descricao: t.descricao,
    deCat: t.categoria,
    deSub: t.subcategoria || "",
    deTipo: t.tipo,
    valor: Number(t.valor),
    paraCat: r.cat,
    paraSub: r.sub,
    paraTipo: tipoNovo,
    catId,
    subId,
    estab: r.estab || null,
    tags: tagsNovas,
  });
}

// =====================================================================
// RELATÓRIO
// =====================================================================
console.log(APLICAR ? "=== MODO: APLICANDO DE VERDADE ===\n" : "=== MODO: SIMULACAO (nada sera gravado) ===\n");

console.log(`Lancamentos lidos: ${trans.data.length}`);
console.log(`Lancamentos mapeados: ${plano.length}`);
console.log(`Problemas: ${problemas.length}\n`);

if (problemas.length) {
  console.log("--- PROBLEMAS ---");
  [...new Set(problemas)].forEach((p) => console.log("  " + p));
  console.log("");
}

// Agrupado por transformação
const grupos = {};
for (const p of plano) {
  const k = `${p.deCat}/${p.deSub || "-"} (${p.deTipo})  ->  ${p.paraCat}/${p.paraSub} (${p.paraTipo})${p.estab ? ` [estab: ${p.estab}]` : ""}${p.tags.length ? ` [tags: ${p.tags.join(", ")}]` : ""}`;
  grupos[k] = grupos[k] || { qtd: 0, total: 0 };
  grupos[k].qtd += 1;
  grupos[k].total += p.valor;
}

console.log("--- ANTES  ->  DEPOIS ---");
Object.entries(grupos)
  .sort((a, b) => b[1].qtd - a[1].qtd)
  .forEach(([k, v]) => console.log(`  ${String(v.qtd).padStart(2)}x  R$ ${v.total.toFixed(2).padStart(8)}  ${k}`));

// Contagem por tipo novo
const porTipo = {};
plano.forEach((p) => (porTipo[p.paraTipo] = (porTipo[p.paraTipo] || 0) + 1));
console.log("\n--- TIPOS DEPOIS ---");
Object.entries(porTipo).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

// CSV detalhado
const destino = path.join(homedir(), "Backups-ControleFinanceiro");
mkdirSync(destino, { recursive: true });
const csv = [
  "data;descricao;cat_antiga;sub_antiga;tipo_antigo;valor;cat_nova;sub_nova;tipo_novo;estabelecimento;tags",
  ...plano.map((p) =>
    [p.data, p.descricao, p.deCat, p.deSub, p.deTipo, p.valor.toFixed(2), p.paraCat, p.paraSub, p.paraTipo, p.estab || "", p.tags.join(", ")]
      .map((v) => (/[";\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v))
      .join(";")
  ),
].join("\r\n");
const arquivoCsv = path.join(destino, "plano-migracao.csv");
writeFileSync(arquivoCsv, "﻿" + csv, "utf8");
console.log(`\nDetalhe dos ${plano.length} lancamentos salvo em:\n  ${arquivoCsv}`);

// =====================================================================
// APLICAÇÃO
// =====================================================================
if (!APLICAR) {
  console.log("\nNada foi gravado. Para aplicar de verdade:");
  console.log("  node scripts/migrar-categorias.mjs --aplicar");
} else if (problemas.length) {
  console.log("\n*** ABORTADO: existem problemas acima. Nada foi gravado. ***");
  process.exitCode = 1;
} else {
  let ok = 0;
  for (const p of plano) {
    const { error } = await sb
      .from("transactions")
      .update({
        categoria_id: p.catId,
        subcategoria_id: p.subId,
        categoria: p.paraCat,       // mantém o texto em dia (o app antigo ainda lê daqui)
        subcategoria: p.paraSub,
        tipo: p.paraTipo,
        estabelecimento: p.estab,
        data_atualizacao: new Date().toISOString(),
      })
      .eq("id", p.id);
    if (error) {
      console.log(`FALHOU ${p.descricao}: ${error.message}`);
      continue;
    }
    for (const nome of p.tags) {
      const { error: e2 } = await sb
        .from("transacao_tags")
        .upsert({ transacao_id: p.id, tag_id: idTag[nome] }, { onConflict: "transacao_id,tag_id" });
      if (e2) console.log(`FALHOU tag ${nome} em ${p.descricao}: ${e2.message}`);
    }
    ok += 1;
  }

  console.log(`\nMIGRACAO CONCLUIDA: ${ok}/${plano.length} lancamentos atualizados.`);
  if (ok !== plano.length) process.exitCode = 1;
}
