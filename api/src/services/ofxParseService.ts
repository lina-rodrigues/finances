import { IMPORT_ERROR_CODES, ImportServiceError } from "../constants/importErrors.js";

export interface ParsedOfxTransaction {
  fitId: string;
  date: string;
  amount: number;
  name: string;
  memo: string | null;
}

const MAX_OFX_BYTES = 2 * 1024 * 1024;

function extractTag(block: string, tag: string): string | null {
  const closed = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i");
  const closedMatch = block.match(closed);
  if (closedMatch) {
    return closedMatch[1].trim();
  }

  const open = new RegExp(`<${tag}>([^<]*)`, "i");
  const openMatch = block.match(open);
  if (openMatch) {
    return openMatch[1].trim();
  }

  return null;
}

/** OFX DTPOSTED is often YYYYMMDDHHMMSS[.XXX][±tz] e.g. 20260805143022[-03:GMT] */
function parseOfxDate(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length < 8) {
    throw new ImportServiceError(IMPORT_ERROR_CODES.INVALID_OFX);
  }
  const year = digits.slice(0, 4);
  const month = digits.slice(4, 6);
  const day = digits.slice(6, 8);
  const hour = digits.length >= 10 ? digits.slice(8, 10) : "00";
  const minute = digits.length >= 12 ? digits.slice(10, 12) : "00";
  const second = digits.length >= 14 ? digits.slice(12, 14) : "00";

  const tzMatch = raw.match(/\[([+-])(\d{1,2})(?::[^\]]*)?\]/);
  let offset = "Z";
  if (tzMatch) {
    const hours = tzMatch[2].padStart(2, "0");
    offset = `${tzMatch[1]}${hours}:00`;
  }

  return `${year}-${month}-${day}T${hour}:${minute}:${second}${offset}`;
}

function parseOfxAmount(raw: string): number {
  const normalized = raw.trim().replace(/\s/g, "").replace(",", ".");
  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    throw new ImportServiceError(IMPORT_ERROR_CODES.INVALID_OFX);
  }
  return Math.round(value * 100) / 100;
}

function extractStmtTrnBlocks(ofx: string): string[] {
  const blocks: string[] = [];
  const closed = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match: RegExpExecArray | null;
  while ((match = closed.exec(ofx)) !== null) {
    blocks.push(match[1]);
  }

  if (blocks.length > 0) {
    return blocks;
  }

  // SGML-style: <STMTTRN> ... next tag or end
  const openOnly = /<STMTTRN>([\s\S]*?)(?=<STMTTRN>|<\/BANKTRANLIST>|<LEDGERBAL>|<AVAILBAL>|$)/gi;
  while ((match = openOnly.exec(ofx)) !== null) {
    const body = match[1].trim();
    if (body) {
      blocks.push(body);
    }
  }

  return blocks;
}

export function parseOfxTransactions(rawOfx: string): ParsedOfxTransaction[] {
  if (!rawOfx || typeof rawOfx !== "string") {
    throw new ImportServiceError(IMPORT_ERROR_CODES.INVALID_OFX);
  }

  const bytes = Buffer.byteLength(rawOfx, "utf8");
  if (bytes > MAX_OFX_BYTES) {
    throw new ImportServiceError(IMPORT_ERROR_CODES.FILE_TOO_LARGE);
  }

  // Drop OFX header before first <OFX> if present
  const start = rawOfx.search(/<OFX>/i);
  const body = start >= 0 ? rawOfx.slice(start) : rawOfx;
  const blocks = extractStmtTrnBlocks(body);

  if (blocks.length === 0) {
    throw new ImportServiceError(IMPORT_ERROR_CODES.INVALID_OFX);
  }

  const transactions: ParsedOfxTransaction[] = [];

  for (const block of blocks) {
    const fitId = extractTag(block, "FITID");
    if (!fitId) {
      throw new ImportServiceError(IMPORT_ERROR_CODES.MISSING_FITID);
    }

    const dateRaw = extractTag(block, "DTPOSTED");
    const amountRaw = extractTag(block, "TRNAMT");
    if (!dateRaw || !amountRaw) {
      throw new ImportServiceError(IMPORT_ERROR_CODES.INVALID_OFX);
    }

    const name =
      extractTag(block, "NAME") ??
      extractTag(block, "MEMO") ??
      extractTag(block, "PAYEE") ??
      "Unknown";
    const memo = extractTag(block, "MEMO");

    transactions.push({
      fitId,
      date: parseOfxDate(dateRaw),
      amount: parseOfxAmount(amountRaw),
      name,
      memo: memo && memo !== name ? memo : memo,
    });
  }

  return transactions;
}

export { MAX_OFX_BYTES };
