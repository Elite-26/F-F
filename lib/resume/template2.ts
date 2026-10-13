import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import jsPDF from 'jspdf';
import {
  buildEducationItems,
  buildExperienceItems,
  EducationItem,
  ExperienceItem,
  parseContact,
} from './template2-model';
import { applyInlineBoldMarkers, drawRichParagraph } from './rich-text';

export { buildEducationItems, buildExperienceItems, parseContact };

export interface Template2Input {
  exportDir: string;
  fullName: string;
  contact: string;
  summary: string;
  skills: string[];
  experienceStatic: string[];
  experienceDynamic: string[];
  education: string[][];
  certifications: string[];
}

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 43.2;
const ORANGE: [number, number, number] = [227, 108, 10];
const BLUE: [number, number, number] = [84, 141, 212];
const MAROON: [number, number, number] = [148, 54, 52];
const GRAY: [number, number, number] = [128, 128, 128];
const INK: [number, number, number] = [0, 0, 0];
const TEMPLATE_FILE = 'Template 2.docx';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function runText(run: string): string {
  const texts: string[] = [];
  const textRe = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
  let match: RegExpExecArray | null;
  while ((match = textRe.exec(run))) {
    texts.push(decodeXml(match[1]));
  }
  return texts.join('');
}

function runRPrKey(run: string): string {
  const found = run.match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
  return found ? found[0].replace(/\s+/g, '') : '';
}

function paragraphPlainText(paragraph: string): string {
  const texts: string[] = [];
  const textRe = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
  let match: RegExpExecArray | null;
  while ((match = textRe.exec(paragraph))) {
    texts.push(decodeXml(match[1]));
  }
  return texts.join('');
}

/** Join only adjacent runs that share formatting, so split tokens stay styled and tabs stay in place. */
function collapsePlaceholderParagraphs(xml: string): string {
  return xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (paragraph) => {
    if (!paragraph.includes('{')) {
      return paragraph;
    }
    const matches = [...paragraph.matchAll(/<w:r\b[^>]*>[\s\S]*?<\/w:r>/g)];
    if (matches.length === 0) {
      return paragraph;
    }

    const rebuilt: string[] = [];
    let index = 0;
    while (index < matches.length) {
      const run = matches[index][0];
      if (!/<w:t[\s>]/.test(run)) {
        rebuilt.push(run);
        index += 1;
        continue;
      }
      const key = runRPrKey(run);
      let joined = runText(run);
      let end = index + 1;
      while (end < matches.length) {
        const next = matches[end][0];
        if (!/<w:t[\s>]/.test(next) || runRPrKey(next) !== key) {
          break;
        }
        joined += runText(next);
        end += 1;
      }
      if (end === index + 1) {
        rebuilt.push(run);
      } else {
        const rPr = (run.match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [''])[0];
        rebuilt.push(`<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(joined)}</w:t></w:r>`);
      }
      index = end;
    }

    const start = matches[0].index ?? 0;
    const last = matches[matches.length - 1];
    const end = (last.index ?? 0) + last[0].length;
    return paragraph.slice(0, start) + rebuilt.join('') + paragraph.slice(end);
  });
}

function removeEmptyParagraphs(xml: string): string {
  return xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (paragraph) => {
    return paragraphPlainText(paragraph).trim() ? paragraph : '';
  });
}

function tokenRegExp(token: string, flags = 'i'): RegExp {
  return new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
}

function indexOfToken(xml: string, token: string, from = 0): number {
  const match = tokenRegExp(token).exec(xml.slice(from));
  return match ? from + match.index : -1;
}

function actualToken(xml: string, token: string): string {
  return xml.match(tokenRegExp(token))?.[0] || token;
}

function replaceToken(xml: string, token: string, value: string): string {
  const escaped = escapeXml(value);
  return xml.replace(tokenRegExp(token, 'gi'), () => escaped);
}

function paragraphStartIndex(xml: string, fromIndex: number): number {
  const before = xml.slice(0, fromIndex);
  return Math.max(before.lastIndexOf('<w:p '), before.lastIndexOf('<w:p>'));
}

