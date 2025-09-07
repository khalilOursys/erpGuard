/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{ts,tsx,js,jsx}",
    "./src/pages/**/*.{ts,tsx,js,jsx}",
    "./src/components/**/*.{ts,tsx,js,jsx}",
    "./node_modules/@shadcn/*/dist/**/*.{js,ts,jsx,tsx}", // optional if using packages
  ],
  darkMode: "class", // we use next-themes with attribute='class'
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        accent: "var(--color-accent)",
        foreground: "var(--color-foreground)",
        muted: "var(--color-muted)",
        border: "var(--color-border)",
        background: "var(--color-bg)",
      },
      borderRadius: {
        lg: "0.75rem",
      },
      boxShadow: {
        card: "0 6px 24px rgba(0,0,0,0.06)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
