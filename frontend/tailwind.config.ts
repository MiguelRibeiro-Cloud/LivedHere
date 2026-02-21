import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#3A9D98',
        sand: '#F5EEE2',
        accent: '#EB8D47'
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.2rem'
      }
    }
  },
  plugins: []
};

export default config;
