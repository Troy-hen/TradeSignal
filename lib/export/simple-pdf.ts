import "server-only";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT = 52;
const TOP = 790;
const BOTTOM = 52;
const LINE_HEIGHT = 16;
const MAX_CHARS = 78;

export type PdfSection = {
  heading?: string;
  lines: string[];
};

export function renderSimplePdf(input: {
  title: string;
  subtitle?: string;
  sections: PdfSection[];
}): Uint8Array {
  const logicalLines: Array<{ text: string; bold: boolean; size: number; gapBefore?: number }> = [];
  logicalLines.push({ text: input.title, bold: true, size: 20 });
  if (input.subtitle) logicalLines.push({ text: input.subtitle, bold: false, size: 10 });
  logicalLines.push({ text: "", bold: false, size: 10, gapBefore: 8 });

  for (const section of input.sections) {
    if (section.heading) {
      logicalLines.push({ text: section.heading, bold: true, size: 12, gapBefore: 8 });
    }
    for (const line of section.lines) {
      for (const wrapped of wrap(line, MAX_CHARS)) {
        logicalLines.push({ text: wrapped, bold: false, size: 10 });
      }
    }
  }

  const pages: typeof logicalLines[] = [];
  let page: typeof logicalLines = [];
  let y = TOP;
  for (const line of logicalLines) {
    const needed = LINE_HEIGHT + (line.gapBefore ?? 0);
    if (y - needed < BOTTOM && page.length > 0) {
      pages.push(page);
      page = [];
      y = TOP;
    }
    page.push(line);
    y -= needed;
  }
  if (page.length > 0) pages.push(page);

  const objects: string[] = [];
  const pageObjectIds: number[] = [];
  const contentObjectIds: number[] = [];

  // 1 catalog, 2 pages root, 3 regular font, 4 bold font
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

  let nextId = 5;
  for (let i = 0; i < pages.length; i++) {
    pageObjectIds.push(nextId++);
    contentObjectIds.push(nextId++);
  }

  objects[2] = `<< /Type /Pages /Count ${pages.length} /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] >>`;

  pages.forEach((lines, index) => {
    let currentY = TOP;
    const commands: string[] = [
      "q",
      "1 0.416 0 rg",
      `0 ${PAGE_HEIGHT - 18} ${PAGE_WIDTH} 18 re f`,
      "Q",
    ];

    for (const line of lines) {
      currentY -= line.gapBefore ?? 0;
      commands.push(
        "BT",
        `${line.bold ? "/F2" : "/F1"} ${line.size} Tf`,
        `1 0 0 1 ${LEFT} ${currentY} Tm`,
        `(${escapePdf(line.text)}) Tj`,
        "ET",
      );
      currentY -= LINE_HEIGHT;
    }

    commands.push(
      "BT",
      "/F1 8 Tf",
      `0.45 0.45 0.45 rg`,
      `1 0 0 1 ${LEFT} 28 Tm`,
      `(MyTradeBox - indicative planning intelligence, not a formal valuation) Tj`,
      "ET",
    );

    const stream = commands.join("\n");
    objects[contentObjectIds[index]] = `<< /Length ${byteLength(stream)} >>\nstream\n${stream}\nendstream`;
    objects[pageObjectIds[index]] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectIds[index]} 0 R >>`;
  });

  let output = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = byteLength(output);
    output += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = byteLength(output);
  output += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id++) {
    output += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  output += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(output);
}

function wrap(value: string, max: number): string[] {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return [""];
  const words = cleaned.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (!line) {
      line = word;
    } else if ((line + " " + word).length <= max) {
      line += " " + word;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function escapePdf(value: string) {
  return value
    .replace(/[^\x20-\x7E]/g, (char) => asciiFallback(char))
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function asciiFallback(char: string) {
  if (char === "£") return "GBP ";
  if (char === "–" || char === "—") return "-";
  if (char === "’" || char === "‘") return "'";
  if (char === "“" || char === "”") return '"';
  return "";
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).length;
}