function expandList(block: string, token: string, lines: string[]): string {
  const tokenIndex = indexOfToken(block, token);
  if (tokenIndex === -1) {
    return block;
  }
  const paragraphStart = paragraphStartIndex(block, tokenIndex);
  const paragraphEnd = block.indexOf('</w:p>', tokenIndex);
  if (paragraphStart === -1 || paragraphEnd === -1) {
    return block;
  }
  const end = paragraphEnd + '</w:p>'.length;
  const paragraph = block.slice(paragraphStart, end);
  const found = actualToken(paragraph, token);
  const rendered = lines
    .map((line) => paragraph.split(found).join(escapeXml(line)))
    .join('');
  return block.slice(0, paragraphStart) + rendered + block.slice(end);
}

function expandLoop(
  xml: string,
  openToken: string,
  closeToken: string,
  items: string[],
  fill: (block: string, itemXml: string, index: number) => string
): string {
  const openIndex = indexOfToken(xml, openToken);
  const closeIndex = indexOfToken(xml, closeToken);
  if (openIndex === -1 || closeIndex === -1 || closeIndex < openIndex) {
    return xml;
  }
  const openParagraphStart = paragraphStartIndex(xml, openIndex);
  const openParagraphEnd = xml.indexOf('</w:p>', openIndex) + '</w:p>'.length;
  const closeParagraphStart = paragraphStartIndex(xml, closeIndex);
  const closeParagraphEnd = xml.indexOf('</w:p>', closeIndex) + '</w:p>'.length;
  if (openParagraphStart === -1 || closeParagraphStart === -1) {
    return xml;
  }
  const inner = xml.slice(openParagraphEnd, closeParagraphStart);
  const rendered = items.map((item, index) => fill(inner, item, index)).join('');
  return xml.slice(0, openParagraphStart) + rendered + xml.slice(closeParagraphEnd);
}

function paragraphByToken(block: string, token: string): string {
  const tokenIndex = indexOfToken(block, token);
  if (tokenIndex === -1) {
    return '';
  }
  const start = paragraphStartIndex(block, tokenIndex);
  const end = block.indexOf('</w:p>', tokenIndex) + '</w:p>'.length;
  if (start === -1 || end <= start) {
    return '';
  }
  return block.slice(start, end);
}

function fillExperienceBlock(block: string, item: ExperienceItem): string {
  const detailParagraph = paragraphByToken(block, '{{@DETAILS}}');
  const projectParagraph = paragraphByToken(block, '{{@PROJECT}}') || detailParagraph;
  const projectDetailParagraph = paragraphByToken(block, '{{@PROJECT_DETAILS}}') || detailParagraph;
  const bulletIndexes = ['{{@DETAILS}}', '{{@PROJECT}}', '{{@PROJECT_DETAILS}}']
    .map((token) => indexOfToken(block, token))
    .filter((index) => index !== -1);
  const firstBullet = bulletIndexes.length > 0 ? Math.min(...bulletIndexes) : -1;
  const companyEnd = firstBullet === -1 ? block.length : paragraphStartIndex(block, firstBullet);
  const companySource = companyEnd === -1 ? block : block.slice(0, companyEnd);
  let companyBlock = (companySource.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g) || [])
    .filter((paragraph) => /\{\{(COMPANY_NAME|TIMELINE|TITLE|COMPANY_LOCATION)\}\}/i.test(paragraphPlainText(paragraph)))
    .join('');
  companyBlock = replaceToken(companyBlock, '{{COMPANY_NAME}}', item.company);
  companyBlock = replaceToken(companyBlock, '{{COMPANY_LOCATION}}', item.location);
  companyBlock = replaceToken(companyBlock, '{{TITLE}}', item.title);
  companyBlock = replaceToken(companyBlock, '{{TIMELINE}}', item.timeline);

  const detailToken = actualToken(detailParagraph, '{{@DETAILS}}');
  const projectToken = actualToken(projectParagraph, '{{@PROJECT}}');
  const projectDetailToken = actualToken(projectDetailParagraph, '{{@PROJECT_DETAILS}}');
  const bullets = item.lines.map((line) => {
    if (line.kind === 'project') {
      return projectParagraph.split(projectToken).join(escapeXml(line.text));
    }
    if (line.kind === 'projectDetail') {
      return projectDetailParagraph.split(projectDetailToken).join(escapeXml(line.text));
    }
    return detailParagraph.split(detailToken).join(escapeXml(line.text));
  }).join('');

  return companyBlock + bullets;
}

