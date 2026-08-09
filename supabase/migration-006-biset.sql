-- =====================================================================
-- MIGRATION 006 — Bi-set / supersérie na sessão de treino
-- Rode este arquivo INTEIRO no SQL Editor do Supabase, uma vez só.
--
-- SEGURANÇA: só ADICIONA uma coluna. Não altera nem apaga nada existente.
--
-- Para quê: a ficha já sabia agrupar exercícios (academia_ficha_exercicios
-- .superset_grupo), mas a sessão não guardava esse agrupamento. Sem isso o
-- histórico não lembraria que dois exercícios foram feitos emendados.
-- =====================================================================

alter table academia_sessao_exercicios
  add column if not exists superset_grupo integer;

-- Conferência: deve listar a coluna nova.
select column_name, data_type
from information_schema.columns
where table_name = 'academia_sessao_exercicios'
  and column_name = 'superset_grupo';
