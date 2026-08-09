-- =====================================================================
-- MIGRATION 004 — Módulo Academia (Fase 1)
-- Rode este arquivo INTEIRO no SQL Editor do Supabase, uma vez só.
--
-- SEGURANÇA: só CRIA tabelas novas, todas com prefixo "academia_".
-- Não toca em nada do módulo financeiro.
--
-- REGRA CENTRAL (item 45 da especificação):
-- uma sessão de treino guarda uma FOTOGRAFIA do que foi feito. O nome do
-- exercício e da ficha são copiados para dentro da sessão. Se a ficha mudar
-- depois, o histórico antigo continua exatamente como foi executado.
-- =====================================================================

-- ---------------------------------------------------------------------
-- BIBLIOTECA DE EXERCÍCIOS
-- ---------------------------------------------------------------------
create table if not exists academia_exercicios (
  id                 uuid primary key default gen_random_uuid(),
  nome               text not null unique,
  grupo_muscular     text not null,          -- principal
  grupos_secundarios text[] default '{}',
  equipamento        text,
  instrucoes         text,
  notas              text,                   -- notas permanentes (item 20)
  favorito           boolean default false,
  criado_em          timestamptz default now()
);

create index if not exists idx_ex_grupo on academia_exercicios(grupo_muscular);

-- ---------------------------------------------------------------------
-- PROGRAMAS (pastas) E FICHAS
-- ---------------------------------------------------------------------
create table if not exists academia_programas (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  descricao text,
  ativo     boolean default true,
  criado_em timestamptz default now()
);

create table if not exists academia_fichas (
  id          uuid primary key default gen_random_uuid(),
  programa_id uuid references academia_programas(id) on delete set null,
  nome        text not null,                -- "Push A"
  descricao   text,                         -- "Peito e Tríceps"
  ordem       integer default 0,
  arquivada   boolean default false,
  criado_em   timestamptz default now()
);

-- Exercício configurado dentro de uma ficha (o "planejado")
create table if not exists academia_ficha_exercicios (
  id             uuid primary key default gen_random_uuid(),
  ficha_id       uuid not null references academia_fichas(id) on delete cascade,
  exercicio_id   uuid not null references academia_exercicios(id) on delete restrict,
  ordem          integer default 0,
  series_alvo    integer default 3,
  reps_min       integer,
  reps_max       integer,
  descanso_seg   integer default 90,
  superset_grupo integer,                   -- mesmo número = mesma supersérie
  observacoes    text
);

create index if not exists idx_fex_ficha on academia_ficha_exercicios(ficha_id);

-- ---------------------------------------------------------------------
-- SESSÕES — o que foi REALMENTE executado
-- ---------------------------------------------------------------------
create table if not exists academia_sessoes (
  id          uuid primary key default gen_random_uuid(),
  ficha_id    uuid references academia_fichas(id) on delete set null,
  nome        text not null,                -- CÓPIA do nome da ficha
  inicio      timestamptz not null default now(),
  fim         timestamptz,
  duracao_seg integer,
  notas       text,
  finalizada  boolean default false
);

create index if not exists idx_sessoes_inicio on academia_sessoes(inicio desc);

create table if not exists academia_sessao_exercicios (
  id           uuid primary key default gen_random_uuid(),
  sessao_id    uuid not null references academia_sessoes(id) on delete cascade,
  exercicio_id uuid references academia_exercicios(id) on delete set null,
  nome         text not null,               -- CÓPIA do nome do exercício
  ordem        integer default 0,
  descanso_seg integer default 90,
  observacoes  text,
  -- item 23: registrei outro exercício porque a máquina estava ocupada
  substituiu   text
);

create index if not exists idx_sex_sessao on academia_sessao_exercicios(sessao_id);

create table if not exists academia_series (
  id                  uuid primary key default gen_random_uuid(),
  sessao_exercicio_id uuid not null references academia_sessao_exercicios(id) on delete cascade,
  numero              integer not null,
  tipo                text default 'normal',   -- aquecimento|normal|falha|dropset|backoff|top|amrap
  peso                numeric(7,2),
  reps                integer,
  rpe                 numeric(3,1),
  rir                 integer,
  concluida           boolean default false,
  observacao          text,
  criado_em           timestamptz default now()
);

create index if not exists idx_series_sex on academia_series(sessao_exercicio_id);

-- ---------------------------------------------------------------------
-- CONFIGURAÇÕES DO MÓDULO (uma linha só)
-- ---------------------------------------------------------------------
create table if not exists academia_config (
  id                 integer primary key default 1,
  unidade            text default 'kg',
  esforco            text default 'nenhum',   -- 'rpe' | 'rir' | 'nenhum'
  incremento_padrao  numeric(5,2) default 2.5,
  descanso_padrao    integer default 90,
  meta_semanal       integer default 4,
  constraint uma_linha check (id = 1)
);