function expandCertifications(xml: string, bulletParagraph: string, items: string[]): string {
  const openToken = '{{#CERTIFICATION_ITEMS}}';
  const closeToken = '{{/CERTIFICATION_ITEMS}}';
  const openIndex = xml.indexOf(openToken);
  if (openIndex === -1) {
    return xml;
  }

  const openStart = paragraphStartIndex(xml, openIndex);
  const openEnd = xml.indexOf('</w:p>', openIndex) + '</w:p>'.length;
  const closeIndex = xml.indexOf(closeToken);
  const closeStart = closeIndex === -1 ? -1 : paragraphStartIndex(xml, closeIndex);
  const closeEnd = closeIndex === -1 ? -1 : xml.indexOf('</w:p>', closeIndex) + '</w:p>'.length;

  if (items.length === 0) {
    let removeStart = openStart;
    const before = xml.slice(0, openStart);
    const headingStart = Math.max(before.lastIndexOf('<w:p '), before.lastIndexOf('<w:p>'));
    if (headingStart !== -1 && /CERTI/i.test(before.slice(headingStart))) {
      removeStart = headingStart;
    }
    const removeEnd = closeEnd === -1 ? openEnd : closeEnd;
    return xml.slice(0, removeStart) + xml.slice(removeEnd);
  }

  const skillToken = actualToken(bulletParagraph, '{{@SKILLS}}');
  const rendered = items
    .map((item) => bulletParagraph.split(skillToken).join(escapeXml(item)))
    .join('');
  const after = closeEnd === -1 || closeStart < openEnd ? openEnd : closeEnd;
  return xml.slice(0, openStart) + rendered + xml.slice(after);
}

function fillTemplateXml(xml: string, input: Template2Input): string {
  const { location, phone, email } = parseContact(input.contact || '');
  const experiences = buildExperienceItems(input.experienceStatic || [], input.experienceDynamic || []);
  const education = buildEducationItems(input.education || []);
  const skills = (input.skills || []).map((skill) => skill.trim()).filter(Boolean);
  const certifications = (input.certifications || []).map((item) => item.trim()).filter(Boolean);
  const summary = (input.summary || '').replace(/\s+/g, ' ').trim();

  let next = removeEmptyParagraphs(collapsePlaceholderParagraphs(xml));
  next = replaceToken(next, '{{FULL_NAME}}', input.fullName || '');
  next = replaceToken(next, '{{LOCATION}}', location);
  next = replaceToken(next, '{{PHONE}}', phone);
  next = replaceToken(next, '{{EMAIL}}', email);
  next = replaceToken(next, '{{@SUMMARY}}', summary);
  const skillBullet = paragraphByToken(next, '{{@SKILLS}}');
  next = expandList(next, '{{@SKILLS}}', skills);

  const experienceXml = experiences.map((item) => JSON.stringify(item));
  next = expandLoop(next, '{{#EXPERIENCE_ITEMS}}', '{{/EXPERIENCE_ITEMS}}', experienceXml, (block, itemJson) => {
    const item = JSON.parse(itemJson) as ExperienceItem;
    return fillExperienceBlock(block, item);
  });

  const educationXml = education.map((item) => JSON.stringify(item));
  next = expandLoop(next, '{{#EDUCATION_ITEMS}}', '{{/EDUCATION_ITEMS}}', educationXml, (block, itemJson) => {
    const item = JSON.parse(itemJson) as EducationItem;
    let filled = block;
    filled = replaceToken(filled, '{{SCHOOL}}', item.school);
    filled = replaceToken(filled, '{{EDUCATION_LOCATION}}', item.location);
    filled = replaceToken(filled, '{{DEGREE}}', item.degree);
    filled = replaceToken(filled, '{{TIMELINE}}', item.timeline);
    return filled;
  });

  next = expandCertifications(next, skillBullet, certifications);
  if (indexOfToken(next, '{{@CERTIFICATIONS}}') !== -1) {
    next = expandList(next, '{{@CERTIFICATIONS}}', certifications);
  } else {
    next = expandList(next, '{{@CERTIFICATION}}', certifications);
  }
  if (certifications.length === 0) {
    next = removeExactTextParagraph(next, 'Certifications');
  }
  next = next.replaceAll('CERTICATIONS', 'CERTIFICATIONS');
  next = removeEmptyParagraphs(next);
  next = applyInlineBoldMarkers(next);

  return next;
}

