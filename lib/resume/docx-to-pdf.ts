import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

function powershellString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Render a .docx to PDF with Microsoft Word so the PDF matches the document.
 */
export async function convertDocxToPdf(docxPath: string, pdfPath: string): Promise<void> {
  const docx = path.resolve(docxPath);
  const pdf = path.resolve(pdfPath);
  if (!fs.existsSync(docx)) {
    throw new Error(`Resume document was not found: ${docx}`);
  }
  if (fs.existsSync(pdf)) {
    fs.unlinkSync(pdf);
  }

  const script = `
$ErrorActionPreference = 'Stop'
$docx = ${powershellString(docx)}
$pdf = ${powershellString(pdf)}
$word = $null
$doc = $null
$docsBefore = 0
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $docsBefore = $word.Documents.Count
  $doc = $word.Documents.Open($docx, $false, $true, $false)
  $null = $doc.ExportAsFixedFormat($pdf, 17)
} finally {
  if ($null -ne $doc) {
    $doc.Close($false) | Out-Null
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc)
  }
  if ($null -ne $word) {
    if ($docsBefore -eq 0) { $word.Quit() | Out-Null }
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word)
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
if (-not (Test-Path -LiteralPath $pdf)) { throw 'Word did not create the PDF' }
`;

  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  try {
    await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
      { timeout: 120000, windowsHide: true }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not export the resume PDF from the Word document. ${message}`);
  }

  if (!fs.existsSync(pdf)) {
    throw new Error('Could not export the resume PDF from the Word document.');
  }
}
