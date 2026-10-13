import { Paragraph, TextRun, AlignmentType } from 'docx';
import { PDFContext } from './header';
import { parseBoldMarkdown } from '../utils/highlight-terms';
import { drawRichParagraph } from '@/lib/resume/rich-text';
import {
  FONT_SIZES,
  SPACING,
  INDENTS,
  FONT_ASCENT_MULTIPLIER,
  DOCX_SPACING,
} from '../config/resume-config';

// CoverLetterConfig: { header: [name, contact], content: [paragraph1, paragraph2, ...], footer: [closing, signature] }
export interface CoverLetterConfig {
  header: string[]; // [name, contact]
  content: string[]; // Array of paragraphs
  footer: string[]; // [closing, signature]
}

export function addCoverLetterToPDF(
  context: PDFContext,
  config: CoverLetterConfig
): number {
  const { pdf, leftMargin, topMargin, contentWidth, getLineHeight } = context;

  pdf.setFontSize(FONT_SIZES.name);
  pdf.setFont('helvetica', 'bold');
  const nameWidth = pdf.getTextWidth(config.header[0]);
  const nameX = leftMargin + (contentWidth - nameWidth) / 2;
  const nameFontAscent = FONT_SIZES.name * FONT_ASCENT_MULTIPLIER;
  let y = topMargin + nameFontAscent;
  pdf.text(config.header[0], nameX, y);

  y += getLineHeight(FONT_SIZES.name) + SPACING.enter;

  pdf.setFontSize(FONT_SIZES.contact);
  pdf.setFont('helvetica', 'normal');
  const contactWidth = pdf.getTextWidth(config.header[1]);
  const contactX = leftMargin + (contentWidth - contactWidth) / 2;
  const contactFontAscent = FONT_SIZES.contact * FONT_ASCENT_MULTIPLIER;
  y = y - getLineHeight(FONT_SIZES.name) + contactFontAscent;
  pdf.text(config.header[1], contactX, y);

  y += getLineHeight(FONT_SIZES.contact) + SPACING.enter;
  y += getLineHeight(FONT_SIZES.contact) + SPACING.enter;

  context.currentY = y;

  const normalFontAscent = FONT_SIZES.normal * FONT_ASCENT_MULTIPLIER;
  const firstLineIndentX = leftMargin + INDENTS.tab;
  const lineHeight = getLineHeight(FONT_SIZES.normal);

  config.content.forEach((paragraph, index) => {
    if (context.checkPageBreak(lineHeight * 3)) {
      y = context.topMargin + normalFontAscent;
    } else {
      y = context.currentY + normalFontAscent;
    }

    const yRef = { y };
    drawRichParagraph(pdf, paragraph, firstLineIndentX, yRef, contentWidth - INDENTS.tab, {
      font: 'helvetica',
      fontSize: FONT_SIZES.normal,
      color: [0, 0, 0],
      lineHeight,
      ensure: (needed) => {
        if (context.checkPageBreak(needed)) {
          yRef.y = context.topMargin + normalFontAscent;
        }
      },
    });
    y = yRef.y;

    if (index < config.content.length - 1) {
      y += lineHeight + SPACING.enter;
    }

    context.currentY = y;
  });

  if (config.footer && config.footer.length >= 2) {
    y += getLineHeight(FONT_SIZES.normal) + SPACING.enter;

    if (context.checkPageBreak(getLineHeight(FONT_SIZES.normal) * 2)) {
      y = context.topMargin + normalFontAscent;
    } else {
      y = context.currentY + normalFontAscent;
    }

    y += getLineHeight(FONT_SIZES.normal) + SPACING.enter;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(FONT_SIZES.normal);
    pdf.text(config.footer[0], leftMargin, y);
    y += getLineHeight(FONT_SIZES.normal) + SPACING.enter;
    pdf.text(config.footer[1], leftMargin, y);

    context.currentY = y;
  }

  return context.currentY;
}

export function addCoverLetterToDOCX(config: CoverLetterConfig): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: config.header[0],
          bold: true,
          size: FONT_SIZES.name * 2,
          font: 'Arial',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: DOCX_SPACING.enter },
    })
  );

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: config.header[1],
          size: FONT_SIZES.contact * 2,
          font: 'Arial',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: DOCX_SPACING.enter },
    })
  );

  paragraphs.push(
    new Paragraph({
      children: [],
      spacing: { after: DOCX_SPACING.enter },
    })
  );

  config.content.forEach((paragraph) => {
    const segments = parseBoldMarkdown(paragraph);
    paragraphs.push(
      new Paragraph({
        children: segments.map(
          (segment) =>
            new TextRun({
              text: segment.text,
              bold: segment.bold,
              size: FONT_SIZES.normal * 2,
              font: 'Arial',
            })
        ),
        alignment: AlignmentType.LEFT,
        indent: {
          firstLine: INDENTS.docxTab,
        },
        spacing: { after: DOCX_SPACING.enter },
      })
    );
  });

  if (config.footer && config.footer.length >= 2) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: config.footer[0],
            size: FONT_SIZES.normal * 2,
            font: 'Arial',
          }),
        ],
        alignment: AlignmentType.LEFT,
        spacing: { after: DOCX_SPACING.enter },
      })
    );

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: config.footer[1],
            size: FONT_SIZES.normal * 2,
            font: 'Arial',
          }),
        ],
        alignment: AlignmentType.LEFT,
        spacing: { after: 0 },
      })
    );
  }

  return paragraphs;
}

function renderRich(text: string) {
  return parseBoldMarkdown(text).map((segment, index) =>
    segment.bold ? <strong key={index}>{segment.text}</strong> : <span key={index}>{segment.text}</span>
  );
}

export function renderCoverLetterPreview(config: CoverLetterConfig): JSX.Element {
  return (
    <>
      <div
        style={{
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '22pt',
          marginBottom: '12pt',
        }}
      >
        {config.header[0]}
      </div>

      <div
        style={{
          textAlign: 'center',
          fontSize: '10pt',
          marginBottom: '12pt',
        }}
      >
        {config.header[1]}
      </div>

      <div style={{ marginBottom: '12pt' }}></div>

      <div style={{ fontSize: '10pt' }}>
        {config.content.map((paragraph, index) => (
          <div
            key={index}
            style={{
              marginBottom: '12pt',
              textAlign: 'left',
              textIndent: '0.5in',
            }}
          >
            {renderRich(paragraph)}
          </div>
        ))}
      </div>

      {config.footer && config.footer.length >= 2 && (
        <div style={{ fontSize: '10pt', marginTop: '12pt' }}>
          <div style={{ marginBottom: '12pt' }}>{config.footer[0]}</div>
          <div>{config.footer[1]}</div>
        </div>
      )}
    </>
  );
}
