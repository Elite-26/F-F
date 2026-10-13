import jsPDF from 'jspdf';
import { Paragraph, TextRun, AlignmentType } from 'docx';
import { PDFContext } from './header';
import { parseBoldMarkdown, HighlightedText } from '../utils/highlight-terms';
import {
  tokenizeSegments,
  splitTokensIntoLines,
  drawLeftAlignedTokens,
  PDFToken,
} from '../utils/pdf-text';
import {
  FONT_SIZES,
  SPACING,
  INDENTS,
  LINE_HEIGHT_MULTIPLIER,
  FONT_ASCENT_MULTIPLIER,
  BORDER,
  DOCX_SPACING,
} from '../config/resume-config';

// ProfessionalSummaryConfig: [text]
export type ProfessionalSummaryConfig = string[];

export function addProfessionalSummaryToPDF(
  context: PDFContext,
  config: ProfessionalSummaryConfig,
  _highlightTerms?: string[]
): number {
  const { pdf, leftMargin, contentWidth, getLineHeight, checkPageBreak } = context;
  let currentY = context.currentY;
  
  const sectionFontSize = FONT_SIZES.section;
  const normalFontSize = FONT_SIZES.normal;
  const tabWidth = INDENTS.tab;
  const sectionFontAscent = sectionFontSize * FONT_ASCENT_MULTIPLIER;
  const normalFontAscent = normalFontSize * FONT_ASCENT_MULTIPLIER;

  // Add "Professional Summary" - left-aligned, 12pt, bold, with bottom border
  pdf.setFontSize(sectionFontSize);
  pdf.setFont('helvetica', 'bold');
  const sectionText = 'Professional Summary';
  const sectionX = leftMargin;
  let y = context.currentY - getLineHeight(FONT_SIZES.normal) + sectionFontAscent;
  pdf.text(sectionText, sectionX, y);
  
  // Draw bottom border
  const borderY = y + (sectionFontSize * 0.2) + SPACING.sectionBorderPadding;
  pdf.setLineWidth(BORDER.width);
  pdf.setDrawColor(0, 0, 0);
  pdf.line(leftMargin, borderY, leftMargin + contentWidth, borderY);
  
  // Enter
  y += getLineHeight(sectionFontSize) + SPACING.enter;

  // Add Professional Summary text with highlighting
  pdf.setFontSize(normalFontSize);
  pdf.setFont('helvetica', 'normal');
  y = y - getLineHeight(sectionFontSize) + normalFontAscent;
  
  const highlightedSegments = parseBoldMarkdown(config[0] || '');
  
  const ensureSpace = () => {
    context.currentY = y;
    const pageBreakOccurred = checkPageBreak(getLineHeight(normalFontSize));
    if (pageBreakOccurred) {
      y = context.currentY;
    }
  };

  const summaryTextWidth = contentWidth;
  const tokens = tokenizeSegments(highlightedSegments);
  const summaryLines = splitTokensIntoLines(pdf, tokens, summaryTextWidth);

  summaryLines.forEach((lineTokens, lineIdx) => {
    if (lineIdx > 0) {
      y += getLineHeight(normalFontSize);
    }
    ensureSpace();

    const xPos = leftMargin;
    const lineWidth = contentWidth;
    const isLastLine = lineIdx === summaryLines.length - 1;
    drawLeftAlignedTokens(pdf, lineTokens, xPos, y, lineWidth, isLastLine);
  });
  
  // Enter
  y += getLineHeight(normalFontSize) + SPACING.enter;
  context.currentY = y;
  return y;
}

export function addProfessionalSummaryToDOCX(
  config: ProfessionalSummaryConfig,
  _highlightTerms?: string[]
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Add "Professional Summary" - left-aligned, 12pt, bold, with bottom border
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Professional Summary',
          bold: true,
          size: FONT_SIZES.section * 2, // DOCX uses half-points
          font: 'Arial',
        }),
      ],
      alignment: AlignmentType.LEFT,
      border: {
        bottom: {
          color: BORDER.color,
          size: BORDER.size,
          style: BORDER.style,
        },
      },
      spacing: { after: DOCX_SPACING.enter },
    })
  );

  // Add Professional Summary text with inline **bold** markers
  const highlightedSegments = parseBoldMarkdown(config[0] || '');
  
  paragraphs.push(
    new Paragraph({
      children: highlightedSegments.map(segment => 
        new TextRun({
          text: segment.text,
          bold: segment.bold,
          size: FONT_SIZES.normal * 2, // DOCX uses half-points
          font: 'Arial',
        })
      ),
      alignment: AlignmentType.LEFT,
      spacing: { after: DOCX_SPACING.enter },
    })
  );

  return paragraphs;
}

export function renderProfessionalSummaryPreview(
  config: ProfessionalSummaryConfig,
  _highlightTerms?: string[]
): JSX.Element {
  const highlightedSegments = parseBoldMarkdown(config[0] || '');
  
  return (
    <>
      {/* Professional Summary - Left-aligned, 12pt, Bold, Bottom Border */}
      <div 
        style={{
          textAlign: 'left',
          fontSize: '12pt',
          fontWeight: 'bold',
          borderBottom: '1px solid black',
          paddingBottom: '3pt',
          marginBottom: '12pt',
        }}
      >
        Professional Summary
      </div>
      
      {/* Professional Summary Text - Left-aligned, 10pt */}
      <div 
        style={{
          textAlign: 'left',
          fontSize: '10pt',
          marginBottom: '12pt',
        }}
      >
        {highlightedSegments.map((segment, index) => 
          segment.bold ? (
            <strong key={index}>{segment.text}</strong>
          ) : (
            <span key={index}>{segment.text}</span>
          )
        )}
      </div>
    </>
  );
}

