import { CHURCH, PIX } from "./constants";

type BrCodeInput = {
  key: string;
  receiverName: string;
  receiverCity: string;
  txid?: string;
};

function project(value: string, maxLen: number): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, maxLen);
}

function emv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function buildBrCode({
  key,
  receiverName,
  receiverCity,
  txid,
}: BrCodeInput): string {
  const gui = emv("00", "BR.GOV.BCB.PIX");
  const keyField = emv("01", key);
  const merchantAccount = emv("26", gui + keyField);

  const name = project(receiverName, 25);
  const city = project(receiverCity, 15);
  const referenceLabel = emv("05", txid ?? "***");

  const base =
    "000201" +
    merchantAccount +
    "52040000" +
    "5303986" +
    "5802BR" +
    emv("59", name) +
    emv("60", city) +
    emv("62", referenceLabel) +
    "6304";

  return base + crc16(base);
}

export const PIX_PAYLOAD = buildBrCode({
  key: PIX.key,
  receiverName: CHURCH.name,
  receiverCity: CHURCH.city.split("-")[0].trim(),
});

/**
 * BR Code PIX pessoal: payload idêntico ao público (chave institucional CNPJ),
 * mas com o campo de referência (62/05) identificando a matrícula do membro.
 */
export function buildBrCodePessoal(matricula: string): string {
  return buildBrCode({
    key: PIX.key,
    receiverName: CHURCH.name,
    receiverCity: CHURCH.city.split("-")[0].trim(),
    txid: matricula,
  });
}