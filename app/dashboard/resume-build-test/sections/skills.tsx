import jsPDF from 'jspdf';
import { Paragraph, TextRun, AlignmentType } from 'docx';
import { PDFContext } from './header';
import { parseBoldMarkdown, HighlightedText } from '../utils/highlight-terms';
import {
  tokenizeSegments,
  splitTokensIntoLines,
  drawJustifiedTokens,
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

export interface SkillsConfig {
  skills: string[];
  highlightTerms?: string[];
}

export function addSkillsToPDF(context: PDFContext, config: SkillsConfig): number {
  const { pdf, leftMargin, rightMargin, contentWidth, getLineHeight, checkPageBreak } = context;
  let currentY = context.currentY;
  
  const sectionFontSize = FONT_SIZES.section;
  const normalFontSize = FONT_SIZES.normal;
  const sectionFontAscent = sectionFontSize * FONT_ASCENT_MULTIPLIER;
  const normalFontAscent = normalFontSize * FONT_ASCENT_MULTIPLIER;
  const bulletIndent = INDENTS.bullet;
  const bulletTextIndent = SPACING.bulletTextIndent;
  const skillTextStartX = leftMargin + bulletIndent + bulletTextIndent;
  const skillTextWidth = contentWidth - bulletIndent - bulletTextIndent;

  // Add "Skills" - left-aligned, 12pt, bold, with bottom border
  pdf.setFontSize(sectionFontSize);
  pdf.setFont('helvetica', 'bold');
  const skillsText = 'Skills';
  const skillsX = leftMargin;
  let y = currentY - getLineHeight(normalFontSize) + sectionFontAscent;
  pdf.text(skillsText, skillsX, y);
  
  // Draw bottom border
  const skillsBorderY = y + (sectionFontSize * 0.2) + SPACING.sectionBorderPadding;
  pdf.setLineWidth(BORDER.width);
  pdf.setDrawColor(0, 0, 0);
  pdf.line(leftMargin, skillsBorderY, rightMargin, skillsBorderY);
  
  // Enter
  y += getLineHeight(sectionFontSize) + SPACING.enter;

  // Add skills bullets
  pdf.setFontSize(normalFontSize);
  pdf.setFont('helvetica', 'normal');
  y = y - getLineHeight(sectionFontSize) + normalFontAscent;
  
  const ensureSpace = () => {
    context.currentY = y;
    const pageBreakOccurred = checkPageBreak(getLineHeight(normalFontSize));
    if (pageBreakOccurred) {
      y = context.currentY;
    }
  };
  
  config.skills.forEach((skill, index) => {
    ensureSpace();
    pdf.text('•', leftMargin + bulletIndent, y);
    
    // Highlight terms if provided
    const highlightedSegments = parseBoldMarkdown(skill);
    
    const tokens = tokenizeSegments(highlightedSegments);
    const skillLines = splitTokensIntoLines(pdf, tokens, skillTextWidth);
    
    skillLines.forEach((lineTokens, lineIdx) => {
      if (lineIdx > 0) {
        y += getLineHeight(normalFontSize);
        ensureSpace();
      }
      
      const xPos = skillTextStartX;
      const isLastLine = lineIdx === skillLines.length - 1;
      drawJustifiedTokens(pdf, lineTokens, xPos, y, skillTextWidth, isLastLine);
    });
    
    if (index < config.skills.length - 1) {
      y += getLineHeight(normalFontSize) + SPACING.bulletAfter;
    }
  });
  
  // Enter
  y += getLineHeight(normalFontSize) + SPACING.sectionAfter;

  context.currentY = y;
  return y;
}

export function addSkillsToDOCX(config: SkillsConfig): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Add "Skills" - left-aligned, 12pt, bold, with bottom border
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Skills',
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

  // Add skills bullets
  config.skills.forEach((skill) => {
    // Highlight terms if provided
    const highlightedSegments = parseBoldMarkdown(skill);
    
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '•   ',
            size: FONT_SIZES.normal * 2, // DOCX uses half-points
            font: 'Arial',
          }),
          ...highlightedSegments.map(segment =>
            new TextRun({
              text: segment.text,
              bold: segment.bold,
              size: FONT_SIZES.normal * 2, // DOCX uses half-points
              font: 'Arial',
            })
          ),
        ],
        alignment: AlignmentType.LEFT,
        indent: { left: INDENTS.docxBullet },
        spacing: { after: DOCX_SPACING.bulletAfter },
      })
    );
  });

  // Enter after skills
  paragraphs.push(
    new Paragraph({
      children: [],
      spacing: { after: DOCX_SPACING.enter },
    })
  );

  return paragraphs;
}

export function renderSkillsPreview(config: SkillsConfig): JSX.Element {
  return (
    <>
      {/* Skills - Left-aligned, 12pt, Bold, Bottom Border */}
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
        Skills
      </div>
      
      {/* Skills Bullets */}
      <div style={{ marginLeft: '0.25in', marginBottom: '12pt' }}>
        {config.skills.map((skill, index) => {
          const highlightedSegments = parseBoldMarkdown(skill);
          
          return (
            <div key={index} style={{ fontSize: '10pt', marginBottom: '3pt' }}>
              •   {highlightedSegments.map((segment, segIndex) =>
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
      
      {/* Empty div for Enter after skills */}
      <div style={{ marginBottom: '12pt' }}></div>
    </>
  );
}

