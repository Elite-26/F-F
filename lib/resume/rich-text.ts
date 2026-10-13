import { parseBoldMarkdown } from '../../app/dashboard/resume-build-test/utils/highlight-terms';

export { parseBoldMarkdown, stripBoldMarkers } from '../../app/dashboard/resume-build-test/utils/highlight-terms';
export type { HighlightedText } from '../../app/dashboard/resume-build-test/utils/highlight-terms';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function withBold(rPr: string, bold: boolean): string {
  if (!bold) {
    return rPr;
  }
  if (!rPr) {
    return '<w:rPr><w:b/></w:rPr>';
  }
  if (/<w:b[\s/>]/.test(rPr)) {
    return rPr;
  }
  return rPr.replace(/<\/w:rPr>/, '<w:b/></w:rPr>');
}

/**
 * Convert **bold** markers inside Word runs into separate bold/normal runs.
 */
export function applyInlineBoldMarkers(xml: string): string {
  return xml.replace(/<w:r\b[^>]*>[\s\S]*?<\/w:r>/g, (run) => {
    const texts: string[] = [];
    const textRe = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
    let match: RegExpExecArray | null;
    while ((match = textRe.exec(run))) {
      texts.push(
        match[1]
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/&amp;/g, '&')
      );
    }
    const joined = texts.join('');
    if (!joined.includes('**')) {
      return run;
    }

    const rPrMatch = run.match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
    const rPr = rPrMatch ? rPrMatch[0] : '';
    const segments = parseBoldMarkdown(joined);
    return segments
      .filter((segment) => segment.text.length > 0)
      .map((segment) => {
        const pr = withBold(rPr, segment.bold);
        return `<w:r>${pr}<w:t xml:space="preserve">${escapeXml(segment.text)}</w:t></w:r>`;
      })
      .join('');
  });
}

type RichPiece = { text: string; bold: boolean };

/**
 * Draw mixed normal/bold text for resume PDF templates. Advances yRef.y.
 */
export function drawRichParagraph(
  pdf: import('jspdf').default,
  text: string,
  x: number,
  yRef: { y: number },
  maxWidth: number,
  options: {
    font: string;
    fontSize: number;
    color: [number, number, number];
    lineHeight: number;
    ensure?: (needed: number) => void;
  }
): void {
  const { font, fontSize, color, lineHeight, ensure } = options;
  pdf.setFontSize(fontSize);
  pdf.setTextColor(...color);

  const pieces: RichPiece[] = [];
  parseBoldMarkdown(text || '').forEach((segment) => {
    segment.text.split(/(\s+)/).forEach((part) => {
      if (part) {
        pieces.push({ text: part, bold: segment.bold });
      }
    });
  });

  let line: RichPiece[] = [];
  let lineWidth = 0;

  const measure = (piece: RichPiece) => {
    pdf.setFont(font, piece.bold ? 'bold' : 'normal');
    return pdf.getTextWidth(piece.text);
  };

  const flush = () => {
    while (line.length > 0 && /^\s+$/.test(line[line.length - 1].text)) {
      line.pop();
    }
    if (line.length === 0) {
      return;
    }
    ensure?.(lineHeight);
    let cursor = x;
    line.forEach((piece) => {
      pdf.setFont(font, piece.bold ? 'bold' : 'normal');
      pdf.setTextColor(...color);
      pdf.text(piece.text, cursor, yRef.y);
      cursor += pdf.getTextWidth(piece.text);
    });
    yRef.y += lineHeight;
    line = [];
    lineWidth = 0;
  };

  pieces.forEach((piece) => {
    const isSpace = /^\s+$/.test(piece.text);
    if (isSpace && line.length === 0) {
      return;
    }
    const width = measure(piece);
    if (line.length > 0 && !isSpace && lineWidth + width > maxWidth) {
      flush();
    }
    line.push(piece);
    lineWidth += width;
  });
  flush();
}
