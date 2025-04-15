/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Primary colors
        primary: {
          DEFAULT: "#F97316", // Tangerine Orange
          50: "#FEF5ED",
          100: "#FDEAD8",
          200: "#FAD5B1",
          300: "#F7BF8A",
          400: "#F5A963",
          500: "#F97316", // Tangerine Orange
          600: "#D6580E",
          700: "#B3420B",
          800: "#902C07",
          900: "#6D1605",
          950: "#450A00",
        },
        // Accent colors
        accent: {
          DEFAULT: "#FACC15", // Goldenrod Yellow
          50: "#FEFCE8",
          100: "#FEF9C3",
          200: "#FEF08A",
          300: "#FDE047",
          400: "#FACC15", // Goldenrod Yellow
          500: "#EAB308",
          600: "#CA8A04",
          700: "#A16207",
          800: "#854D0E",
          900: "#713F12",
          950: "#422006",
        },
        // Secondary Accent colors
        secondary: {
          DEFAULT: "#4ADE80", // Spring Mint
          50: "#F0FDF4",
          100: "#DCFCE7",
          200: "#BBF7D0",
          300: "#86EFAC",
          400: "#4ADE80", // Spring Mint
          500: "#22C55E",
          600: "#16A34A",
          700: "#15803D",
          800: "#166534",
          900: "#14532D",
          950: "#052E16",
        },
        // Background and surface colors
        background: "#FFF4ED", // Fantasy Pink
        surface: "#FFFFFF", // Pearl White
        
        // Text colors
        text: {
          primary: "#1F2937", // Charcoal Gray
          secondary: "#6B7280", // Ash Gray
        },
        
        // Error/Alert color
        error: {
          DEFAULT: "#EF4444", // Sunset Red
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          400: "#F87171",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
          800: "#991B1B",
          900: "#7F1D1D",
          950: "#450A0A",
        },
      },
      fontFamily: {
        "lexend-thin": ["LexendDeca-Thin"],
        "lexend-extralight": ["LexendDeca-ExtraLight"],
        "lexend-light": ["LexendDeca-Light"],
        "lexend-regular": ["LexendDeca-Regular"],
        "lexend-medium": ["LexendDeca-Medium"],
        "lexend-semibold": ["LexendDeca-SemiBold"],
        "lexend-bold": ["LexendDeca-Bold"],
        "lexend-extrabold": ["LexendDeca-ExtraBold"],
        "lexend-black": ["LexendDeca-Black"],
        "shadows": ["ShadowsIntoLight"],
      },
    },
  },
  plugins: [],
}