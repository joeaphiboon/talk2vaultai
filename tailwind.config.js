/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./index.tsx"
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#1e1e2e',
        'secondary': '#313244',
        'text-primary': '#cdd6f4',
        'text-secondary': '#a6adc8',
        'accent': '#89b4fa',
        'accent-hover': '#74c7ec',
      },
      keyframes: {
        typing: {
          '0%': { opacity: '0.2' },
          '20%': { opacity: '1' },
          '100%': { opacity: '0.2' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        }
      },
      animation: {
        typing: 'typing 1.4s infinite',
        fadeIn: 'fadeIn 0.3s ease-out',
      }
    }
  },
  plugins: [],
}