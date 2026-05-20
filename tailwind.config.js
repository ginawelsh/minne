/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/renderer/**/*.{ts,tsx,html}',
    './src/renderer/index.html'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: '#f72585',
          orange: '#ff6d00',
          cyan: '#40c4ff',
          green: '#06d6a0',
          purple: '#e040fb',
          yellow: '#ffcc02'
        }
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif']
      },
      keyframes: {
        'bounce-in': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '60%': { transform: 'scale(1.05)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' }
        }
      },
      animation: {
        'bounce-in': 'bounce-in 0.4s ease-out',
        'shake': 'shake 0.4s ease-in-out'
      }
    }
  },
  plugins: []
}