function removeExactTextParagraph(xml: string, text: string): string {
  return xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (paragraph) => {
    return paragraphPlainText(paragraph).trim() === text ? '' : paragraph;
  });
}

export async function writeTemplateDocx(
  templateFileName: string,
  input: Template2Input,
  outputPath: string
): Promise<void> {
  const templatePath = path.join(process.cwd(), 'templates', 'resume', templateFileName);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`${templateFileName} was not found`);
  }

  const zip = await JSZip.loadAsync(fs.readFileSync(templatePath));
  const documentFile = zip.file('word/document.xml');
  if (!documentFile) {
    throw new Error(`${templateFileName} is missing word/document.xml`);
  }

  const documentXml = await documentFile.async('string');
  const filled = fillTemplateXml(documentXml, input);
  if (filled.includes('{{')) {
    throw new Error(`${templateFileName} still contains unfilled placeholders`);
  }

  zip.file('word/document.xml', filled);
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(outputPath, buffer);
}

function registerBodyFont(pdf: jsPDF): string {
  const families = [
    {
      name: 'Arial',
      files: {
        normal: 'C:/Windows/Fonts/arial.ttf',
        bold: 'C:/Windows/Fonts/arialbd.ttf',
        italic: 'C:/Windows/Fonts/ariali.ttf',
        bolditalic: 'C:/Windows/Fonts/arialbi.ttf',
      },
    },
    {
      name: 'Georgia',
      files: {
        normal: 'C:/Windows/Fonts/georgia.ttf',
        bold: 'C:/Windows/Fonts/georgiab.ttf',
        italic: 'C:/Windows/Fonts/georgiai.ttf',
        bolditalic: 'C:/Windows/Fonts/georgiaz.ttf',
      },
    },
  ];
  const spec = families.find((family) => fs.existsSync(family.files.normal));
  if (!spec) {
    return 'times';
  }
  Object.entries(spec.files).forEach(([style, filePath]) => {
    if (!fs.existsSync(filePath)) {
      return;
    }
    const vfsName = `${spec.name}-${style}.ttf`;
    pdf.addFileToVFS(vfsName, fs.readFileSync(filePath).toString('base64'));
    pdf.addFont(vfsName, spec.name, style);
  });
  return spec.name;
}

