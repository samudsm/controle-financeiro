-- =====================================================================
-- ####################################################################
-- ##  JA FOI APLICADO EM 30/07/2026. NAO RODE DE NOVO.               ##
-- ##                                                                 ##
-- ##  Rodar outra vez da este erro, de proposito:                    ##
-- ##    violates foreign key constraint fk_transactions_subcategoria ##
-- ##                                                                 ##
-- ##  E a trava de integridade barrando o "delete from subcategorias"##
-- ##  da secao 4. Nada e perdido quando isso acontece, mas o arquivo  ##
-- ##  certo para novidades e o migration-003 em diante.               ##
-- ####################################################################
-- =====================================================================
-- MIGRATION 002 — Novo modelo de categorias
-- Rode este arquivo INTEIRO no SQL Editor do Supabase, uma vez só.
--
-- SEGURANÇA: este script NÃO apaga nenhum lançamento (tabela transactions).
-- Ele só ADICIONA colunas e tabelas novas, e troca as listas de
-- categorias/subcategorias (que são só listas de apoio — os lançamentos
-- guardam o nome em texto, então não perdem nada).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. COLUNAS NOVAS EM transactions
--    As colunas antigas (categoria, subcategoria em texto) continuam lá,
--    de propósito: servem de rede de segurança durante a transição.
-- ---------------------------------------------------------------------
alter table transactions add column if not exists categoria_id     uuid;
alter table transactions add column if not exists subcategoria_id  uuid;
alter table transactions add column if not exists estabelecimento  text;
alter table transactions add column if not exists forma_pagamento  text;

-- ---------------------------------------------------------------------
-- 2. TAGS (N-N com lançamentos)
-- ---------------------------------------------------------------------
create table if not exists tags (
  id   uuid primary key default gen_random_uuid(),
  nome text unique not null
);

create table if not exists transacao_tags (
  transacao_id uuid references transactions(id) on delete cascade,
  tag_id       uuid references tags(id)         on delete cascade,
  primary key (transacao_id, tag_id)
);

-- ---------------------------------------------------------------------
-- 3. ESTABELECIMENTOS (para o autocomplete)
-- ---------------------------------------------------------------------
create table if not exists estabelecimentos (
  id   uuid primary key default gen_random_uuid(),
  nome text unique not null
);

-- ---------------------------------------------------------------------
-- 4. LISTAS OFICIAIS: apaga as antigas e cadastra as novas
--    (subcategorias caem junto por causa do "on delete cascade")
-- ---------------------------------------------------------------------
delete from subcategorias;
delete from categorias;

insert into categorias (nome, tipo, cor) values
  ('Alimentação',         'despesa', '#FF6B6B'),
  ('Transporte',          'despesa', '#4ECDC4'),
  ('Vestuário',           'despesa', '#C55A11'),
  ('Lazer',               'despesa', '#FFD93D'),
  ('Assinaturas',         'despesa', '#95E1D3'),
  ('Doações e Presentes', 'despesa', '#B07AA1'),
  ('Eletrônicos',         'despesa', '#4472C4'),
  ('Receitas',            'receita', '#70AD47');

insert into subcategorias (categoria_id, nome)
select c.id, v.sub
from categorias c
join (values
  ('Alimentação','Supermercado'),
  ('Alimentação','Restaurante'),
  ('Alimentação','Lanche'),
  ('Alimentação','Delivery'),
  ('Alimentação','Bebida'),
  ('Alimentação','Doce e sobremesa'),
  ('Alimentação','Café'),

  ('Transporte','Combustível'),
  ('Transporte','App de transporte'),
  ('Transporte','Estacionamento'),
  ('Transporte','Transporte público'),
  ('Transporte','Manutenção'),

  ('Vestuário','Roupa'),
  ('Vestuário','Calçado'),
  ('Vestuário','Acessório'),

  ('Lazer','Cinema'),
  ('Lazer','Esporte'),
  ('Lazer','Jogos e aposta'),
  ('Lazer','Evento'),
  ('Lazer','Passeio'),

  ('Assinaturas','Streaming'),
  ('Assinaturas','Música'),
  ('Assinaturas','Software'),
  ('Assinaturas','Academia'),

  ('Doações e Presentes','Presente'),
  ('Doações e Presentes','Dízimo e ofertas'),
  ('Doações e Presentes','Doação'),

  ('Eletrônicos','Celular e acessórios'),
  ('Eletrônicos','Informática'),
  ('Eletrônicos','Áudio e vídeo'),

  ('Receitas','Salário'),
  ('Receitas','Mesada'),
  ('Receitas','Freelance'),
  ('Receitas','Venda'),
  ('Receitas','Rendimento'),
  ('Receitas','Reembolso recebido')
) as v(cat, sub) on v.cat = c.nome;

-- Garante que não existam duas subcategorias com o mesmo nome na mesma categoria
create unique index if not exists idx_subcategoria_unica
  on subcategorias(categoria_id, nome);

-- ---------------------------------------------------------------------
-- 5. SEED DE TAGS E ESTABELECIMENTOS
--    "SJ Ronda Jovem" e "Ronda" foram unificadas em "Ronda Jovem".
-- ---------------------------------------------------------------------
insert into tags (nome) values
  ('Aniversário Duda'),
  ('Aniversário Carol'),
  ('Ronda Jovem'),
  ('América'),
  ('Destine'),
  ('Produtiva')
on conflict (nome) do nothing;

insert into estabelecimentos (nome) values
  ('McDonalds'),
  ('Bonarabe'),
  ('Nemo'),
  ('Spotify')
on conflict (nome) do nothing;

-- ---------------------------------------------------------------------
-- 6. CHAVES ESTRANGEIRAS (a "amarração" entre as tabelas)
--    on delete restrict = o banco recusa apagar uma categoria que ainda
--    tenha lançamentos usando ela. É a trava de integridade que você pediu.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_transactions_categoria') then
    alter table transactions
      add constraint fk_transactions_categoria
      foreign key (categoria_id) references categorias(id) on delete restrict;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'fk_transactions_subcategoria') then
    alter table transactions
      add constraint fk_transactions_subcategoria
      foreign key (subcategoria_id) references subcategorias(id) on delete restrict;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 7. SEGURANÇA (RLS) NAS TABELAS NOVAS — mesmo padrão das existentes
-- ---------------------------------------------------------------------
alter table tags             enable row level security;
alter table transacao_tags   enable row level security;
alter table estabelecimentos enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename='tags' and policyname='anon_all_tags') then
    create policy anon_all_tags on tags for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='transacao_tags' and policyname='anon_all_transacao_tags') then
    create policy anon_all_transacao_tags on transacao_tags for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='estabelecimentos' and policyname='anon_all_estabelecimentos') then
    create policy anon_all_estabelecimentos on estabelecimentos for all using (true) with check (true);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 8. CONFERÊNCIA — deve mostrar 8 categorias, 36 subcategorias,
--    6 tags, 4 estabelecimentos e 69 lançamentos intactos.
-- ---------------------------------------------------------------------
select 'categorias'       as tabela, count(*) from categorias
union all select 'subcategorias',     count(*) from subcategorias
union all select 'tags',              count(*) from tags
union all select 'estabelecimentos',  count(*) from estabelecimentos
union all select 'lançamentos',       count(*) from transactions;
