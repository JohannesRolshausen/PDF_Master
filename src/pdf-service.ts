import { PDFDocument } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

export async function cutPdfPages(
  sourcePath: string,
  outputDir: string,
  startPage: number, // Erwartet 1-based index
  endPage: number    // Erwartet 1-based index
): Promise<string> {
  // 1. Load PDF
  const pdfBytes = await fs.readFile(sourcePath);
  const srcDoc = await PDFDocument.load(pdfBytes);
  const totalPages = srcDoc.getPageCount();

  // 2. Validation (Engineering Best Practice)
  if (startPage < 1 || endPage > totalPages || startPage > endPage) {
    throw new Error(`Invalid page range: ${startPage}-${endPage}. Document has ${totalPages} pages.`);
  }

  // 3. Create new Document
  const newDoc = await PDFDocument.create();
  
  // Konvertierung zu 0-based Index für pdf-lib
  // Array.from erstellt eine Range von Indizes
  const pageIndices = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => (startPage - 1) + i
  );

  const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
  copiedPages.forEach((page) => newDoc.addPage(page));

  // 4. Save
  const pdfBytesNew = await newDoc.save();
  const fileName = path.basename(sourcePath, '.pdf');
  const outputPath = path.join(outputDir, `${fileName}_cut_${startPage}-${endPage}.pdf`);
  
  await fs.writeFile(outputPath, pdfBytesNew);
  
  return outputPath;
}