insert into academia_config (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- SEGURANÇA (RLS) — mesmo padrão do resto do app
-- ---------------------------------------------------------------------
alter table academia_exercicios        enable row level security;
alter table academia_programas         enable row level security;
alter table academia_fichas            enable row level security;
alter table academia_ficha_exercicios  enable row level security;
alter table academia_sessoes           enable row level security;
alter table academia_sessao_exercicios enable row level security;
alter table academia_series            enable row level security;
alter table academia_config            enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'academia_exercicios','academia_programas','academia_fichas',
    'academia_ficha_exercicios','academia_sessoes','academia_sessao_exercicios',
    'academia_series','academia_config'
  ] loop
    if not exists (select 1 from pg_policies where tablename = t and policyname = 'anon_all_' || t) then
      execute format('create policy %I on %I for all using (true) with check (true)', 'anon_all_' || t, t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- BIBLIOTECA INICIAL DE EXERCÍCIOS
-- Para você já abrir o app com o que usar, sem cadastrar tudo na mão.
-- ---------------------------------------------------------------------
insert into academia_exercicios (nome, grupo_muscular, grupos_secundarios, equipamento) values
  -- Peito
  ('Supino reto',                  'Peito',          '{Tríceps,Ombros}', 'Barra'),
  ('Supino inclinado',             'Peito',          '{Tríceps,Ombros}', 'Barra'),
  ('Supino reto com halteres',     'Peito',          '{Tríceps,Ombros}', 'Halteres'),
  ('Supino inclinado com halteres','Peito',          '{Tríceps,Ombros}', 'Halteres'),
  ('Supino máquina',               'Peito',          '{Tríceps}',        'Máquina'),
  ('Crucifixo',                    'Peito',          '{Ombros}',         'Halteres'),
  ('Crossover',                    'Peito',          '{}',               'Cabo/polia'),
  ('Flexão de braço',              'Peito',          '{Tríceps,Ombros}', 'Peso corporal'),
  -- Costas
  ('Barra fixa',                   'Costas',         '{Bíceps}',         'Peso corporal'),
  ('Puxada frente',                'Costas',         '{Bíceps}',         'Cabo/polia'),
  ('Puxada supinada',              'Costas',         '{Bíceps}',         'Cabo/polia'),
  ('Remada curvada',               'Costas',         '{Bíceps}',         'Barra'),
  ('Remada unilateral',            'Costas',         '{Bíceps}',         'Halteres'),
  ('Remada baixa',                 'Costas',         '{Bíceps}',         'Cabo/polia'),
  ('Remada cavalinho',             'Costas',         '{Bíceps}',         'Máquina'),
  ('Pulldown',                     'Costas',         '{}',               'Cabo/polia'),
  -- Ombros
  ('Desenvolvimento militar',      'Ombros',         '{Tríceps}',        'Barra'),
  ('Desenvolvimento com halteres', 'Ombros',         '{Tríceps}',        'Halteres'),
  ('Elevação lateral',             'Ombros',         '{}',               'Halteres'),
  ('Elevação frontal',             'Ombros',         '{}',               'Halteres'),
  ('Crucifixo invertido',          'Ombros',         '{Costas}',         'Halteres'),
  ('Encolhimento',                 'Ombros',         '{Costas}',         'Halteres'),
  -- Bíceps
  ('Rosca direta',                 'Bíceps',         '{Antebraço}',      'Barra'),
  ('Rosca alternada',              'Bíceps',         '{Antebraço}',      'Halteres'),
  ('Rosca martelo',                'Bíceps',         '{Antebraço}',      'Halteres'),
  ('Rosca scott',                  'Bíceps',         '{}',               'Barra'),
  ('Rosca concentrada',            'Bíceps',         '{}',               'Halteres'),
  -- Tríceps
  ('Tríceps testa',                'Tríceps',        '{}',               'Barra'),
  ('Tríceps corda',                'Tríceps',        '{}',               'Cabo/polia'),
  ('Tríceps francês',              'Tríceps',        '{}',               'Halteres'),
  ('Mergulho entre bancos',        'Tríceps',        '{Peito}',          'Peso corporal'),
  ('Supino fechado',               'Tríceps',        '{Peito}',          'Barra'),
  -- Pernas
  ('Agachamento livre',            'Quadríceps',     '{Glúteos,Posterior de coxa}', 'Barra'),
  ('Agachamento smith',            'Quadríceps',     '{Glúteos}',        'Smith'),
  ('Leg press',                    'Quadríceps',     '{Glúteos}',        'Máquina'),
  ('Cadeira extensora',            'Quadríceps',     '{}',               'Máquina'),
  ('Hack squat',                   'Quadríceps',     '{Glúteos}',        'Máquina'),
  ('Afundo',                       'Quadríceps',     '{Glúteos}',        'Halteres'),
  ('Levantamento terra',           'Posterior de coxa', '{Costas,Glúteos}', 'Barra'),
  ('Stiff',                        'Posterior de coxa', '{Glúteos}',     'Barra'),
  ('Mesa flexora',                 'Posterior de coxa', '{}',            'Máquina'),
  ('Cadeira flexora',              'Posterior de coxa', '{}',            'Máquina'),
  ('Elevação pélvica',             'Glúteos',        '{Posterior de coxa}', 'Barra'),
  ('Cadeira abdutora',             'Glúteos',        '{}',               'Máquina'),
  ('Panturrilha em pé',            'Panturrilha',    '{}',               'Máquina'),
  ('Panturrilha sentado',          'Panturrilha',    '{}',               'Máquina'),
  -- Core
  ('Abdominal supra',              'Abdômen',        '{}',               'Peso corporal'),
  ('Prancha',                      'Abdômen',        '{}',               'Peso corporal'),
  ('Elevação de pernas',           'Abdômen',        '{}',               'Peso corporal'),
  ('Abdominal na polia',           'Abdômen',        '{}',               'Cabo/polia')
on conflict (nome) do nothing;

-- ---------------------------------------------------------------------
-- CONFERÊNCIA
-- ---------------------------------------------------------------------
select 'exercicios' as tabela, count(*) as registros from academia_exercicios
union all select 'programas',    count(*) from academia_programas
union all select 'fichas',       count(*) from academia_fichas
union all select 'sessoes',      count(*) from academia_sessoes
union all select 'config',       count(*) from academia_config;
