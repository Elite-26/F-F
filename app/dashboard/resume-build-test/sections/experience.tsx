import jsPDF from 'jspdf';
import { Paragraph, TextRun, AlignmentType } from 'docx';
import { PDFContext } from './header';
import {
  tokenizeSegments,
  splitTokensIntoLines,
  drawLeftAlignedTokens,
} from '../utils/pdf-text';
import { parseBoldMarkdown, HighlightedText } from '../utils/highlight-terms';
import {
  FONT_SIZES,
  SPACING,
  INDENTS,
  LINE_HEIGHT_MULTIPLIER,
  FONT_ASCENT_MULTIPLIER,
  BORDER,
  DOCX_SPACING,
} from '../config/resume-config';
import { parseExperienceGroup } from '@/lib/resume/experience-option';
import { underlinePdfText } from '@/lib/resume/company-underline';

// ExperienceConfig: { experience_static: [...], experience_dynamic: [...] }
export interface ExperienceConfig {
  experience_static: string[]; // [company1, location1, dateRange1, company2, location2, dateRange2, ...]
  experience_dynamic: string[]; // Single flat array of all bullets for all experiences, separated by 'EXPERIENCE_END' markers
  highlightTerms?: string[];
}

const xpBulletIndent = INDENTS.bullet;
const xpSubBulletIndent = INDENTS.subBullet;
const xpSubSubBulletIndent = INDENTS.subSubBullet;
const xpBulletTextIndent = SPACING.bulletTextIndent;

