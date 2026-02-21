import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2F8F89',
        sand: '#F7F1E3',
        accent: '#E58E49'
      },
      borderRadius: {
        xl: '0.9rem'
      }
    }
  },
  plugins: []
};

export default config;
