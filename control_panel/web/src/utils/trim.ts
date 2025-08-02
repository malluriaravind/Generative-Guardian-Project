export const trim = (text: string, symbol: string): string =>
  text.split(symbol).filter(Boolean).join(symbol);
