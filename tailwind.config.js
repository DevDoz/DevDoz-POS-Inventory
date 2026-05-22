/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './index.html'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#27AAE1',
          hover: '#1E95C6',
          light: '#EBF7FD',
          dark: '#1577A0'
        },
        sidebar: '#1F2937',
        'sidebar-hover': '#374151',
        'sidebar-active': '#27AAE1',
        background: '#F7F9FC',
        surface: '#FFFFFF',
        border: '#E5E7EB',
        text: {
          primary: '#111827',
          secondary: '#6B7280',
          muted: '#9CA3AF'
        },
        success: {
          DEFAULT: '#16A34A',
          light: '#DCFCE7'
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7'
        },
        danger: {
          DEFAULT: '#DC2626',
          light: '#FEE2E2'
        },
        info: {
          DEFAULT: '#3B82F6',
          light: '#EFF6FF'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
        modal: '0 20px 60px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.1)'
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem'
      },
      animation: {
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s infinite'
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' }
        }
      }
    }
  },
  plugins: []
}
