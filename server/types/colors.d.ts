declare module "colors" {
  interface ColorFunction {
    (text: string): string;
    red: ColorFunction;
    green: ColorFunction;
    yellow: ColorFunction;
    blue: ColorFunction;
    magenta: ColorFunction;
    cyan: ColorFunction;
    white: ColorFunction;
    gray: ColorFunction;
    grey: ColorFunction;
    black: ColorFunction;
    bgRed: ColorFunction;
    bgGreen: ColorFunction;
    bgYellow: ColorFunction;
    bgBlue: ColorFunction;
    bgMagenta: ColorFunction;
    bgCyan: ColorFunction;
    bgWhite: ColorFunction;
    bgBlack: ColorFunction;
    bold: ColorFunction;
    dim: ColorFunction;
    italic: ColorFunction;
    underline: ColorFunction;
    inverse: ColorFunction;
    strikethrough: ColorFunction;
    rainbow: ColorFunction;
    zebra: ColorFunction;
    random: ColorFunction;
    trap: ColorFunction;
    zalgo: ColorFunction;
  }

  interface Colors extends ColorFunction {
    setTheme: (theme: any) => void;
    enable: () => void;
    disable: () => void;
    strip: (text: string) => string;
    stripColors: (text: string) => string;
  }

  const colors: Colors;
  export = colors;
}

// Extend String interface for template literal usage
declare global {
  interface String {
    cyan: string;
    red: string;
    yellow: string;
    green: string;
    blue: string;
    magenta: string;
    white: string;
    gray: string;
    grey: string;
    black: string;
    bold: string;
    dim: string;
    italic: string;
    underline: string;
    inverse: string;
    strikethrough: string;
    rainbow: string;
    zebra: string;
    random: string;
  }
}

