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
      fontFamily: {
        handjet: ['Handjet', 'sans-serif'], // Define the custom font family
      },
    },
    backgroundImage: {
    },
  },
  plugins: [],
}

