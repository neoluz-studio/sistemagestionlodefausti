import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'brand-deep': '#123E63',
        'brand-mid': '#2F6FA3',
        'brand-light': '#DCEFFD',
        'brand-snow': '#F8FBFF',
      },
    },
  },
  plugins: [],
};

export default config;
