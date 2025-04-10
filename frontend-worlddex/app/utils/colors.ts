export const Colors = {
  primary: {
    // Tangerine Orange
    DEFAULT: "#F97316",
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
  accent: {
    // Goldenrod Yellow
    DEFAULT: "#FACC15",
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
  secondary: {
    // Spring Mint
    DEFAULT: "#4ADE80",
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
  background: {
    // Fantasy Pink / Light Background
    DEFAULT: "#FFF4ED",
    light: "#FFF4ED", // Fantasy Pink
    surface: "#FFFFFF", // Pearl White
  },
  text: {
    primary: "#1F2937", // Charcoal Gray
    secondary: "#6B7280", // Ash Gray
  },
  error: {
    DEFAULT: "#EF4444", // Sunset Red
    50: "#FEF2F2",
    100: "#FEE2E2",
    200: "#FECACA",
    300: "#FCA5A5",
    400: "#F87171",
    500: "#EF4444", // Sunset Red
    600: "#DC2626",
    700: "#B91C1C",
    800: "#991B1B",
    900: "#7F1D1D",
    950: "#450A0A",
  },
};

// Background colors
export const backgroundColor = Colors.background.light;
export const surfaceColor = Colors.background.surface;

// Text colors
export const textPrimaryColor = Colors.text.primary;
export const textSecondaryColor = Colors.text.secondary;

// Utility functions
export const getPrimaryColor = (
  shade: keyof typeof Colors.primary = "DEFAULT"
) => Colors.primary[shade];
export const getAccentColor = (shade: keyof typeof Colors.accent = "DEFAULT") =>
  Colors.accent[shade];
export const getSecondaryColor = (
  shade: keyof typeof Colors.secondary = "DEFAULT"
) => Colors.secondary[shade];
export const getErrorColor = (shade: keyof typeof Colors.error = "DEFAULT") =>
  Colors.error[shade];

export default Colors;
