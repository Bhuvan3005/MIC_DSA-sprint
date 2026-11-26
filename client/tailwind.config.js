/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Soft charcoal scale: black, but not full black.
        ink: { 950: '#0d0e10', 900: '#131416', 800: '#1a1c1f', 700: '#222428', 600: '#2c2f34', 500: '#3a3e44' },
        brand: { 400: '#7fb0e6', 500: '#2f6fb0', 600: '#3a7cc3', 700: '#245a93' },
        sky: { 450: '#4c8dff' },
        // MIC palette: cool mist neutrals + the logo's blue as the action colour, with the logo's
        // orange / amber / green kept for small accents.
        mic: {
          canvas: '#e4e9ee',   // page background
          sand: '#d4dde6',     // secondary panels
          surface: '#f5f7f9',  // inputs, cards
          line: '#c2ccd7',     // borders
          ink: '#14202e',      // primary text
          muted: '#546270',    // secondary text
          primary: '#1f4e8c',  // actions
          'primary-dark': '#183e70',
          orange: '#e2662f', amber: '#e0ac2b', green: '#3f8f52', blue: '#2f6fb0',
          danger: '#a8402c',
        },
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'Georgia', 'serif'],   // primary: headings & brand moments
        body: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'], // secondary: UI & text
        heading: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'], // dashboard headings & figures
        sans: ['"Instrument Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],  // dashboard body text
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: { glow: 'none' },
      keyframes: {
        fadeUp: { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        pop: { '0%': { transform: 'scale(.92)', opacity: 0 }, '100%': { transform: 'scale(1)', opacity: 1 } },
      },
      animation: { fadeUp: 'fadeUp .35s ease-out both', pop: 'pop .18s ease-out both' },
    },
  },
  plugins: [],
};
