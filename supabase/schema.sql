-- =====================================================================
-- Controle Financeiro — estrutura do banco (Supabase / PostgreSQL)
-- Rode este arquivo inteiro no SQL Editor do Supabase (uma vez só).
-- =====================================================================

-- ---------- TRANSAÇÕES ----------
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  descricao text not null,
  categoria text not null,
  subcategoria text,
  tipo text not null,                 -- 'entrada' | 'saida' | 'reembolso'
  valor decimal(10, 2) not null,      -- sempre positivo; o "tipo" define o sinal
  parcela_numero integer,
  parcela_total integer,
  notas text,
  status text default 'pago',         -- 'pago' | 'pendente'
  is_fixa boolean default false,
  antecipado boolean default false,
  data_criacao timestamptz default now(),
  data_atualizacao timestamptz default now()
);

create index if not exists idx_transactions_data on transactions(data);
create index if not exists idx_transactions_categoria on transactions(categoria);
create index if not exists idx_transactions_tipo on transactions(tipo);

-- ---------- PENDÊNCIAS (A pagar / A receber) ----------
create table if not exists pendencias (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  tipo text not null,                 -- 'a_pagar' | 'a_receber'
  valor decimal(10, 2) not null,
  status text default 'pendente',     -- 'pendente' | 'pago' | 'recebido'
  data_vencimento date,
  mes_referencia varchar(7),          -- 'YYYY-MM'
  data_criacao timestamptz default now()
);

create index if not exists idx_pendencias_mes on pendencias(mes_referencia);
create index if not exists idx_pendencias_tipo on pendencias(tipo);

-- ---------- CATEGORIAS ----------
create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  nome text unique not null,
  cor text,
  tipo text
);

insert into categorias (nome, cor, tipo) values
  ('Comida', '#FF6B6B', 'despesa'),
  ('Combustível', '#4ECDC4', 'despesa'),
  ('Streaming', '#95E1D3', 'despesa'),
  ('Entrada', '#70AD47', 'receita'),
  ('Reembolso', '#70AD47', 'receita'),
  ('Cartão Parcelado', '#C55A11', 'despesa'),
  ('Presente', '#FFD93D', 'despesa'),
  ('Outros', '#E7E6E6', 'despesa')
on conflict (nome) do nothing;

-- ---------- SUBCATEGORIAS ----------
create table if not exists subcategorias (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid references categorias(id) on delete cascade,
  nome text not null,
  created_at timestamptz default now()
);

create index if not exists idx_subcategorias_categoria on subcategorias(categoria_id);

-- =====================================================================
-- ATENÇÃO — SEGURANÇA (RLS)
-- Este app usa a chave "anon" no navegador. Como é de uso pessoal e
-- sem login, as políticas abaixo liberam leitura/escrita para a anon.
-- Se um dia adicionar login, troque por políticas por usuário.
-- =====================================================================
alter table transactions  enable row level security;
alter table pendencias    enable row level security;
alter table categorias    enable row level security;
alter table subcategorias enable row level security;

do $$
begin
  -- transactions
  if not exists (select 1 from pg_policies where tablename='transactions' and policyname='anon_all_transactions') then
    create policy anon_all_transactions on transactions for all using (true) with check (true);
  end if;
  -- pendencias
  if not exists (select 1 from pg_policies where tablename='pendencias' and policyname='anon_all_pendencias') then
    create policy anon_all_pendencias on pendencias for all using (true) with check (true);
  end if;
  -- categorias
  if not exists (select 1 from pg_policies where tablename='categorias' and policyname='anon_all_categorias') then
    create policy anon_all_categorias on categorias for all using (true) with check (true);
  end if;
  -- subcategorias
  if not exists (select 1 from pg_policies where tablename='subcategorias' and policyname='anon_all_subcategorias') then
    create policy anon_all_subcategorias on subcategorias for all using (true) with check (true);
  end if;
end $$;
