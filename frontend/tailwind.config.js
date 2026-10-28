/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        plum: {
          950: '#140A1F',
          900: '#1A0F26',
          850: '#20132B',
          800: '#281537',
          700: '#301747',
          600: '#431F63',
        },
        violet: {
          DEFAULT: '#8B32F5',
          brand: '#8B32F5',
          deep: '#6D28D9',
          light: '#A855F7',
          glow: '#9E47FF',
          lavender: '#C6A5FF',
          subtle: '#E9DEFF',
        },
        surface: {
          glass: 'rgba(48, 23, 71, 0.45)',
          'glass-elevated': 'rgba(67, 31, 99, 0.55)',
          'glass-card': 'rgba(32, 19, 43, 0.70)',
          'glass-border': 'rgba(198, 165, 255, 0.16)',
          'glass-border-light': 'rgba(198, 165, 255, 0.28)',
        },
        academic: {
          green: '#10B981',
          amber: '#F59E0B',
          rose: '#F43F5E',
          sky: '#38BDF8',
          indigo: '#6366F1'
        }
      },
      fontFamily: {
        sans: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'violet-glow': '0 0 35px -5px rgba(139, 50, 245, 0.35)',
        'violet-pill': '0 4px 20px 0 rgba(139, 50, 245, 0.45)',
        'glass-card': '0 8px 32px 0 rgba(15, 6, 23, 0.45)',
        'inner-light': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.15)',
        'liquid-sheen': 'inset 0 1px 2px 0 rgba(255, 255, 255, 0.25), 0 8px 24px -4px rgba(139, 50, 245, 0.4)',
      },
      backdropBlur: {
        xs: '2px',
        glass: '16px',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-slow': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
