/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/**/*.html", "./views/**/*.ejs"],
  darkMode: 'media',
  plugins: [],
  theme: {
    extend: {
      fontFamily: {
        'verdana': ['Verdana', 'Geneva', 'sans-serif'],
      },
    },
  },
}
