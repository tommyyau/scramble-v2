/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Block colors - vowels warm
        'block-a': '#FF6B6B',
        'block-e': '#FFE66D',
        'block-i': '#FF9FF3',
        'block-o': '#FFA07A',
        'block-u': '#FFB347',
        // Consonants cool
        'block-common': '#4ECDC4',
        'block-medium': '#48DBFB',
        'block-rare': '#A66CFF',
        // UI colors
        'primary': '#FF6B6B',
        'secondary': '#4ECDC4',
        'accent': '#FFE66D',
      },
      animation: {
        'bounce-in': 'bounceIn 0.3s ease-out',
        'pop': 'pop 0.3s ease-out',
        'float-up': 'floatUp 1s ease-out forwards',
        'shake': 'shake 0.5s ease-in-out',
        'sparkle': 'sparkle 0.6s ease-out forwards',
        'pulse-glow': 'pulseGlow 1s ease-in-out infinite',
        'land': 'land 0.15s ease-out',
      },
      keyframes: {
        bounceIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(0)', opacity: '0' },
        },
        floatUp: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-50px)', opacity: '0' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        sparkle: {
          '0%': { transform: 'scale(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(180deg)', opacity: '0' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px currentColor' },
          '50%': { boxShadow: '0 0 20px currentColor' },
        },
        land: {
          '0%': { transform: 'scaleY(0.9) scaleX(1.1)' },
          '50%': { transform: 'scaleY(1.05) scaleX(0.98)' },
          '100%': { transform: 'scaleY(1) scaleX(1)' },
        },
      },
    },
  },
  plugins: [],
}
