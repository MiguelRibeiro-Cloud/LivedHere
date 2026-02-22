import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#2FA4A9',
        sand: '#F6EFE6',
        accent: '#F4A261',
        ink: '#2D3748'
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
