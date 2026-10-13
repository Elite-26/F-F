import type { jsPDF } from 'jspdf';

/** Draw a single underline under text already placed at (x, baselineY). */
export function underlinePdfText(
  pdf: jsPDF,
  text: string,
  x: number,
  baselineY: number,
  options?: { color?: [number, number, number]; offset?: number; lineWidth?: number }
): void {
  if (!text) {
    return;
  }
  const width = pdf.getTextWidth(text);
  if (width <= 0) {
    return;
  }
  const [r, g, b] = options?.color ?? [0, 0, 0];
  pdf.setDrawColor(r, g, b);
  pdf.setLineWidth(options?.lineWidth ?? 0.55);
  const y = baselineY + (options?.offset ?? 1.35);
  pdf.line(x, y, x + width, y);
}

/**
 * Ensure the Word run that contains `token` has a single underline
 * (used for {{COMPANY_NAME}} in templates 2–6 before placeholder fill).
 */
export function ensureDocxRunUnderlineForToken(xml: string, token: string): string {
  let result = xml;
  let searchFrom = 0;
  while (true) {
    const idx = result.indexOf(token, searchFrom);
    if (idx === -1) {
      break;
    }
    const rStart = result.lastIndexOf('<w:r', idx);
    if (rStart === -1) {
      searchFrom = idx + token.length;
      continue;
    }
    const tOpen = result.indexOf('<w:t', rStart);
    if (tOpen === -1 || tOpen > idx) {
      searchFrom = idx + token.length;
      continue;
    }
    const rPrOpen = result.indexOf('<w:rPr', rStart);
    if (rPrOpen !== -1 && rPrOpen < tOpen) {
      const rPrClose = result.indexOf('</w:rPr>', rPrOpen);
      if (rPrClose !== -1 && rPrClose < tOpen) {
        const rPrInner = result.slice(rPrOpen, rPrClose);
        if (!/<w:u[\s/>]/.test(rPrInner)) {
          result = `${result.slice(0, rPrClose)}<w:u w:val="single"/>${result.slice(rPrClose)}`;
        }
      }
    } else {
      result = `${result.slice(0, tOpen)}<w:rPr><w:u w:val="single"/></w:rPr>${result.slice(tOpen)}`;
    }
    searchFrom = idx + token.length + 24;
  }
  return result;
}
