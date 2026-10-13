import jsPDF from 'jspdf';
import { Paragraph, TextRun, AlignmentType } from 'docx';
import { PDFContext } from './header';
import { parseBoldMarkdown } from '../utils/highlight-terms';
import {
  tokenizeSegments,
  splitTokensIntoLines,
  drawLeftAlignedTokens,
} from '../utils/pdf-text';
import {
  FONT_SIZES,
  SPACING,
  INDENTS,
  FONT_ASCENT_MULTIPLIER,
  BORDER,
  DOCX_SPACING,
} from '../config/resume-config';

export interface CertificationsConfig {
  certifications: string[];
}

export function addCertificationsToPDF(
  context: PDFContext,
  config: CertificationsConfig
): number {
  const { pdf, leftMargin, rightMargin, contentWidth, getLineHeight, checkPageBreak } = context;
  let currentY = context.currentY;

  const sectionFontSize = FONT_SIZES.section;
  const normalFontSize = FONT_SIZES.normal;
  const sectionFontAscent = sectionFontSize * FONT_ASCENT_MULTIPLIER;
  const normalFontAscent = normalFontSize * FONT_ASCENT_MULTIPLIER;
  const xpBulletIndent = INDENTS.bullet;
  const xpBulletTextIndent = SPACING.bulletTextIndent;

  pdf.setFontSize(sectionFontSize);
  pdf.setFont('helvetica', 'bold');
  const pageBreakOccurred = checkPageBreak(getLineHeight(sectionFontSize) + getLineHeight(normalFontSize) + 12);
  if (pageBreakOccurred) {
    currentY = context.currentY;
  }
  const certificationsText = 'Certifications';
  const certificationsX = leftMargin;
  let y = currentY - getLineHeight(normalFontSize) + sectionFontAscent;
  pdf.text(certificationsText, certificationsX, y);

  const certificationsBorderY = y + (sectionFontSize * 0.2) + SPACING.sectionBorderPadding;
  pdf.setLineWidth(BORDER.width);
  pdf.setDrawColor(0, 0, 0);
  pdf.line(leftMargin, certificationsBorderY, rightMargin, certificationsBorderY);

  y += getLineHeight(sectionFontSize) + SPACING.enter;

  pdf.setFontSize(normalFontSize);
  pdf.setFont('helvetica', 'normal');
  y = y - getLineHeight(sectionFontSize) + normalFontAscent;

  const textWidth = contentWidth - xpBulletIndent - xpBulletTextIndent;

  config.certifications.forEach((cert, index) => {
    const broke = checkPageBreak(getLineHeight(normalFontSize));
    if (broke) {
      y = context.currentY;
    }
    pdf.text('•', leftMargin + xpBulletIndent, y);

    const segments = parseBoldMarkdown(cert);
    const tokens = tokenizeSegments(segments);
    const lines = splitTokensIntoLines(pdf, tokens, textWidth);
    lines.forEach((lineTokens, lineIdx) => {
      if (lineIdx > 0) {
        y += getLineHeight(normalFontSize);
        const again = checkPageBreak(getLineHeight(normalFontSize));
        if (again) {
          y = context.currentY;
        }
      }
      drawLeftAlignedTokens(pdf, lineTokens, leftMargin + xpBulletIndent + xpBulletTextIndent, y, textWidth, lineIdx === lines.length - 1);
    });

    if (index < config.certifications.length - 1) {
      y += getLineHeight(normalFontSize) + SPACING.bulletAfter;
    }
  });

  y += getLineHeight(normalFontSize) + SPACING.enter;

  context.currentY = y;
  return y;
}

export function addCertificationsToDOCX(config: CertificationsConfig): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Certifications',
          bold: true,
          size: FONT_SIZES.section * 2,
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

  config.certifications.forEach((cert, index) => {
    const segments = parseBoldMarkdown(cert);
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '•   ',
            size: FONT_SIZES.normal * 2,
            font: 'Arial',
          }),
          ...segments.map(
            (segment) =>
              new TextRun({
                text: segment.text,
                bold: segment.bold,
                size: FONT_SIZES.normal * 2,
                font: 'Arial',
              })
          ),
        ],
        alignment: AlignmentType.LEFT,
        indent: { left: INDENTS.docxBullet },
        spacing: {
          after:
            index < config.certifications.length - 1
              ? DOCX_SPACING.bulletAfter
              : DOCX_SPACING.certificationsAfter,
        },
      })
    );
  });

  paragraphs.push(
    new Paragraph({
      children: [],
      spacing: { after: DOCX_SPACING.enter },
    })
  );

  return paragraphs;
}

export function renderCertificationsPreview(config: CertificationsConfig): JSX.Element {
  return (
    <>
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
        Certifications
      </div>

      <div style={{ marginLeft: '0.25in', marginBottom: '12pt' }}>
        {config.certifications.map((cert, index) => {
          const segments = parseBoldMarkdown(cert);
          return (
            <div
              key={index}
              style={{
                fontSize: '10pt',
                marginBottom: index < config.certifications.length - 1 ? '3pt' : '0',
              }}
            >
              •{' '}
              {segments.map((segment, segIndex) =>
                segment.bold ? (
                  <strong key={segIndex}>{segment.text}</strong>
                ) : (
                  <span key={segIndex}>{segment.text}</span>
                )
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginBottom: '12pt' }}></div>
    </>
  );
}
