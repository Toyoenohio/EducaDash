/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#00008b",
        "on-primary": "#ffffff",
        "primary-container": "#0000cc",
        "on-primary-container": "#969dff",
        "primary-fixed": "#e0e0ff",
        "on-primary-fixed": "#00006e",
        "primary-fixed-dim": "#bfc2ff",
        "on-primary-fixed-variant": "#1c22d6",

        "secondary": "#006e03",
        "on-secondary": "#ffffff",
        "secondary-container": "#1bfc1e",
        "on-secondary-container": "#006f03",
        "secondary-fixed": "#76ff63",
        "on-secondary-fixed": "#002200",
        "secondary-fixed-dim": "#00e610",
        "on-secondary-fixed-variant": "#005301",

        "tertiary": "#705d00",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#c9a900",
        "on-tertiary-container": "#4c3e00",
        "tertiary-fixed": "#ffe16d",
        "on-tertiary-fixed": "#221b00",
        "tertiary-fixed-dim": "#e9c400",
        "on-tertiary-fixed-variant": "#544600",

        "error": "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",

        "background": "#fcf9f8",
        "on-background": "#1c1b1b",
        "surface": "#fcf9f8",
        "on-surface": "#1c1b1b",
        "surface-variant": "#e5e2e1",
        "on-surface-variant": "#454556",

        "outline": "#767587",
        "outline-variant": "#c6c5d9",
        "surface-tint": "#3c45ec",

        "surface-container-highest": "#e5e2e1",
        "surface-container-high": "#ebe7e7",
        "surface-container": "#f0edec",
        "surface-container-low": "#f6f3f2",
        "surface-container-lowest": "#ffffff",
        "surface-bright": "#fcf9f8",
        "surface-dim": "#dcd9d9",

        "inverse-surface": "#313030",
        "inverse-on-surface": "#f3f0ef",
        "inverse-primary": "#bfc2ff",
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
        "full": "9999px"
      },
      spacing: {
        "gutter": "20px",
        "section-gap": "80px",
        "unit": "8px",
        "container-padding": "24px"
      },
      fontFamily: {
        "sans": ["Montserrat", "sans-serif"],
        "headline": ["Montserrat", "sans-serif"],
        "label": ["Plus Jakarta Sans", "sans-serif"],
        "body": ["Montserrat", "sans-serif"],
      },
      fontSize: {
        "headline-lg-mobile": ["32px", { lineHeight: "1.2", fontWeight: "700" }],
        "label-bold": ["14px", { lineHeight: "1.2", fontWeight: "700" }],
        "body-md": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        "display-xl": ["72px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "800" }],
        "headline-lg": ["48px", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "700" }],
        "body-lg": ["20px", { lineHeight: "1.6", fontWeight: "400" }],
        "headline-md": ["32px", { lineHeight: "1.3", fontWeight: "600" }]
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'count-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'slide-in-left': 'slide-in-left 0.3s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.3s ease-out forwards',
        'scale-in': 'scale-in 0.3s ease-out forwards',
        'count-up': 'count-up 0.6s ease-out forwards',
        'shimmer': 'shimmer 2s infinite linear',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.06)',
        'modal': '0 8px 32px rgba(0,0,0,0.12), 0 16px 48px rgba(0,0,0,0.08)',
        'sidebar': '4px 0 16px rgba(0,0,0,0.06)',
      },
    }
  },
  plugins: [],
}
