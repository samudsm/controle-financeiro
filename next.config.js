/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // As telas do financeiro mudaram de /x para /financeiro/x quando o app
  // virou multi-módulo. Estes redirecionamentos mantêm funcionando:
  // o atalho já instalado no celular (que abre em /dashboard), favoritos
  // e qualquer link antigo.
  async redirects() {
    const telas = ["dashboard", "upload", "historico", "pendencias", "configuracoes"];
    return telas.map((t) => ({
      source: `/${t}`,
      destination: `/financeiro/${t}`,
      permanent: false, // 307: não fica gravado no navegador para sempre
    }));
  },
};

module.exports = nextConfig;
