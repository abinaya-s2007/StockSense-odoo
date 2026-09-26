/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#12181F',
        panel: '#182029',
        line: '#2A3542',
        accent: '#3FA9F5',
        accent2: '#5FE3A1',
        warn: '#F2A93B',
        danger: '#F0665A'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      }
    }
  },
  plugins: []
};
