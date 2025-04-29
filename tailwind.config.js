/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'rgb(240 249 255 / <alpha-value>)',
          100: 'rgb(224 242 254 / <alpha-value>)',
          200: 'rgb(186 230 253 / <alpha-value>)',
          300: 'rgb(125 211 252 / <alpha-value>)',
          400: 'rgb(56 189 248 / <alpha-value>)',
          500: 'rgb(14 165 233 / <alpha-value>)',
          600: 'rgb(2 132 199 / <alpha-value>)',
          700: 'rgb(3 105 161 / <alpha-value>)',
          800: 'rgb(7 89 133 / <alpha-value>)',
          900: 'rgb(12 74 110 / <alpha-value>)',
          950: 'rgb(8 47 73 / <alpha-value>)',
        },
        secondary: {
          50: 'rgb(248 250 252 / <alpha-value>)',
          100: 'rgb(241 245 249 / <alpha-value>)',
          200: 'rgb(226 232 240 / <alpha-value>)',
          300: 'rgb(203 213 225 / <alpha-value>)',
          400: 'rgb(148 163 184 / <alpha-value>)',
          500: 'rgb(100 116 139 / <alpha-value>)',
          600: 'rgb(71 85 105 / <alpha-value>)',
          700: 'rgb(51 65 85 / <alpha-value>)',
          800: 'rgb(30 41 59 / <alpha-value>)',
          900: 'rgb(15 23 42 / <alpha-value>)',
          950: 'rgb(2 6 23 / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
}
