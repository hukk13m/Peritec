/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        navy: '#0E2A47',
        'navy-light': '#163A5F',
        'navy-soft': '#E9EEF4',
        brand: '#0B63C5',
        'brand-dark': '#084C99',
        'brand-soft': '#E8F1FB',
        canvas: '#F4F6F8',
        ink: '#1B2A3A',
        muted: '#5B6B7C',
        line: '#E3E8EF',
        success: '#16A34A',
        'success-soft': '#E7F6EC',
        warn: '#B45309',
        'warn-soft': '#FEF3C7',
        danger: '#B91C1C',
        'danger-soft': '#FEE2E2',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
        float: '0 12px 32px rgba(14, 42, 71, 0.16)',
      },
      maxWidth: {
        content: '1200px',
      },
    },
  },
  plugins: [],
};