function writeTemplate2Pdf(input: Template2Input, outputPath: string): void {
  const { location, phone, email } = parseContact(input.contact || '');
  const experiences = buildExperienceItems(input.experienceStatic || [], input.experienceDynamic || []);
  const education = buildEducationItems(input.education || []);
  const skills = (input.skills || []).map((skill) => skill.trim()).filter(Boolean);
  const certifications = (input.certifications || []).map((item) => item.trim()).filter(Boolean);
  const summary = (input.summary || '').replace(/\s+/g, ' ').trim();

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const font = registerBodyFont(pdf);
  const contentWidth = PAGE_W - MARGIN * 2;
  let y = MARGIN + 14;

  const newPage = () => {
    pdf.addPage();
    y = MARGIN + 12;
  };

  const ensure = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN) {
      newPage();
    }
  };

  const drawBody = (text: string, x: number, width: number) => {
    const yRef = { y };
    drawRichParagraph(pdf, text, x, yRef, width, {
      font,
      fontSize: 10,
      color: INK,
      lineHeight: 13,
      ensure,
    });
    y = yRef.y;
  };

  const drawSection = (title: string) => {
    ensure(28);
    y += 10;
    pdf.setFont(font, 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(...BLUE);
    pdf.text(title, MARGIN, y);
    y += 3;
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 14;
  };

  const drawPair = (
    leftText: string,
    rightText: string,
    leftWeight: 'bold' | 'normal' | 'italic',
    leftSize: number,
    leftColor: [number, number, number],
    rightWeight: 'bold' | 'normal' | 'italic',
    rightSize: number,
    rightColor: [number, number, number]
  ) => {
    pdf.setFont(font, rightWeight);
    pdf.setFontSize(rightSize);
    const rightWidth = rightText ? pdf.getTextWidth(rightText) : 0;
    const leftMax = Math.max(contentWidth - rightWidth - 12, 180);
    pdf.setFont(font, leftWeight);
    pdf.setFontSize(leftSize);
    const lines: string[] = pdf.splitTextToSize(leftText || '', leftMax);
    const lineHeight = leftSize + 3;
    if (lines.length === 0 && rightText) {
      ensure(lineHeight);
      pdf.setFont(font, rightWeight);
      pdf.setFontSize(rightSize);
      pdf.setTextColor(...rightColor);
      pdf.text(rightText, PAGE_W - MARGIN, y, { align: 'right' });
      y += lineHeight;
      return;
    }
    lines.forEach((line, index) => {
      ensure(lineHeight);
      pdf.setFont(font, leftWeight);
      pdf.setFontSize(leftSize);
      pdf.setTextColor(...leftColor);
      pdf.text(line, MARGIN, y);
      if (index === 0 && rightText) {
        pdf.setFont(font, rightWeight);
        pdf.setFontSize(rightSize);
        pdf.setTextColor(...rightColor);
        pdf.text(rightText, PAGE_W - MARGIN, y, { align: 'right' });
      }
      y += lineHeight;
    });
  };

  const drawBullet = (text: string, level: number, glyph: string) => {
    const bulletX = MARGIN + [2, 16, 32][level];
    const textX = MARGIN + [14, 30, 46][level];
    const textWidth = PAGE_W - MARGIN - textX;
    ensure(13);
    pdf.setFont(font, 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(...INK);
    pdf.text(glyph, bulletX, y);
    drawBody(text, textX, textWidth);
  };

  pdf.setFont(font, 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(...ORANGE);
  pdf.setCharSpace(2);
  const nameLines: string[] = pdf.splitTextToSize(input.fullName || '', contentWidth);
  nameLines.forEach((line) => {
    pdf.text(line, PAGE_W / 2, y, { align: 'center' });
    y += 22;
  });
  pdf.setCharSpace(0);

  const contactLine = [location, phone, email].filter(Boolean).join(' | ');
  if (contactLine) {
    pdf.setFont(font, 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(...GRAY);
    const contactLines: string[] = pdf.splitTextToSize(contactLine, contentWidth);
    contactLines.forEach((line) => {
      pdf.text(line, PAGE_W / 2, y, { align: 'center' });
      y += 13;
    });
  }

  drawSection('Professional Summary');
  if (summary) {
    drawBody(summary, MARGIN, contentWidth);
  }

  drawSection('Skills');
  skills.forEach((skill) => drawBullet(skill, 0, '•'));

  drawSection('Professional Experience');
  experiences.forEach((item, expIndex) => {
    y += expIndex === 0 ? 0 : 2;
    drawPair(item.company, item.timeline, 'bold', 12, INK, 'bold', 10, MAROON);
    drawPair(item.title, item.location, 'bold', 11, MAROON, 'italic', 10, INK);
    item.lines.forEach((entry) => {
      if (entry.kind === 'project') {
        drawBullet(entry.text, 1, 'o');
      } else if (entry.kind === 'projectDetail') {
        drawBullet(entry.text, 2, '•');
      } else {
        drawBullet(entry.text, 0, '•');
      }
    });
  });

  drawSection('Education');
  education.forEach((item) => {
    drawPair(item.school, item.timeline, 'bold', 11, INK, 'normal', 10, INK);
    drawPair(item.degree, item.location, 'italic', 10, INK, 'italic', 10, INK);
    y += 4;
  });

  if (certifications.length > 0) {
    drawSection('Certifications');
    certifications.forEach((certification) => drawBullet(certification, 0, '•'));
  }

  const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
  fs.writeFileSync(outputPath, pdfBuffer);
}

export async function writeTemplate2Resume(input: Template2Input): Promise<void> {
  if (!fs.existsSync(input.exportDir)) {
    fs.mkdirSync(input.exportDir, { recursive: true });
  }
  const docxPath = path.join(input.exportDir, 'Resume.docx');
  const pdfPath = path.join(input.exportDir, 'Resume.pdf');
  await writeTemplateDocx(TEMPLATE_FILE, input, docxPath);
  writeTemplate2Pdf(input, pdfPath);
}
