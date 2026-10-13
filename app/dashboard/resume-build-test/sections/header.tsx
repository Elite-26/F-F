import jsPDF from 'jspdf';
import { Paragraph, TextRun, AlignmentType } from 'docx';
import {
  FONT_SIZES,
  SPACING,
  LINE_HEIGHT_MULTIPLIER,
  FONT_ASCENT_MULTIPLIER,
  DOCX_SPACING,
} from '../config/resume-config';

// HeaderConfig: [name, title, contact]
export type HeaderConfig = string[];

export interface PDFContext {
  pdf: jsPDF;
  get currentY(): number;
  set currentY(value: number);
  leftMargin: number;
  rightMargin: number;
  topMargin: number;
  bottomMargin: number;
  contentWidth: number;
  getLineHeight: (fontSize: number) => number;
  checkPageBreak: (requiredHeight: number) => boolean;
}

export function addHeaderToPDF(context: PDFContext, config: HeaderConfig): number {
  const { pdf, leftMargin, topMargin, contentWidth, getLineHeight } = context;
  let currentY = context.currentY;
  
  // Add name - centered, Bold, 22pt
  pdf.setFontSize(FONT_SIZES.name);
  pdf.setFont('helvetica', 'bold');
  const nameWidth = pdf.getTextWidth(config[0]);
  const nameX = leftMargin + (contentWidth - nameWidth) / 2;
  const nameFontAscent = FONT_SIZES.name * FONT_ASCENT_MULTIPLIER;
  let y = topMargin + nameFontAscent;
  pdf.text(config[0], nameX, y);
  
  // Enter (paragraph break)
  y += getLineHeight(FONT_SIZES.name) + SPACING.enter;

  // Add title - centered, 10pt
  pdf.setFontSize(FONT_SIZES.title);
  pdf.setFont('helvetica', 'normal');
  const titleWidth = pdf.getTextWidth(config[1]);
  const titleX = leftMargin + (contentWidth - titleWidth) / 2;
  const titleFontAscent = FONT_SIZES.title * FONT_ASCENT_MULTIPLIER;
  y = y - getLineHeight(FONT_SIZES.name) + titleFontAscent;
  pdf.text(config[1], titleX, y);
  
  // Shift Enter
  y += getLineHeight(FONT_SIZES.title) + SPACING.shiftEnter;

  // Add contact info - centered, 10pt
  pdf.setFontSize(FONT_SIZES.contact);
  pdf.setFont('helvetica', 'normal');
  const contactWidth = pdf.getTextWidth(config[2]);
  const contactX = leftMargin + (contentWidth - contactWidth) / 2;
  pdf.text(config[2], contactX, y);
  
  // Enter
  y += getLineHeight(FONT_SIZES.contact) + SPACING.enter;
  
  // Enter (second paragraph break)
  y += getLineHeight(FONT_SIZES.contact) + SPACING.enter;

  context.currentY = y;
  return y;
}

export function addHeaderToDOCX(config: HeaderConfig): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Add name - centered, Bold, 22pt
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: config[0],
          bold: true,
          size: FONT_SIZES.name * 2, // DOCX uses half-points
          font: 'Arial',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: DOCX_SPACING.enter },
    })
  );

  // Add title - centered, 10pt
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: config[1],
          size: FONT_SIZES.title * 2, // DOCX uses half-points
          font: 'Arial',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: DOCX_SPACING.shiftEnter },
    })
  );

  // Add contact info - centered, 10pt
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: config[2],
          size: FONT_SIZES.contact * 2, // DOCX uses half-points
          font: 'Arial',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: DOCX_SPACING.enter },
    })
  );

  // Enter (second paragraph break)
  paragraphs.push(
    new Paragraph({
      children: [],
      spacing: { after: DOCX_SPACING.enter },
    })
  );

  return paragraphs;
}

export function renderHeaderPreview(config: HeaderConfig): JSX.Element {
  return (
    <>
      {/* Name - Centered, Bold, 22pt */}
      <div 
        style={{
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '22pt',
          marginBottom: '12pt',
        }}
      >
        {config[0]}
      </div>
      
      {/* Title - Centered, 10pt */}
      <div 
        style={{
          textAlign: 'center',
          fontSize: '10pt',
          marginBottom: '6pt',
        }}
      >
        {config[1]}
      </div>
      
      {/* Contact Info - Centered, 10pt */}
      <div 
        style={{
          textAlign: 'center',
          fontSize: '10pt',
          marginBottom: '12pt',
        }}
      >
        {config[2]}
      </div>
      
      {/* Empty div for second Enter before Professional Summary */}
      <div style={{ marginBottom: '12pt' }}></div>
    </>
  );
}