export function addExperienceToPDF(
  context: PDFContext,
  config: ExperienceConfig
): number {
  const { pdf, leftMargin, rightMargin, contentWidth, getLineHeight, checkPageBreak } = context;
  let currentY = context.currentY;
  
  const sectionFontSize = FONT_SIZES.section;
  const normalFontSize = FONT_SIZES.normal;
  const sectionFontAscent = sectionFontSize * FONT_ASCENT_MULTIPLIER;
  const normalFontAscent = normalFontSize * FONT_ASCENT_MULTIPLIER;

  // Add "Experience" - left-aligned, 12pt, bold, with bottom border
  pdf.setFontSize(sectionFontSize);
  pdf.setFont('helvetica', 'bold');
  const experienceText = 'Experience';
  const experienceX = leftMargin;
  let y = currentY - getLineHeight(normalFontSize) + sectionFontAscent;
  pdf.text(experienceText, experienceX, y);
  
  // Draw bottom border
  const experienceBorderY = y + (sectionFontSize * 0.2) + SPACING.sectionBorderPadding;
  pdf.setLineWidth(BORDER.width);
  pdf.setDrawColor(0, 0, 0);
  pdf.line(leftMargin, experienceBorderY, rightMargin, experienceBorderY);
  
  // Enter
  y += getLineHeight(sectionFontSize) + SPACING.enter;
  y = y - getLineHeight(sectionFontSize) + normalFontAscent;
  context.currentY = y;

  const ensureSpace = (lineHeight: number = getLineHeight(normalFontSize)) => {
    context.currentY = y;
    const pageBreakOccurred = checkPageBreak(lineHeight);
    if (pageBreakOccurred) {
      y = context.currentY;
    }
  };

  const getSegments = (text: string): HighlightedText[] => parseBoldMarkdown(text);

  const drawSegments = (
    segments: HighlightedText[],
    indentX: number,
    width: number
  ) => {
    const tokens = tokenizeSegments(segments);
    const lines = splitTokensIntoLines(pdf, tokens, width);
    lines.forEach((lineTokens, idx) => {
      if (idx > 0) {
        y += getLineHeight(normalFontSize);
      }
      ensureSpace();
      drawLeftAlignedTokens(
        pdf,
        lineTokens,
        indentX,
        y,
        width,
        idx === lines.length - 1
      );
    });
  };

  // Process each experience
  // Split dynamic array by 'EXPERIENCE_END' markers
  const experienceBullets: string[][] = [];
  let currentBullets: string[] = [];
  
  config.experience_dynamic.forEach((bullet) => {
    if (bullet === 'EXPERIENCE_END') {
      experienceBullets.push(currentBullets);
      currentBullets = [];
    } else {
      currentBullets.push(bullet);
    }
  });
  // Add the last experience if there's no trailing EXPERIENCE_END
  if (currentBullets.length > 0) {
    experienceBullets.push(currentBullets);
  }
  
  const numExperiences = experienceBullets.length;
  for (let expIndex = 0; expIndex < numExperiences; expIndex++) {
    const bullets = experienceBullets[expIndex];
    const { title: jobTitle, company, location, content: filteredBullets } = parseExperienceGroup(
      bullets,
      config.experience_static,
      expIndex
    );
    
    // Job title - Bold, Uppercase
    pdf.setFontSize(normalFontSize);
    pdf.setFont('helvetica', 'bold');
    ensureSpace(getLineHeight(normalFontSize) * 3);
    pdf.text(jobTitle.toUpperCase(), leftMargin, y);
    
    // Shift Enter
    y += getLineHeight(normalFontSize) + SPACING.shiftEnter;
    
    // Company info — underline company name only
    ensureSpace();
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    pdf.text(company || '', leftMargin, y);
    underlinePdfText(pdf, company || '', leftMargin, y);
    if (location) {
      const companyWidth = pdf.getTextWidth(company || '');
      pdf.text(` | ${location}`, leftMargin + companyWidth, y);
    }
    
    // Shift Enter
    // y += getLineHeight(normalFontSize) + SPACING.shiftEnter;
    
    // // Date range
    // ensureSpace();
    // pdf.text(dateRange, leftMargin, y);
    
    // Tight gap from company line to first bullet
    if (filteredBullets.length > 0) {
      y += getLineHeight(normalFontSize) + SPACING.experienceCompanyAfter;
    }
    
    // Process bullets array (excluding TITLE marker)
    // Format: [bullet1, bullet2, ..., 'PROJECT:ProjectName', subSubBullet1, ..., 'PROJECT_END', mainBullet1, ...]
    let inProject = false;
    
    filteredBullets.forEach((bulletText) => {
      // Check if this is a PROJECT marker
      if (bulletText.startsWith('PROJECT:')) {
        const projectName = bulletText.substring(8); // Remove 'PROJECT:' prefix
        inProject = true;
        ensureSpace();
        pdf.text('•', leftMargin + xpSubBulletIndent, y);
        pdf.text(projectName, leftMargin + xpSubBulletIndent + xpBulletTextIndent, y);
        y += getLineHeight(normalFontSize) + SPACING.bulletAfter;
        return;
      }
      
      // Check if this is a PROJECT_END marker
      if (bulletText === 'PROJECT_END') {
        inProject = false;
        return; // Skip rendering PROJECT_END marker
      }
      
      // Determine bullet type: if inProject, it's subSub, otherwise it's main
      const currentBulletType = inProject ? 'subSub' : 'main';
      
      // Regular bullet
      ensureSpace();
      const indent = currentBulletType === 'subSub' ? xpSubSubBulletIndent : xpBulletIndent;
      pdf.text('•', leftMargin + indent, y);
      const bulletTextWidth = contentWidth - indent - xpBulletTextIndent;
      
      const highlightedSegments = getSegments(bulletText);
      drawSegments(
        highlightedSegments,
        leftMargin + indent + xpBulletTextIndent,
        bulletTextWidth
      );
      y += getLineHeight(normalFontSize) + SPACING.bulletAfter;
    });
    
    // Small gap between experiences (except last)
    if (expIndex < numExperiences - 1) {
      y += SPACING.experienceBetween;
      ensureSpace(getLineHeight(normalFontSize) * 3);
    }
  }

  // Enter
  y += getLineHeight(normalFontSize) + SPACING.enter;

  context.currentY = y;
  return y;
}

