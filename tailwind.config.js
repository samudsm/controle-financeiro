/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // o tema é ligado pela classe "dark" no <html>
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cores de dado — cada tema tem seu valor próprio (ver globals.css)
        marca: "var(--marca)",
        receita: "var(--receita)",
        despesa: "var(--despesa)",

        // Superfícies
        superficie: "var(--superficie)",
        "superficie-2": "var(--superficie-2)",
        plano: "var(--plano)",

        // A escala de cinzas vem das variáveis e é invertida no tema escuro.
        // É isso que faz bg-neutral-100, text-neutral-500 e border-neutral-200
        // funcionarem nos dois temas sem variante em cada elemento.
        neutral: {
          50: "var(--n50)",
          100: "var(--n100)",
          200: "var(--n200)",
          300: "var(--n300)",
          400: "var(--n400)",
          500: "var(--n500)",
          600: "var(--n600)",
          700: "var(--n700)",
          800: "var(--n800)",
          900: "var(--n900)",
        },

        // Avisos e destaques: no escuro viram fundo profundo + texto claro,
        // em vez do bloco claro que ofuscaria.
        yellow: {
          50: "var(--y50)",
          100: "var(--y100)",
          300: "var(--y300)",
          600: "var(--y600)",
          700: "var(--y700)",
          800: "var(--y800)",
          900: "var(--y900)",
        },
        blue: {
          50: "var(--b50)",
          100: "var(--b100)",
          200: "var(--b200)",
          900: "var(--b900)",
        },
      },
    },
  },
  plugins: [],
};
