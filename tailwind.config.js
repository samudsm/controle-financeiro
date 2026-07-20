/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cores do sistema (usadas na especificação)
        marca: "#4472C4",   // theme_color / azul principal
        receita: "#70AD47", // verde (entradas / a receber)
        despesa: "#C55A11", // vermelho-tijolo (saídas / a pagar)
      },
    },
  },
  plugins: [],
};
