/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'transparent-yellow': 'rgba(251, 251, 138, 0.5)',
        'transparent-pink': 'rgba(255, 135, 242, 0.5)',
        'transparent-blue': 'rgba(123, 233, 255, 0.5)', 
      },
      keyframes: {
        'spin-inverse': {
          '0%': {
            transform: 'rotate(0deg)',
          },
          '100%': {
            transform: 'rotate(-360deg)', // Anticlockwise rotation
          },
        },
      },
      animation: {
          'spin-slow': 'spin 8s linear infinite',
          'spin-mid': 'spin 5s linear infinite',
          'spin-fast': 'spin 2s linear infinite',
          'spin-slow-inverse': 'spin-inverse 8s linear infinite',
          'spin-mid-inverse': 'spin-inverse 5s linear infinite',
          'spin-fast-inverse': 'spin-inverse 2s linear infinite',
      },
      fontFamily: {
        handjet: ['Handjet', 'sans-serif'], // Define the custom font family
      },
    },
    backgroundImage: {
      'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      'gradient-radial-left': 'radial-gradient(ellipse at left, var(--tw-gradient-stops))',
      'gradient-radial-right': 'radial-gradient(ellipse at right, var(--tw-gradient-stops))',
      'gradient-radial-top': 'radial-gradient(ellipse at 80% 20%, var(--tw-gradient-stops))',
    },
  },
  plugins: [],
}

