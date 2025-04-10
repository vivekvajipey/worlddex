export const Colors = {
  primary: {
    50: "#fef2f5",
    100: "#fde6eb",
    200: "#ffc2cd",
    300: "#ff9eae",
    400: "#FF7275", // Bittersweet Orange
    500: "#E14873", // Mandy Pink
    600: "#c93965",
    700: "#a92d53",
    800: "#8a2543",
    900: "#721e37",
    950: "#450a1a",
  },
  secondary: {
    50: "#f1f3ff",
    100: "#e3e7ff",
    200: "#cbd4ff",
    300: "#a8b8ff",
    400: "#6A87FB", // Soft Blue
    500: "#4b68dc",
    600: "#3b4fbf",
    700: "#2c3c99",
    800: "#24327d",
    900: "#212c67",
    950: "#121a3e",
  },
  gray: {
    50: "#FFF4ED", // Fantasy Pink (lightest shade for background)
    100: "#f8ebe3",
    200: "#eddcd1",
    300: "#dcc7ba",
    400: "#c4ab9b",
    500: "#ac8e7d",
    600: "#917366",
    700: "#755c53",
    800: "#604c45",
    900: "#40322d",
    950: "#101010", // Oil Black
  },
};

// Background color
export const backgroundColor = Colors.gray[50]; // Fantasy Pink

// Utility functions
export const getPrimaryColor = (shade: keyof typeof Colors.primary) =>
  Colors.primary[shade];
export const getSecondaryColor = (shade: keyof typeof Colors.secondary) =>
  Colors.secondary[shade];
export const getGrayColor = (shade: keyof typeof Colors.gray) =>
  Colors.gray[shade];

export default Colors;
