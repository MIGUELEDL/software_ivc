/**
 * Code 128 (Code Set B) — encoder puro e determinístico.
 *
 * Payload: caracteres ASCII 32-126 (valor = charCode - 32). Sequência
 * de saída: START B (104) + dados + dígito verificador (checksum módulo
 * 103, peso posicional 1-based) + STOP (106) + barra de terminação.
 *
 * A string de módulos usa '1' = barra e '0' = espaço; cada símbolo de
 * dados tem 11 módulos (3 barras + 3 espaços), stop = 11 + terminação de
 * 2 módulos. Tabela canônica (fonte: crifan.com/symbology_code128 e
 * barcodesinc.com/articles/code128.htm, amostras conferidas em teste).
 */

export const CODE128_TABLE: Record<number, string> = {
  0: "11011001100",
  1: "11001101100",
  2: "11001100110",
  3: "10010011000",
  4: "10010001100",
  5: "10001001100",
  6: "10011001000",
  7: "10011000100",
  8: "10001100100",
  9: "11001001000",
  10: "11001000100",
  11: "11000100100",
  12: "10110011100",
  13: "10011011100",
  14: "10011001110",
  15: "10111001100",
  16: "10011101100",
  17: "10011100110",
  18: "11001110010",
  19: "11001011100",
  20: "11001001110",
  21: "11011100100",
  22: "11001110100",
  23: "11101101110",
  24: "11101001100",
  25: "11100101100",
  26: "11100100110",
  27: "11101100100",
  28: "11100110100",
  29: "11100110010",
  30: "11011011000",
  31: "11011000110",
  32: "11000110110",
  33: "10100011000",
  34: "10001011000",
  35: "10001000110",
  36: "10110001000",
  37: "10001101000",
  38: "10001100010",
  39: "11010001000",
  40: "11000101000",
  41: "11000100010",
  42: "10110111000",
  43: "10110001110",
  44: "10001101110",
  45: "10111011000",
  46: "10111000110",
  47: "10001110110",
  48: "11101110110",
  49: "11010001110",
  50: "11000101110",
  51: "11011101000",
  52: "11011100010",
  53: "11011101110",
  54: "11101011000",
  55: "11101000110",
  56: "11100010110",
  57: "11101101000",
  58: "11101100010",
  59: "11100011010",
  60: "11101111010",
  61: "11001000010",
  62: "11110001010",
  63: "10100110000",
  64: "10100001100",
  65: "10010110000",
  66: "10010000110",
  67: "10000101100",
  68: "10000100110",
  69: "10110010000",
  70: "10110000100",
  71: "10011010000",
  72: "10011000010",
  73: "10000110100",
  74: "10000110010",
  75: "11000010010",
  76: "11001010000",
  77: "11110111010",
  78: "11000010100",
  79: "10001111010",
  80: "10100111100",
  81: "10010111100",
  82: "10010011110",
  83: "10111100100",
  84: "10011110100",
  85: "10011110010",
  86: "11110100100",
  87: "11110010100",
  88: "11110010010",
  89: "11011011110",
  90: "11011110110",
  91: "11110110110",
  92: "10101111000",
  93: "10100011110",
  94: "10001011110",
  95: "10111101000",
  96: "10111100010",
  97: "11110101000",
  98: "11110100010",
  99: "10111011110",
  100: "10111101110",
  101: "11101011110",
  102: "11110101110",
  103: "11010000100",
  104: "11010010000",
  105: "11010011100",
  106: "11000111010",
};

export const CODE128_START_B = 104;

/** Stop do Code 128 (11 módulos) + barra de terminação (2 módulos). */
export const CODE128_STOP = CODE128_TABLE[106] + "11";

/**
 * Gera a sequência binária de módulos (Code Set B) para `value`.
 * @throws RangeError se algum caractere estiver fora de ASCII 32-126.
 */
export function code128(value: string): string {
  const codes: number[] = [CODE128_START_B];

  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 32 || code > 126) {
      throw new RangeError(
        `code128: caractere fora de ASCII 32-126 na posição ${i} (${value[i]})`
      );
    }
    codes.push(code - 32);
  }

  let checksum = CODE128_START_B;
  for (let i = 1; i < codes.length; i += 1) {
    checksum += codes[i] * i;
  }
  codes.push(checksum % 103);

  return codes.map((c) => CODE128_TABLE[c]).join("") + CODE128_STOP;
}

/** Converte a string de módulos em segmentos (barra/espaço) proporcionais. */
export function code128Runs(
  binary: string,
  quietZoneModules = 8
): { bar: boolean; modules: number }[] {
  const runs: { bar: boolean; modules: number }[] = [
    { bar: false, modules: quietZoneModules },
  ];
  for (const bit of binary) {
    const bar = bit === "1";
    const last = runs[runs.length - 1];
    if (last.bar === bar) {
      last.modules += 1;
    } else {
      runs.push({ bar, modules: 1 });
    }
  }
  runs.push({ bar: false, modules: quietZoneModules });
  return runs;
}