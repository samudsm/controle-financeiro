# Meu Painel

App pessoal com módulos (Next.js + Supabase + Tailwind). PWA, instalável no celular.

- **No ar:** https://controle-financeiro-zeta-swart.vercel.app
- **Repositório:** https://github.com/samudsm/controle-financeiro
- **Painel do Vercel:** https://vercel.com/samudsm/controle-financeiro

> O nome da pasta e do repositório ainda é `controle-financeiro`, de quando o app só
> tinha o módulo financeiro. Renomear quebraria o link do GitHub, então ficou assim.

## Módulos

A raiz (`/`) é a escolha de módulo. Cada módulo vive na própria pasta em `app/`.

### 💰 Financeiro — `/financeiro`
| Tela | O que faz |
|---|---|
| Painel | KPIs, gráfico de pizza, "Explorar gastos" (drill-down), resumo por categoria, rankings |
| Importar | lê PDF do extrato do Inter, marca duplicatas, decompõe fatura, oculta lançamentos indesejados |
| Histórico | filtros por categoria, subcategoria, tag, tipo, data; editar e excluir |
| Pendências | a pagar / a receber do mês |
| Configurações | categorias, subcategorias, tags, estabelecimentos, ignorados na importação |

Classificação em quatro dimensões separadas: `tipo` (receita/despesa/transferência/estorno),
`categoria` + `subcategoria` (listas fechadas com FK), `estabelecimento` (texto livre) e
`tags` (N-N). Estorno **abate** despesa; transferência fica fora dos totais.

### 🏋️ Academia — `/academia`
| Tela | O que faz |
|---|---|
| Treino | registro de séries com histórico anterior à vista, cronômetro de descanso, comparação com a última vez |
| Fichas | montar treinos, configurar séries/repetições/descanso, duplicar; biblioteca de exercícios |
| Histórico | sessões anteriores, série por série |
| Evolução | volume semanal, séries por grupo muscular, consistência, insights, evolução por exercício |
| Perfil | peso, medidas, fotos de progresso, metas, calculadoras de aquecimento e anilhas, ajustes, exportação |

Uma sessão finalizada guarda **cópia** do nome da ficha e dos exercícios: alterar a ficha
depois não muda o histórico já gravado.

## Banco de dados

Rode os arquivos de `supabase/` no SQL Editor, **nesta ordem, uma vez cada**:

| Arquivo | O que cria |
|---|---|
| `schema.sql` | tabelas iniciais do financeiro |
| `migration-002-novo-modelo.sql` | ⚠️ **já aplicado** — não rode de novo |
| `migration-003-ignorados.sql` | lançamentos ocultos na importação |
| `migration-004-academia.sql` | academia: exercícios, fichas, sessões, séries |
| `migration-005-academia-corpo.sql` | peso, medidas, fotos, metas + bucket de fotos |

## Rodar neste computador

```
npm install
npm run dev
```
Abra http://localhost:3000

As chaves ficam em `.env.local` (não vai para o GitHub):
```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
```

> ⚠️ **Não rode `npm run build` com o `npm run dev` ligado.** Os dois usam a pasta
> `.next` e brigam, o que gera erro `MODULE_NOT_FOUND` no servidor. Pare o dev,
> compile, e suba de novo.

## Scripts

| Comando | O que faz |
|---|---|
| `node scripts/backup.mjs` | baixa todas as tabelas em JSON e CSV para `~/Backups-ControleFinanceiro/` |
| `node scripts/migrar-categorias.mjs` | simula a migração de categorias (não grava) |
| `node scripts/testar-conexao.mjs` | confere o acesso ao Supabase |

## Observações

- O service worker (`public/sw.js`) usa cache-first em `/_next/`. Ao publicar mudanças
  grandes, **suba o número do `CACHE`** — é o que expira a versão antiga no celular.
  Em `localhost` o SW é desregistrado de propósito, senão as alterações não aparecem.
- A leitura de PDF depende do layout do extrato (`lib/pdf.js`), ajustado para o Banco Inter.
- Paleta dos gráficos validada para daltonismo e contraste. Todo gráfico traz nome e
  valor escritos: a cor nunca é o único canal de leitura.