export function addExperienceToDOCX(config: ExperienceConfig): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Add "Experience" - left-aligned, 12pt, bold, with bottom border
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Experience',
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

  // Split dynamic array by 'EXPERIENCE_END' markers
  const experienceBullets: string[][] = [];
  let currentBullets: string[] = [];
  
  config.experience_dynamic.forEach((bullet) => {
    if (bullet === 'EXPERIENCE_END') {
      experienceBullets.push(currentBullets);
      currentBullets = [];
    } else {
      currentBullets.push(bullet);
    }
  });
  if (currentBullets.length > 0) {
    experienceBullets.push(currentBullets);
  }
  
  // Process each experience
  const numExperiences = experienceBullets.length;
  for (let expIndex = 0; expIndex < numExperiences; expIndex++) {
    const bullets = experienceBullets[expIndex];
    const {
      title: jobTitle,
      company,
      location,
      timeline: dateRange,
      content: filteredBullets,
    } = parseExperienceGroup(bullets, config.experience_static, expIndex);
    
    // Job title
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: jobTitle.toUpperCase(),
            bold: true,
            size: 20,
            font: 'Arial',
          }),
        ],
        alignment: AlignmentType.LEFT,
        spacing: { after: DOCX_SPACING.shiftEnter },
      })
    );

    // Company info — underline company name only
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: company || '',
            size: FONT_SIZES.normal * 2, // DOCX uses half-points
            font: 'Arial',
            underline: {},
          }),
          ...(location
            ? [
                new TextRun({
                  text: ` | ${location}`,
                  size: FONT_SIZES.normal * 2,
                  font: 'Arial',
                }),
              ]
            : []),
        ],
        alignment: AlignmentType.LEFT,
        spacing: {
          after: filteredBullets.length > 0 || (dateRange && dateRange !== location)
            ? DOCX_SPACING.experienceCompanyAfter
            : 0,
        },
      })
    );

    // Date range only when distinct from location (dates often sit on the company line)
    if (dateRange && dateRange !== location) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: dateRange,
              size: FONT_SIZES.normal * 2, // DOCX uses half-points
              font: 'Arial',
            }),
          ],
          alignment: AlignmentType.LEFT,
          spacing: { after: filteredBullets.length > 0 ? DOCX_SPACING.shiftEnter : 0 },
        })
      );
    }

    // Process bullets array (excluding TITLE marker)
    let currentBulletType: 'main' | 'sub' | 'subSub' = 'main';
    let currentProjectName: string | null = null;
    
    filteredBullets.forEach((bulletText, bulletIndex) => {
      // Check if this is a PROJECT marker
      if (bulletText.startsWith('PROJECT:')) {
        currentProjectName = bulletText.substring(8);
        currentBulletType = 'sub';
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `•   ${currentProjectName}`,
                size: FONT_SIZES.normal * 2,
                font: 'Arial',
              }),
            ],
            alignment: AlignmentType.LEFT,
            indent: { left: INDENTS.docxSubBullet },
            spacing: { after: DOCX_SPACING.bulletAfter },
          })
        );
        currentBulletType = 'subSub';
        return;
      }
      
      // Check if this is a PROJECT_END marker
      if (bulletText === 'PROJECT_END') {
        currentBulletType = 'main';
        return; // Skip rendering PROJECT_END marker
      }
      
      // Regular bullet
      const highlightedSegments = parseBoldMarkdown(bulletText);
      
      const isLastBullet = bulletIndex === bullets.length - 1;
      const isLastExperience = expIndex === numExperiences - 1;
      const spacingAfter = isLastBullet && isLastExperience 
        ? 0 
        : isLastBullet 
          ? DOCX_SPACING.experienceBetween 
          : DOCX_SPACING.bulletAfter;
      
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: '•   ',
              size: FONT_SIZES.normal * 2,
              font: 'Arial',
            }),
            ...highlightedSegments.map(segment =>
              new TextRun({
                text: segment.text,
                bold: segment.bold,
                size: FONT_SIZES.normal * 2,
                font: 'Arial',
              })
            ),
          ],
          alignment: AlignmentType.LEFT,
          indent: { 
            left: currentBulletType === 'subSub' 
              ? INDENTS.docxSubSubBullet 
              : INDENTS.docxBullet 
          },
          spacing: { after: spacingAfter },
        })
      );
    });
  }

  return paragraphs;
}

