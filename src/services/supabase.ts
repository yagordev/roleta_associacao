import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials are missing. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Premio = {
  id: string;
  nome: string;
  quantidade_estoque: number;
  peso: number;
  criado_em: string;
};

export type Doador = {
  id: string;
  nome: string;
  valor_doado: number;
  giros_totais: number;
  giros_restantes: number;
  codigo_acesso: string;
  criado_em: string;
};

export type Ganhador = {
  id: string;
  doador_nome: string;
  premio_nome: string;
  criado_em: string;
};
