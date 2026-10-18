const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// SpreadsheetML 2003 — dibuka native oleh Excel sebagai .xls, tanpa
// dependency eksternal. Cukup untuk rekap sederhana.
export function toSpreadsheetXml(
  sheetName: string,
  headers: string[],
  rows: (string | number | null)[][],
) {
  const headerXml = `<Row>${headers
    .map(
      (header) =>
        `<Cell ss:StyleID="head"><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`,
    )
    .join("")}</Row>`;
  const bodyXml = rows
    .map(
      (row) =>
        `<Row>${row
          .map((cell) => {
            const value = cell ?? "";
            const type = typeof value === "number" ? "Number" : "String";
            return `<Cell><Data ss:Type="${type}">${escapeXml(String(value))}</Data></Cell>`;
          })
          .join("")}</Row>`,
    )
    .join("");
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>
 <Style ss:ID="head">
  <Font ss:Bold="1"/>
  <Interior ss:Color="#E5E7EB" ss:Pattern="Solid"/>
 </Style>
</Styles>
<Worksheet ss:Name="${escapeXml(sheetName)}">
<Table>${headerXml}${bodyXml}</Table>
</Worksheet>
</Workbook>`;
}

// Writer PDF minimal (font standar Helvetica/Helvetica-Bold, WinAnsi).
// Karakter di luar Latin-1 diganti "?". Tanpa dependency eksternal.
const toWinAnsi = (value: string) => value.replace(/[^\u0000-\u00ff]/g, "?");

const escapePdfText = (value: string) =>
  toWinAnsi(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

type PdfSpec = {
  title: string;
  headers: string[];
  rows: (string | number | null)[][];
};

export function toPdf({ title, headers, rows }: PdfSpec): Buffer {
  const pageWidth = 842; // A4 landscape
  const pageHeight = 595;
  const margin = 40;
  const cellPadding = 4;
  const fontSize = 8;
  const titleSize = 14;
  const headerHeight = 16;
  const rowHeight = 14;
  const usableWidth = pageWidth - margin * 2;
  const columnCount = Math.max(headers.length, 1);
  const columnWidth = usableWidth / columnCount;
  const rowsPerPage = Math.max(
    1,
    Math.floor((pageHeight - margin * 2 - 44 - headerHeight) / rowHeight),
  );

  const renderPage = (pageRows: (string | number | null)[][]): Buffer => {
    const parts: string[] = [];
    const tableTop = pageHeight - margin - 44;
    parts.push("0.6 0.6 0.6 RG 0.4 w\n");
    parts.push(
      `BT /F2 ${titleSize} Tf ${margin} ${pageHeight - margin - 26} Td (${escapePdfText(title)}) Tj ET\n`,
    );
    for (let i = 0; i <= columnCount; i++) {
      parts.push(
        `${(margin + i * columnWidth).toFixed(1)} ${tableTop} m ${(margin + i * columnWidth).toFixed(1)} ${tableTop - headerHeight} l S\n`,
      );
    }
    parts.push(
      `${margin} ${tableTop} m ${margin + usableWidth} ${tableTop} l S\n`,
      `${margin} ${tableTop - headerHeight} m ${margin + usableWidth} ${tableTop - headerHeight} l S\n`,
    );
    headers.forEach((header, index) => {
      parts.push(
        `BT /F2 ${fontSize} Tf ${(margin + index * columnWidth + cellPadding).toFixed(1)} ${tableTop - headerHeight + cellPadding + 2} Td (${escapePdfText(header.slice(0, 28))}) Tj ET\n`,
      );
    });
    let rowTop = tableTop - headerHeight;
    for (const row of pageRows) {
      parts.push("0.8 0.8 0.8 RG 0.4 w\n");
      for (let i = 0; i <= columnCount; i++) {
        parts.push(
          `${(margin + i * columnWidth).toFixed(1)} ${rowTop} m ${(margin + i * columnWidth).toFixed(1)} ${rowTop - rowHeight} l S\n`,
        );
      }
      parts.push(
        `${margin} ${rowTop - rowHeight} m ${margin + usableWidth} ${rowTop - rowHeight} l S\n`,
      );
      row.forEach((cell, index) => {
        parts.push(
          `BT /F1 ${fontSize} Tf ${(margin + index * columnWidth + cellPadding).toFixed(1)} ${rowTop - rowHeight + cellPadding + 2} Td (${escapePdfText(String(cell ?? "").slice(0, 32))}) Tj ET\n`,
        );
      });
      rowTop -= rowHeight;
    }
    return Buffer.from(parts.join(""), "binary");
  };

  const pages: Buffer[] = [];
  const total = Math.max(rows.length, 1);
  for (let start = 0; start < total; start += rowsPerPage) {
    pages.push(renderPage(rows.slice(start, start + rowsPerPage)));
  }

  const objects: Buffer[] = [];
  const objectOffsets: number[] = [];
  let objectCount = 0;
  let offset = 0;
  const push = (chunk: string | Buffer) => {
    const buffer = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk, "binary");
    objects.push(buffer);
    offset += buffer.length;
  };
  const addObject = (body: string) => {
    objectOffsets.push(offset);
    objectCount += 1;
    push(`${objectCount} 0 obj\n${body}\nendobj\n`);
  };

  // 1: Catalog, 2: Pages, 3: F1, 4: F2, 5..: halaman, lalu stream konten.
  push("%PDF-1.4\n");
  addObject("<< /Type /Catalog /Pages 2 0 R >>");
  addObject(
    `<< /Type /Pages /Kids [${pages
      .map((_, index) => `${5 + index} 0 R`)
      .join(" ")}] /Count ${pages.length} >>`,
  );
  addObject(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  );
  addObject(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  );
  const contentObjectStart = 5 + pages.length;
  pages.forEach((page, index) => {
    addObject(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectStart + index} 0 R >>`,
    );
  });
  pages.forEach((page) => {
    objectOffsets.push(offset);
    objectCount += 1;
    push(`${objectCount} 0 obj\n<< /Length ${page.length} >>\nstream\n`);
    push(page);
    push("\nendstream\nendobj\n");
  });

  const xrefOffset = offset;
  push("xref\n");
  push(`0 ${objectCount + 1}\n`);
  push("0000000000 65535 f \n");
  for (const objectOffset of objectOffsets) {
    push(`${String(objectOffset).padStart(10, "0")} 00000 n \n`);
  }
  push(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\n`);
  push(`startxref\n${xrefOffset}\n%%EOF\n`);

  return Buffer.concat(objects);
}
