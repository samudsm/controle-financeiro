-- =====================================================================
-- MIGRATION 003 — Lançamentos ignorados na importação
-- Rode este arquivo INTEIRO no SQL Editor do Supabase, uma vez só.
--
-- SEGURANÇA: só CRIA uma tabela nova. Não altera nem apaga nada existente.
--
-- Para que serve: ao reimportar o mesmo extrato, certos lançamentos
-- reaparecem toda vez e precisam ser desmarcados na mão. Marcando-os como
-- ignorados, eles somem da lista de importação de vez.
-- =====================================================================

create table if not exists importacoes_ignoradas (
  id        uuid primary key default gen_random_uuid(),
  -- 'lancamento' = só aquele lançamento exato (data + descrição + valor)
  -- 'descricao'  = qualquer lançamento com aquela descrição, em qualquer data
  criterio  text not null check (criterio in ('lancamento', 'descricao')),
  chave     text not null,   -- versão normalizada, usada na comparação
  rotulo    text,            -- texto amigável, para mostrar em Configurações
  criado_em timestamptz default now()
);

-- Impede cadastrar duas vezes a mesma regra.
create unique index if not exists idx_ignorados_unico
  on importacoes_ignoradas(criterio, chave);

-- ---------- SEGURANÇA (RLS) — mesmo padrão das outras tabelas ----------
alter table importacoes_ignoradas enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'importacoes_ignoradas' and policyname = 'anon_all_ignorados'
  ) then
    create policy anon_all_ignorados on importacoes_ignoradas
      for all using (true) with check (true);
  end if;
end $$;

-- ---------- CONFERÊNCIA ----------
select 'importacoes_ignoradas criada' as resultado, count(*) as registros
from importacoes_ignoradas;
