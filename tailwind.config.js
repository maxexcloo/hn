/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./views/**/*.ejs", "./public/**/*.html"],
  darkMode: 'media',
  theme: {
    extend: {
      fontFamily: {
        'verdana': ['Verdana', 'Geneva', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
