import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "Faltan las variables de entorno VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. " +
      "Copiá .env.example a .env y completá con los datos de tu proyecto de Supabase."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
