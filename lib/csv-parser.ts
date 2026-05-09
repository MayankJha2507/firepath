export type BrokerFormat = "zerodha" | "groww" | "kuvera" | "indmoney" | "generic";

export interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
  detectedFormat: BrokerFormat;
  suggestedNameCol: string | null;
  suggestedValueCol: string | null;
}

const BROKER_SIGNATURES: Record<
  Exclude<BrokerFormat, "generic">,
  { detect: (h: string[]) => boolean; nameCol: string; valueCol: string }
> = {
  zerodha: {
    detect: h => h.includes("Symbol") && h.includes("Cur. val"),
    nameCol: "Symbol",
    valueCol: "Cur. val",
  },
  groww: {
    detect: h => h.includes("Stock Name") && h.includes("Current Value"),
    nameCol: "Stock Name",
    valueCol: "Current Value",
  },
  kuvera: {
    detect: h => h.includes("Scheme Name") && h.includes("Current Value (INR)"),
    nameCol: "Scheme Name",
    valueCol: "Current Value (INR)",
  },
  indmoney: {
    detect: h => h.includes("Instrument") && h.includes("Present Value"),
    nameCol: "Instrument",
    valueCol: "Present Value",
  },
};

export async function parsePortfolioFile(file: File): Promise<ParsedFile> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    raw: false,
    defval: "",
  });

  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  let detectedFormat: BrokerFormat = "generic";
  let suggestedNameCol: string | null = null;
  let suggestedValueCol: string | null = null;

  for (const [format, sig] of Object.entries(BROKER_SIGNATURES)) {
    if (sig.detect(headers)) {
      detectedFormat = format as BrokerFormat;
      suggestedNameCol = sig.nameCol;
      suggestedValueCol = sig.valueCol;
      break;
    }
  }

  if (detectedFormat === "generic" && headers.length > 0) {
    suggestedNameCol = headers[0];
    suggestedValueCol =
      headers.find(h =>
        h.toLowerCase().includes("value") ||
        h.toLowerCase().includes("amount") ||
        h.toLowerCase().includes("worth")
      ) ?? headers[1] ?? null;
  }

  return { headers, rows, detectedFormat, suggestedNameCol, suggestedValueCol };
}

export function extractHoldingsFromFile(
  parsed: ParsedFile,
  nameCol: string,
  valueCol: string
): { name: string; value: number }[] {
  return parsed.rows
    .map(row => {
      const rawValue = row[valueCol] ?? "";
      const value = parseFloat(rawValue.replace(/[₹$,]/g, "")) || 0;
      return { name: (row[nameCol] ?? "").trim(), value };
    })
    .filter(h => h.name && h.value > 0);
}
