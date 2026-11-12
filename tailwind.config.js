/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        arena: '#F5EFE4', // fondo
        selva: '#1F4D3F', // primario y texto
        terracota: '#C8693D', // secundario
        oro: '#D9A441', // acento
        noche: '#20302A', // detalles / labels
        salvia: '#8FA892', // detalles / labels
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans: ['"Source Sans 3"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
