# Controle Financeiro

App pessoal de controle financeiro (Next.js + Supabase). **Projeto separado** do sistema de Cobranças.

## O que já vem pronto (9 features)

1. **Importar PDF de extrato** — arrasta o PDF, o app lê as transações e marca quais já existem (duplicatas).
2. **Decompor fatura** — uma fatura de cartão vira vários itens (cada um uma transação).
3. **Autocomplete inteligente** — sugere categoria/subcategoria com base no histórico.
4. **Pendências** — A Pagar / A Receber do mês, com "Marcar como pago/recebido".
5. **Antecipar parcelas** — move as parcelas futuras para o mês atual.
6. **Editar transação e gasto fixo** — inclusive aplicar novo valor a todos os meses futuros.
7. **Filtros avançados** no histórico (categoria, tipo, data, status, busca).
8. **PWA** — instalável no celular e funciona offline (manifest + service worker).
9. **Gestos swipe** — arrastar para trocar de mês e para editar/apagar transações.

## Passo a passo para rodar

### 1. Instalar dependências
Abra o terminal nesta pasta e rode:
```
npm install
```

### 2. Criar o banco no Supabase (CONTA NOVA)
> ⚠️ Use uma conta/projeto Supabase **novo e separado** do sistema de Cobranças.

1. Crie um projeto em https://supabase.com
2. Menu **SQL Editor** → cole todo o conteúdo de `supabase/schema.sql` → **Run**.
3. Menu **Settings → API** → copie a **Project URL** e a **anon public key**.

### 3. Configurar as chaves
1. Copie `.env.local.example` para `.env.local`.
2. Preencha:
```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
```

### 4. Rodar
```
npm run dev
```
Abra http://localhost:3000

## Publicar no Vercel
1. Suba o código para um repositório no GitHub.
2. Importe no https://vercel.com
3. Em **Environment Variables**, adicione `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy.

## Observações
- O ícone do PWA está em `public/icon.svg`. Se quiser ícones PNG "oficiais" (192/512) para
  a instalação em alguns Androids antigos, gere-os e ajuste `public/manifest.json`.
- A leitura de PDF depende do padrão do extrato: `DD/MM/AAAA ... descrição ... valor`.
  Se o seu banco usa outro layout, me avise que ajusto o parser em `lib/pdf.js`.
