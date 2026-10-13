import jsPDF from 'jspdf';
import { Paragraph, TextRun, AlignmentType } from 'docx';
import { PDFContext } from './header';
import {
  FONT_SIZES,
  SPACING,
  INDENTS,
  LINE_HEIGHT_MULTIPLIER,
  FONT_ASCENT_MULTIPLIER,
  BORDER,
  DOCX_SPACING,
} from '../config/resume-config';

// EducationConfig: Array of [university, degree, dateRange] entries
export type EducationConfig = string[][];

export function addEducationToPDF(
  context: PDFContext,
  config: EducationConfig
): number {
  const { pdf, leftMargin, rightMargin, contentWidth, getLineHeight, checkPageBreak } = context;
  let currentY = context.currentY;
  
  const sectionFontSize = FONT_SIZES.section;
  const normalFontSize = FONT_SIZES.normal;
  const sectionFontAscent = sectionFontSize * FONT_ASCENT_MULTIPLIER;
  const normalFontAscent = normalFontSize * FONT_ASCENT_MULTIPLIER;
  const xpBulletIndent = INDENTS.bullet;
  const xpBulletTextIndent = SPACING.bulletTextIndent;

  // Add "Education" - left-aligned, 12pt, bold, with bottom border
  pdf.setFontSize(sectionFontSize);
  pdf.setFont('helvetica', 'bold');
  const pageBreakOccurred = checkPageBreak(getLineHeight(sectionFontSize) + getLineHeight(normalFontSize) + 12);
  if (pageBreakOccurred) {
    currentY = context.currentY; // Only update currentY if page break occurred
  }
  const educationText = 'Education';
  const educationX = leftMargin;
  let y = currentY - getLineHeight(normalFontSize) + sectionFontAscent;
  pdf.text(educationText, educationX, y);
  
  // Draw bottom border
  const educationBorderY = y + (sectionFontSize * 0.2) + SPACING.sectionBorderPadding;
  pdf.setLineWidth(BORDER.width);
  pdf.setDrawColor(0, 0, 0);
  pdf.line(leftMargin, educationBorderY, rightMargin, educationBorderY);
  
  // Enter
  y += getLineHeight(sectionFontSize) + SPACING.enter;

  // Add education bullets - format: bold(university name) | degree | dateRange
  pdf.setFontSize(normalFontSize);
  pdf.setFont('helvetica', 'normal');
  y = y - getLineHeight(sectionFontSize) + normalFontAscent;
  
  config.forEach((edu, index) => {
    const pageBreakOccurred2 = checkPageBreak(getLineHeight(normalFontSize));
    if (pageBreakOccurred2) {
      y = context.currentY; // Only update y if page break occurred
    }
    pdf.text('•', leftMargin + xpBulletIndent, y);
    pdf.setFont('helvetica', 'bold');
    pdf.text(edu[0] || '', leftMargin + xpBulletIndent + xpBulletTextIndent, y);
    const universityWidth = pdf.getTextWidth(edu[0] || '');
    pdf.setFont('helvetica', 'normal');
    const restOfText = ` | ${edu[1] || ''} | ${edu[2] || ''}`;
    const eduTextWidth = contentWidth - xpBulletIndent - xpBulletTextIndent;
    const eduLines = pdf.splitTextToSize(restOfText, eduTextWidth - universityWidth);
    eduLines.forEach((line: string, idx: number) => {
      if (idx > 0) {
        y += getLineHeight(normalFontSize);
        const pageBreakOccurred3 = checkPageBreak(getLineHeight(normalFontSize));
        if (pageBreakOccurred3) {
          y = context.currentY; // Only update y if page break occurred
        }
      }
      pdf.text(line, leftMargin + xpBulletIndent + xpBulletTextIndent + universityWidth, y);
    });
    
    if (index < config.length - 1) {
      y += getLineHeight(normalFontSize) + SPACING.enter;
    }
  });

  // Enter
  y += getLineHeight(normalFontSize) + SPACING.enter;

  context.currentY = y;
  return y;
}

export function addEducationToDOCX(config: EducationConfig): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Add "Education" - left-aligned, 12pt, bold, with bottom border
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Education',
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

  // Add education bullets - format: bold(university name) | degree | dateRange
  config.forEach((edu, index) => {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '•   ',
            size: FONT_SIZES.normal * 2, // DOCX uses half-points
            font: 'Arial',
          }),
          new TextRun({
            text: edu[0] || '',
            bold: true,
            size: FONT_SIZES.normal * 2, // DOCX uses half-points
            font: 'Arial',
          }),
          new TextRun({
            text: ` | ${edu[1] || ''} | ${edu[2] || ''}`,
            size: FONT_SIZES.normal * 2, // DOCX uses half-points
            font: 'Arial',
          }),
        ],
        alignment: AlignmentType.LEFT,
        indent: { left: INDENTS.docxBullet },
        spacing: { after: index < config.length - 1 ? DOCX_SPACING.enter : DOCX_SPACING.certificationsAfter },
      })
    );
  });

  // Enter (second paragraph break)
  paragraphs.push(
    new Paragraph({
      children: [],
      spacing: { after: DOCX_SPACING.enter },
    })
  );

  return paragraphs;
}

export function renderEducationPreview(config: EducationConfig): JSX.Element {
  return (
    <>
      {/* Education - Left-aligned, 12pt, Bold, Bottom Border */}
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
        Education
      </div>
      
      {/* Education Bullets - format: bold(university name) | degree | dateRange */}
      <div style={{ marginLeft: '0.25in', marginBottom: '12pt' }}>
        {config.map((edu, index) => (
          <div key={index} style={{ fontSize: '10pt', marginBottom: index < config.length - 1 ? '12pt' : '0' }}>
            •   <strong>{edu[0] || ''}</strong> | {edu[1] || ''} | {edu[2] || ''}
          </div>
        ))}
      </div>
      
      {/* Empty div for Enter after education */}
      <div style={{ marginBottom: '12pt' }}></div>
    </>
  );
}

