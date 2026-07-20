import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Se as variáveis não estiverem configuradas, o app ainda abre, mas mostra aviso.
export const supabaseConfigurado = Boolean(url && anon);

export const supabase = supabaseConfigurado
  ? createClient(url, anon)
  : null;
