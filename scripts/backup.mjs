// Backup completo do banco. SÓ LÊ — nunca altera nada.
// Uso: node scripts/backup.mjs
// Salva em C:\Users\samue\Backups-ControleFinanceiro\backup-AAAA-MM-DD-HHMM\
import { createClient } from "@supabase/supabase-js";
import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { homedir } from "os";
import path from "path";

const env = readFileSync(".env.local", "utf8");
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)[1].trim();
const sb = createClient(url, key);

const TABELAS = ["transactions", "pendencias", "categorias", "subcategorias"];

const agora = new Date();
const z = (n) => String(n).padStart(2, "0");
const carimbo = `${agora.getFullYear()}-${z(agora.getMonth() + 1)}-${z(agora.getDate())}-${z(agora.getHours())}${z(agora.getMinutes())}`;

const destino = path.join(homedir(), "Backups-ControleFinanceiro", `backup-${carimbo}`);
mkdirSync(destino, { recursive: true });

// Converte lista de objetos em CSV (para abrir no Excel).
function paraCSV(linhas) {
  if (!linhas.length) return "";
  const colunas = [...new Set(linhas.flatMap((l) => Object.keys(l)))];
  const escapar = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    colunas.join(";"),
    ...linhas.map((l) => colunas.map((c) => escapar(l[c])).join(";")),
  ].join("\r\n");
}

const resumo = {};
let falhou = false;

for (const t of TABELAS) {
  const { data, error } = await sb.from(t).select("*");
  if (error) {
    console.log(`FALHOU ${t}: ${error.message}`);
    falhou = true;
    continue;
  }
  writeFileSync(path.join(destino, `${t}.json`), JSON.stringify(data, null, 2), "utf8");
  writeFileSync(path.join(destino, `${t}.csv`), "\uFEFF" + paraCSV(data), "utf8");
  resumo[t] = data.length;
  console.log(`OK ${t}: ${data.length} registros`);
}

if (falhou) {
  console.log("\n*** BACKUP INCOMPLETO — nao prossiga com a migracao. ***");
  process.exit(1);
}

writeFileSync(
  path.join(destino, "_resumo.json"),
  JSON.stringify({ feitoEm: agora.toISOString(), registros: resumo }, null, 2),
  "utf8"
);

console.log(`\nBACKUP COMPLETO EM: ${destino}`);
