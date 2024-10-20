/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      keyframes: {
        clickMove: {
          '0%': { width: '60%', height: '60%', opacity: '1' },
          '40%': { width: '120%', height: '120%', opacity: '1' },
          '100%': { width: '120%', height: '120%', opacity: '0' },
        },
        attackMove: {
          '0%': { width: '0%', height: '0%', opacity: '1' },
          '100%': { width: '80%', height: '80%', opacity: '1' },
        },
      },
      animation: {
        clickMove: 'clickMove 10s ease-in-out',
        attackMove: 'attackMove var(--attack_time) ease forwards',
      },
    },
    backgroundImage: {
      'radial-0': 'radial-gradient(farthest-side,#eb8c82, rgba(235,105,78,0))',
      'radial-1': 'radial-gradient(farthest-side,#f4b48c, rgba(235,105,78,0))',
      'radial-2': 'radial-gradient(farthest-side,#fef79a, rgba(235,105,78,0))',
      'radial-3': 'radial-gradient(farthest-side,#c8edbd, rgba(235,105,78,0))',
      'radial-4': 'radial-gradient(farthest-side,#c1f1ff, rgba(235,105,78,0))',
      'radial-5': 'radial-gradient(farthest-side,#adc6ff, rgba(235,105,78,0))',
      'radial-6': 'radial-gradient(farthest-side,#e3baef, rgba(235,105,78,0))',
    },
  },
  plugins: [],
}

