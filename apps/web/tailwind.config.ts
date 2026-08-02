import type { Config } from 'tailwindcss';
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { space: '#050816', cyan: '#37d9ff', alert: '#ff9d3b' },
      fontFamily: { mono: ['var(--font-mono)'] },
    },
  },
  plugins: [],
} satisfies Config;
