// Parser de PDF de extrato bancário (roda no navegador).
// Extrai texto com pdfjs-dist e tenta achar linhas: DATA | DESCRIÇÃO | VALOR.

let pdfjsPromise = null;

async function carregarPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import("pdfjs-dist");
      // Worker via CDN (mesma versão do pacote em package.json).
      pdfjs.GlobalWorkerOptions.workerSrc =
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs";
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

// Extrai todo o texto do PDF, preservando quebras de linha aproximadas.
export async function extrairTextoPDF(file) {
  const pdfjs = await carregarPdfjs();
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  let linhas = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    // Agrupa itens por posição vertical (mesma linha ~ mesmo Y).
    const porLinha = new Map();
    for (const item of content.items) {
      const y = Math.round(item.transform[5]);
      if (!porLinha.has(y)) porLinha.set(y, []);
      porLinha.get(y).push({ x: item.transform[4], str: item.str });
    }
    const ys = [...porLinha.keys()].sort((a, b) => b - a); // topo -> base
    for (const y of ys) {
      const texto = porLinha
        .get(y)
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (texto) linhas.push(texto);
    }
  }
  return linhas;
}

// Converte "34.76", "34,76", "1.234,56", "1,234.56" -> número.
function parseValor(bruto) {
  let s = bruto.replace(/[^\d.,-]/g, "");
  if (s.includes(",") && s.includes(".")) {
    // Assume o último separador como decimal.
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

// ---- Formato "clássico": DATA (DD/MM/AAAA) na própria linha ----
const RE_DATA_LINHA = /(\d{2}\/\d{2}\/\d{4})/;

// ---- Formato Banco Inter: data por extenso como título de seção ----
const MESES = {
  janeiro: "01", fevereiro: "02", "março": "03", marco: "03", abril: "04",
  maio: "05", junho: "06", julho: "07", agosto: "08", setembro: "09",
  outubro: "10", novembro: "11", dezembro: "12",
};
// Ex.: "20 de Junho de 2026 Saldo do dia: R$ 424,53"
const RE_CABECALHO_DATA = /^(\d{1,2})\s+de\s+([A-Za-zçÇ]+)\s+de\s+(\d{4})/i;

// Todos os valores monetários da linha, com sinal. Ex.: "-R$ 42,00", "R$ 12,00"
const RE_VALORES = /(-?)\s*R\$\s*([\d.]+,\d{2})/g;

// Rótulos de transação do Inter (e afins).
const RE_TIPO = /(compra no d[ée]bito|compra no cr[ée]dito|pix enviado|pix recebido|pagamento efetuado|pagamento|transfer[êe]ncia|d[ée]bito|estorno|resgate|aplica[çc][ãa]o)/i;

function cabecalhoData(linha) {
  const m = linha.match(RE_CABECALHO_DATA);
  if (!m) return null;
  const mes = MESES[m[2].toLowerCase()];
  if (!mes) return null;
  const dia = m[1].padStart(2, "0");
  return `${dia}/${mes}/${m[3]}`; // DD/MM/AAAA
}

// Limpa a descrição de ruídos comuns do Inter.
function limparDescricao(bruto) {
  let d = String(bruto || "").trim();
  // Pega o conteúdo entre aspas, se houver.
  const aspas = d.match(/"([^"]+)"/);
  if (aspas) d = aspas[1];
  d = d
    .replace(/^No estabelecimento\s+/i, "")
    .replace(/^Cp\s*:\s*\d+\s*-\s*/i, "") // "Cp :123-Fulano"
    .replace(/^\d{4,5}\s+\d[\d\s]*\s+/, "") // "00019 291836364 " (ag + conta)
    .replace(/\s+/g, " ")
    .trim();
  return d || "(sem descrição)";
}

// A partir das linhas de texto, extrai transações {data, descricao, valor, valorBruto}.
export function extrairTransacoes(linhas) {
  const out = [];
  let dataSecao = null; // data corrente (formato Inter)

  for (const linha of linhas) {
    // 1) Atualiza a data se a linha for um cabeçalho de dia (Inter).
    const dh = cabecalhoData(linha);
    if (dh) {
      dataSecao = dh;
      continue; // cabeçalho não é transação
    }

    // 2) Descobre os valores da linha.
    const valores = [...linha.matchAll(RE_VALORES)];
    const temTipo = RE_TIPO.test(linha);
    const temAspas = linha.includes('"');
    const mDataLinha = linha.match(RE_DATA_LINHA);

    // Precisa de pelo menos um valor e "cara" de transação.
    if (valores.length === 0) continue;
    if (!temTipo && !temAspas && !mDataLinha) continue;

    // 3) O 1º valor é o da transação (o último costuma ser o saldo).
    const primeiro = valores[0];
    const sinal = primeiro[1] === "-" ? -1 : 1;
    const num = parseValor(primeiro[2]);
    if (num === null) continue;
    const valorBruto = sinal * Math.abs(num);

    // 4) Data: cabeçalho do Inter, ou data na própria linha (formato clássico).
    const data = mDataLinha ? mDataLinha[1] : dataSecao;
    if (!data) continue; // sem data não dá pra registrar

    // 5) Descrição: remove data e valores, depois limpa.
    let descricaoBruta = linha;
    if (mDataLinha) descricaoBruta = descricaoBruta.replace(mDataLinha[1], "");
    descricaoBruta = descricaoBruta.replace(RE_VALORES, "");

    out.push({
      data,
      descricao: limparDescricao(descricaoBruta),
      valor: Math.abs(valorBruto),
      valorBruto,
    });
  }
  return out;
}

// Chave de duplicata: data + descrição normalizada + valor.
export function chaveDuplicata({ data, descricao, valor }) {
  return `${data}|${String(descricao).toLowerCase().trim()}|${Number(valor).toFixed(2)}`;
}
