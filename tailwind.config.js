/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#F3F6FA',
        panel: '#FFFFFF',
        elevated: '#EAF0F6',
        line: '#E2E8F0',
        'line-strong': '#C7D2DF',
        primary: '#1B2C40',
        secondary: '#44586E',
        muted: '#5F7288',
        accent: '#2563EB',
        'accent-dim': '#E4EDFC',
        aqi: {
          good: '#16834A',
          satisfy: '#63970F',
          moderate: '#B58500',
          poor: '#CC5F0A',
          verypoor: '#CD3A30',
          severe: '#8C2A2A',
        },
        source: {
          industrial: '#C25518',
          traffic: '#6C58C9',
          biomass: '#2F8A4B',
          dust: '#6F6F65',
          other: '#5A6675',
        },
      },
      borderRadius: {
        sm: '5px',
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
      },
      fontFamily: {
        display: ['Archivo', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      fontSize: {
        '2xs': '12px',
        xs: '14px',
        sm: '15px',
        base: '16px',
        lg: '22px',
        xl: '30px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(27, 44, 64, 0.05), 0 4px 16px rgba(27, 44, 64, 0.08)',
        float: '0 2px 6px rgba(27, 44, 64, 0.08), 0 12px 32px rgba(27, 44, 64, 0.14)',
      },
    },
  },
  plugins: [],
};
