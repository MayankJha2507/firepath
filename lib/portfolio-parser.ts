export interface ParsedHolding {
  name: string;
  value: number;
  confidence: "high" | "low";
  rawLine: string;
}

function expandShorthand(s: string): number {
  if (/^\d+(\.\d+)?k$/i.test(s)) return parseFloat(s) * 1000;
  if (/^\d+(\.\d+)?l$/i.test(s)) return parseFloat(s) * 100000;
  if (/^\d+(\.\d+)?cr$/i.test(s)) return parseFloat(s) * 10000000;
  return parseFloat(s);
}

export function parseHoldings(raw: string): ParsedHolding[] {
  const lines = raw.split("\n").filter(l => l.trim());

  return lines.map(line => {
    let parts: string[];
    if (line.includes("\t")) {
      parts = line.split("\t").map(p => p.trim()).filter(Boolean);
    } else if (line.includes(",")) {
      parts = line.split(",").map(p => p.trim()).filter(Boolean);
    } else if (/\s{2,}/.test(line)) {
      parts = line.split(/\s{2,}/).map(p => p.trim()).filter(Boolean);
    } else {
      parts = line.split(" ").map(p => p.trim()).filter(Boolean);
    }

    let value = 0;
    let nameparts = [...parts];

    for (let i = parts.length - 1; i >= 0; i--) {
      const cleaned = parts[i].replace(/[₹,]/g, "");
      const expanded = expandShorthand(cleaned);
      if (!isNaN(expanded) && expanded > 0) {
        value = expanded;
        nameparts = parts.slice(0, i);
        break;
      }
    }

    return {
      name: nameparts.join(" ").trim(),
      value,
      confidence: (value > 100 && value < 100_000_000 ? "high" : "low") as "high" | "low",
      rawLine: line,
    };
  }).filter(h => h.name && h.value > 0);
}
