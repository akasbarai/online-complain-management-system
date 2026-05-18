/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eef7ff',
          100: '#d8edff',
          500: '#1f7ae0',
          600: '#155fba',
          700: '#124b93',
          800: '#123e74',
          900: '#102f56',
        },
        civic: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        amberline: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#d97706',
          600: '#b45309',
        },
        ink: {
          950: '#071624',
          900: '#0d2033',
          800: '#18314a',
          700: '#29445f',
        }
      },
      boxShadow: {
        premium: '0 18px 45px rgba(15, 35, 60, 0.12)',
        panel: '0 10px 28px rgba(15, 35, 60, 0.08)',
        glow: '0 12px 28px rgba(31, 122, 224, 0.22)',
      }
    },
  },
  plugins: [],
}
