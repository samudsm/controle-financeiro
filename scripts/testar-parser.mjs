import { extrairTransacoes } from "../lib/pdf.js";
import { pareceFatura } from "../lib/categorias.js";

// Linhas representativas do extrato do Banco Inter (incluindo ruídos).
const linhas = [
  "Solicitado em: 20/07/2026 - 11h58",
  "CPF/CNPJ: 117.464.544-07, Instituição: Banco Inter, Agência: 0001-9, Conta: 16223811-8",
  "Período: 20/06/2026 a 20/07/2026",
  "Saldo total R$ 258,85 (bloqueado + disponível) Saldo disponível: R$ 258,85 Saldo bloqueado: R$ 0,00",
  "20 de Junho de 2026 Saldo do dia: R$ 424,53 Valor Saldo por transação",
  'Compra no debito: "No estabelecimento BM CONSTRUCOES JOAO PESSOA BRA" -R$ 42,00 R$ 550,02',
  'Pix enviado: "Cp :18236120-Marcos Silva Fernandes" -R$ 20,00 R$ 500,02',
  'Pix recebido: "Cp :37880206-PRODUTIVA JUNIOR" R$ 12,00 R$ 512,02',
  "21 de Junho de 2026 Saldo do dia: R$ 342,83",
  'Pix enviado: "00019 291836364 FELIPE SILVA" -R$ 55,00 R$ 342,83',
  "1 de Julho de 2026 Saldo do dia: R$ 243,84",
  'Compra no debito: "No estabelecimento ARENA GRESS LTDA NATAL BRA" -R$ 34,76 -R$ 23,26',
  'Compra no debito: "No estabelecimento EBN *SPOTIFY CURITIBA BRA" -R$ 12,90 -R$ 56,16',
  'Pix recebido: "Cp :00000000-OLIVIO SOUZA MEDEIROS FH" R$ 300,00 R$ 243,84',
  "6 de Julho de 2026 Saldo do dia: R$ 724,06",
  'Pagamento efetuado: "Pagamento fatura cartao Inter" -R$ 104,95 -R$ 90,94',
  'Pix recebido: "Cp :13203354-SEUBONE COMERCIO DE BONES PERSONALIZADOS LTDA" R$ 840,00 R$ 724,06',
  "Fale com a gente",
  "SAC: 0800 940 9999 (opção 09) Ouvidoria: 0800 940 7772 Deficiência de fala e audição: 0800 979 7099",
];

const trans = extrairTransacoes(linhas);
console.log(`Total reconhecidas: ${trans.length}\n`);
for (const t of trans) {
  const f = pareceFatura(t.descricao) ? "  [FATURA]" : "";
  const sinal = t.valorBruto < 0 ? "-" : "+";
  console.log(`${t.data}  ${sinal}R$ ${t.valor.toFixed(2).padStart(7)}  ${t.descricao}${f}`);
}
