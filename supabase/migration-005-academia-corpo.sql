-- =====================================================================
-- MIGRATION 005 — Academia: corpo, metas e fotos (Fases 3 e 4)
-- Rode este arquivo INTEIRO no SQL Editor do Supabase, uma vez só.
--
-- SEGURANÇA: só CRIA coisas novas. Não altera nem apaga nada existente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PESO CORPORAL
-- ---------------------------------------------------------------------
create table if not exists academia_peso (
  id         uuid primary key default gen_random_uuid(),
  data       date not null unique,          -- um registro por dia
  peso       numeric(5,2) not null,
  observacao text,
  criado_em  timestamptz default now()
);

create index if not exists idx_peso_data on academia_peso(data desc);

-- ---------------------------------------------------------------------
-- MEDIDAS CORPORAIS
-- Modelo flexível: cada linha é uma medida de um tipo numa data.
-- Assim dá para acrescentar medidas personalizadas sem mexer no banco.
-- ---------------------------------------------------------------------
create table if not exists academia_medidas (
  id         uuid primary key default gen_random_uuid(),
  data       date not null,
  tipo       text not null,                 -- 'Braço direito', 'Cintura', ...
  valor      numeric(6,2) not null,
  unidade    text default 'cm',
  observacao text,
  criado_em  timestamptz default now()
);

create unique index if not exists idx_medida_unica on academia_medidas(data, tipo);
create index if not exists idx_medidas_tipo on academia_medidas(tipo, data desc);

-- ---------------------------------------------------------------------
-- FOTOS DE PROGRESSO
-- O arquivo vai para o Storage; aqui fica só a referência.
-- ---------------------------------------------------------------------
create table if not exists academia_fotos (
  id         uuid primary key default gen_random_uuid(),
  data       date not null,
  categoria  text not null default 'frente',  -- frente | lado | costas
  caminho    text not null,                   -- caminho dentro do bucket
  observacao text,
  criado_em  timestamptz default now()
);

create index if not exists idx_fotos_data on academia_fotos(data desc);

-- ---------------------------------------------------------------------
-- METAS
-- ---------------------------------------------------------------------
create table if not exists academia_metas (
  id           uuid primary key default gen_random_uuid(),
  tipo         text not null,               -- exercicio | peso_corporal | treinos_mes | livre
  titulo       text not null,
  exercicio_id uuid references academia_exercicios(id) on delete set null,
  alvo_peso    numeric(7,2),                -- para meta de exercício
  alvo_reps    integer,
  alvo_valor   numeric(10,2),               -- para peso corporal / nº de treinos
  prazo        date,
  concluida    boolean default false,
  criado_em    timestamptz default now()
);

-- ---------------------------------------------------------------------
-- SEGURANÇA (RLS)
-- ---------------------------------------------------------------------
alter table academia_peso    enable row level security;
alter table academia_medidas enable row level security;
alter table academia_fotos   enable row level security;
alter table academia_metas   enable row level security;

do $$
declare t text;
begin
  foreach t in array array['academia_peso','academia_medidas','academia_fotos','academia_metas'] loop
    if not exists (select 1 from pg_policies where tablename = t and policyname = 'anon_all_' || t) then
      execute format('create policy %I on %I for all using (true) with check (true)', 'anon_all_' || t, t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- STORAGE PARA AS FOTOS
-- Cria o bucket e libera leitura/escrita, no mesmo padrão do resto do app
-- (uso pessoal, sem login).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('progresso', 'progresso', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'progresso_leitura') then
    create policy progresso_leitura on storage.objects
      for select using (bucket_id = 'progresso');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'progresso_escrita') then
    create policy progresso_escrita on storage.objects
      for insert with check (bucket_id = 'progresso');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'progresso_exclusao') then
    create policy progresso_exclusao on storage.objects
      for delete using (bucket_id = 'progresso');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- CONFERÊNCIA
-- ---------------------------------------------------------------------
select 'peso' as tabela, count(*) as registros from academia_peso
union all select 'medidas', count(*) from academia_medidas
union all select 'fotos',   count(*) from academia_fotos
union all select 'metas',   count(*) from academia_metas
union all select 'bucket',  count(*) from storage.buckets where id = 'progresso';
