/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        z: {
          bg: '#0c0d10',
          page: '#050506',
          surface: '#1a1b1f',
          'surface-hi': '#232429',
          border: '#2b2c31',
          text: '#f2f1ed',
          'text-dim': '#8a8b92',
          'text-faint': '#57585f',
          blue: '#0a84ff',
          green: '#32d74b',
          orange: '#ff9f0a',
          purple: '#bf5af2',
          red: '#ff453a',
        }
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      animation: {
        'pulse-fast': 'pulse 1.1s infinite ease-in-out',
      }
    },
  },
  plugins: [],
}