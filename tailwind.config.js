/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#0E1116',
        panel: '#161A21',
        elevated: '#1E242D',
        line: '#2A313C',
        'line-strong': '#3A424F',
        primary: '#E8ECF1',
        secondary: '#99A3B0',
        muted: '#667080',
        accent: '#4C9AFF',
        'accent-dim': '#1F3A5F',
        aqi: {
          good: '#2E9E5B',
          satisfy: '#96C93D',
          moderate: '#F2C230',
          poor: '#F07C1F',
          verypoor: '#E0453B',
          severe: '#8C2A2A',
        },
        source: {
          industrial: '#D8622C',
          traffic: '#8B7BD8',
          biomass: '#3E9E58',
          dust: '#8A8A80',
          other: '#556070',
        },
      },
      fontFamily: {
        display: ['Archivo', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      fontSize: {
        '2xs': '11px',
        xs: '13px',
        sm: '15px',
        base: '17px',
        lg: '22px',
        xl: '30px',
      },
    },
  },
  plugins: [],
};