export function renderExperiencePreview(config: ExperienceConfig): JSX.Element {
  return (
    <>
      {/* Experience - Left-aligned, 12pt, Bold, Bottom Border */}
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
        Experience
      </div>
      
      {/* Experience Content */}
      <div style={{ fontSize: '10pt', marginLeft: '0' }}>
        {(() => {
          // Split dynamic array by 'EXPERIENCE_END' markers
          const experienceBullets: string[][] = [];
          let currentBullets: string[] = [];
          
          config.experience_dynamic.forEach((bullet) => {
            if (bullet === 'EXPERIENCE_END') {
              experienceBullets.push(currentBullets);
              currentBullets = [];
            } else {
              currentBullets.push(bullet);
            }
          });
          if (currentBullets.length > 0) {
            experienceBullets.push(currentBullets);
          }
          
          return experienceBullets.map((bullets, expIndex) => {
            const {
              title: jobTitle,
              company,
              location,
              timeline: dateRange,
              content: filteredBullets,
            } = parseExperienceGroup(bullets, config.experience_static, expIndex);
            
            let inProject = false;
            
            return (
              <div key={expIndex} style={{ marginTop: expIndex > 0 ? '6pt' : '0' }}>
                {/* Job Title - Bold, Uppercase */}
                <div style={{ fontWeight: 'bold', marginBottom: '3pt' }}>
                  {jobTitle.toUpperCase()}
                </div>
                
                {/* Company Info — underline company name only */}
                <div style={{ marginBottom: filteredBullets.length > 0 || (dateRange && dateRange !== location) ? '2pt' : '0' }}>
                  <span style={{ textDecoration: 'underline' }}>{company}</span>
                  {location ? ` | ${location}` : ''}
                </div>
                
                {/* Date Range (only if set and not already shown via location) */}
                {dateRange && dateRange !== location ? (
                  <div style={{ marginBottom: filteredBullets.length > 0 ? '2pt' : '0pt' }}>
                    {dateRange}
                  </div>
                ) : null}
                
                {/* Bullets */}
                {filteredBullets.map((bulletText, bulletIndex) => {
                  if (bulletText.startsWith('PROJECT:')) {
                    const projectName = bulletText.substring(8);
                    inProject = true;
                    return (
                      <div key={bulletIndex} style={{ marginLeft: '0.5in', marginBottom: '3pt' }}>
                        •   {projectName}
                      </div>
                    );
                  }
                  
                  // Check if this is a PROJECT_END marker
                  if (bulletText === 'PROJECT_END') {
                    inProject = false;
                    return null; // Don't render PROJECT_END marker
                  }
                  
                  const currentBulletType = inProject ? 'subSub' : 'main';
      const highlightedSegments = parseBoldMarkdown(bulletText);
                  
                  const isLastBullet = bulletIndex === filteredBullets.length - 1;
                  const marginBottom = isLastBullet ? '0pt' : '3pt';
                  
                  return (
                    <div 
                      key={bulletIndex} 
                      style={{ 
                        marginLeft: currentBulletType === 'subSub' ? '0.75in' : '0.25in', 
                        marginBottom,
                        textAlign: 'left',
                      }}
                    >
                      •   {highlightedSegments.map((segment, segIdx) => 
                        segment.bold ? (
                          <strong key={segIdx}>{segment.text}</strong>
                        ) : (
                          <span key={segIdx}>{segment.text}</span>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            );
          });
        })()}
      </div>
    </>
  );
}

