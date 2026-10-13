import jsPDF from 'jspdf';
import { HighlightedText } from './highlight-terms';

export interface PDFToken {
  text: string;
  bold: boolean;
  isSpace: boolean;
}

export function tokenizeSegments(segments: HighlightedText[]): PDFToken[] {
  const tokens: PDFToken[] = [];

  segments.forEach((segment) => {
    const parts = segment.text.split(/(\s+)/);
    parts.forEach((part) => {
      if (!part) {
        return;
      }

      const isSpace = /^\s+$/.test(part);
      if (isSpace && part.length === 0) {
        return;
      }

      tokens.push({
        text: part,
        bold: segment.bold,
        isSpace,
      });
    });
  });

  return tokens;
}

export function splitTokensIntoLines(
  pdf: jsPDF,
  tokens: PDFToken[],
  maxWidth: number
): PDFToken[][] {
  const lines: PDFToken[][] = [];
  let currentLine: PDFToken[] = [];
  let currentWidth = 0;

  const flushLine = () => {
    while (
      currentLine.length > 0 &&
      currentLine[currentLine.length - 1].isSpace
    ) {
      const removed = currentLine.pop();
      if (removed) {
        currentWidth -= pdf.getTextWidth(removed.text);
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }
    currentLine = [];
    currentWidth = 0;
  };

  tokens.forEach((token) => {
    const tokenWidth = pdf.getTextWidth(token.text);
    if (token.isSpace && currentLine.length === 0) {
      return;
    }

    if (currentLine.length === 0 || currentWidth + tokenWidth <= maxWidth) {
      currentLine.push(token);
      currentWidth += tokenWidth;
    } else {
      flushLine();
      if (!token.isSpace) {
        currentLine.push(token);
        currentWidth = tokenWidth;
      }
    }
  });

  flushLine();

  return lines;
}

export function drawJustifiedTokens(
  pdf: jsPDF,
  lineTokens: PDFToken[],
  x: number,
  y: number,
  width: number,
  isLastLine: boolean
) {
  const tokens = trimTokens(lineTokens);

  if (tokens.length === 0) {
    return;
  }

  const wordTokens = tokens.filter((token) => !token.isSpace);
  const spaceTokens = tokens.filter((token) => token.isSpace);

  const wordsWidth = wordTokens.reduce(
    (sum, token) => sum + pdf.getTextWidth(token.text),
    0
  );
  const baseSpaceWidth = spaceTokens.reduce(
    (sum, token) => sum + pdf.getTextWidth(token.text),
    0
  );

  const extraSpaceTotal = Math.max(
    0,
    width - wordsWidth - baseSpaceWidth
  );
  const extraSpacePerGap =
    !isLastLine && spaceTokens.length > 0
      ? extraSpaceTotal / spaceTokens.length
      : 0;

  let currentX = x;
  tokens.forEach((token) => {
    if (token.isSpace) {
      currentX += pdf.getTextWidth(token.text) + extraSpacePerGap;
    } else {
      pdf.setFont('helvetica', token.bold ? 'bold' : 'normal');
      pdf.text(token.text, currentX, y);
      currentX += pdf.getTextWidth(token.text);
    }
  });
}

export function drawLeftAlignedTokens(
  pdf: jsPDF,
  lineTokens: PDFToken[],
  x: number,
  y: number,
  width: number,
  isLastLine: boolean
) {
  const tokens = trimTokens(lineTokens);

  if (tokens.length === 0) {
    return;
  }

  let currentX = x;
  tokens.forEach((token) => {
    if (token.isSpace) {
      currentX += pdf.getTextWidth(token.text);
    } else {
      pdf.setFont('helvetica', token.bold ? 'bold' : 'normal');
      pdf.text(token.text, currentX, y);
      currentX += pdf.getTextWidth(token.text);
    }
  });
}

function trimTokens(tokens: PDFToken[]): PDFToken[] {
  let start = 0;
  let end = tokens.length - 1;

  while (start <= end && tokens[start].isSpace) {
    start += 1;
  }
  while (end >= start && tokens[end].isSpace) {
    end -= 1;
  }

  return tokens.slice(start, end + 1);
}

