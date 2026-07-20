import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8");
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)[1].trim();
const sb = createClient(url, key);

const tabelas = ["transactions", "pendencias", "categorias", "subcategorias"];
for (const t of tabelas) {
  const { error, count } = await sb.from(t).select("*", { count: "exact" }).limit(1);
  if (error) console.log(`FALHOU ${t}: ${error.message}`);
  else console.log(`OK ${t}: ${count} registros`);
}
