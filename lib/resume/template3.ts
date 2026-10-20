import fs from 'fs';
import path from 'path';
import { convertDocxToPdf } from './docx-to-pdf';
import { Template2Input, writeTemplateDocx } from './template2';

const TEMPLATE_FILE = 'Template 3.docx';

export async function writeTemplate3Resume(input: Template2Input): Promise<void> {
  if (!fs.existsSync(input.exportDir)) {
    fs.mkdirSync(input.exportDir, { recursive: true });
  }
  const docxPath = path.join(input.exportDir, 'Resume.docx');
  const pdfPath = path.join(input.exportDir, 'Resume.pdf');
  await writeTemplateDocx(TEMPLATE_FILE, input, docxPath);
  await convertDocxToPdf(docxPath, pdfPath);
}
