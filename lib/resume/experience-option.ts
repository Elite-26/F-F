export const EXPERIENCE_OPTIONS = ['option_1', 'option_2'] as const;

export type ExperienceOption = (typeof EXPERIENCE_OPTIONS)[number];

export function normalizeExperienceOption(value: unknown): ExperienceOption {
  if (typeof value === 'string' && (EXPERIENCE_OPTIONS as readonly string[]).includes(value)) {
    return value as ExperienceOption;
  }
  return 'option_1';
}

const META_LINE_RE = /^(title|company|location)\s*:\s*(.*)$/i;

export function isExperienceMetaLine(line: string): boolean {
  return META_LINE_RE.test(line.trim());
}

export function getLabeledValue(lines: string[], label: 'title' | 'company' | 'location'): string | undefined {
  const re = new RegExp(`^${label}\\s*:\\s*(.*)$`, 'i');
  for (const line of lines) {
    const match = line.trim().match(re);
    if (match) {
      return match[1].trim();
    }
  }
  return undefined;
}

/**
 * Title of the most recent experience (first job in the tailored block).
 * Ignores later TITLE: lines so a second role cannot overwrite the header.
 */
export function extractExperienceTitle(lines: string[] | undefined | null): string {
  if (!lines?.length) {
    return '';
  }
  // Most recent = first EXPERIENCE_END chunk (or the whole block if none)
  const chunk = splitExperienceChunks(lines)[0] || [];
  if (!chunk.length) {
    return '';
  }

  const first = chunk[0].trim();
  const titleOnFirst = first.match(/^title\s*:\s*(.*)$/i);
  if (titleOnFirst) {
    return titleOnFirst[1].trim();
  }
  if (/^(company|location)\s*:/i.test(first)) {
    return getLabeledValue(chunk, 'title') ?? '';
  }
  // Bare first line is the job title — do not scan later TITLE: labels
  return first;
}

function normalizeMetaLine(line: string): string {
  const match = line.trim().match(META_LINE_RE);
  if (!match) {
    return line;
  }
  return `${match[1].toUpperCase()}:${match[2].trim()}`;
}

/** Split one tailored field into jobs when the user pastes EXPERIENCE_END between them. */
function splitExperienceChunks(lines: string[]): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  lines.forEach((line) => {
    if (line.trim() === 'EXPERIENCE_END') {
      if (current.length > 0) {
        chunks.push(current);
        current = [];
      }
      return;
    }
    current.push(line);
  });
  if (current.length > 0) {
    chunks.push(current);
  }
  return chunks;
}

function appendExperienceGroup(
  out: string[],
  lines: string[],
  option: ExperienceOption
): void {
  if (!lines.length) {
    return;
  }

  if (option === 'option_2') {
    const normalized = lines.map(normalizeMetaLine);
    const hasTitle = normalized.some((line) => line.startsWith('TITLE:'));
    if (
      !hasTitle &&
      normalized[0] &&
      !normalized[0].startsWith('COMPANY:') &&
      !normalized[0].startsWith('LOCATION:')
    ) {
      normalized[0] = `TITLE:${normalized[0]}`;
    }
    out.push(...normalized);
  } else {
    // Option 1: company/location stay in Options; only title + bullets are tailored.
    const hasTitleLabel = lines.some((line) => /^title\s*:/i.test(line.trim()));
    const title = extractExperienceTitle(lines);
    out.push(`TITLE:${title}`);
    const body = hasTitleLabel ? lines : lines.slice(1);
    body.forEach((line) => {
      if (isExperienceMetaLine(line)) {
        return;
      }
      if (line.trim() === 'EXPERIENCE_END') {
        return;
      }
      out.push(line);
    });
  }

  out.push('EXPERIENCE_END');
}

/** Convert tailored_result2/3 arrays into experience_dynamic for resume templates. */
export function buildExperienceDynamicFromTailored(
  result2: string[] | undefined | null,
  result3: string[] | undefined | null,
  option: ExperienceOption = 'option_1'
): string[] {
  const out: string[] = [];
  const appendAll = (result: string[] | undefined | null) => {
    if (!result?.length) {
      return;
    }
    splitExperienceChunks(result).forEach((chunk) => {
      appendExperienceGroup(out, chunk, option);
    });
  };
  appendAll(result2);
  appendAll(result3);
  return out;
}

export interface ParsedExperienceGroup {
  title: string;
  company: string;
  location: string;
  timeline: string;
  content: string[];
}

/** Resolve company/location/title from a dynamic group; timeline always from Options static. */
export function parseExperienceGroup(
  bullets: string[],
  experienceStatic: string[],
  index: number
): ParsedExperienceGroup {
  const title = getLabeledValue(bullets, 'title') ?? '';
  const companyFromDynamic = getLabeledValue(bullets, 'company');
  const locationFromDynamic = getLabeledValue(bullets, 'location');
  const company = (companyFromDynamic !== undefined && companyFromDynamic !== ''
    ? companyFromDynamic
    : experienceStatic[index * 3] || '') || '';
  const location = (locationFromDynamic !== undefined && locationFromDynamic !== ''
    ? locationFromDynamic
    : experienceStatic[index * 3 + 1] || '') || '';
  const timeline = experienceStatic[index * 3 + 2] || '';
  const content = bullets.filter((bullet) => !isExperienceMetaLine(bullet));
  return { title, company, location, timeline, content };
}

export const EXPERIENCE_PLACEHOLDER_OPTION_1 =
  'Staff AI Engineer\nDelivered platform work spanning **LLMs**, **RAG**, and **Python**.\nPROJECT: Example Platform\n• Built services on **AWS**\nPROJECT_END\n• Mentored engineers across squads';

export const EXPERIENCE_PLACEHOLDER_OPTION_2 =
  'TITLE: AI Architect\nCompany: PowerSchool\nLocation: Folsom, CA\nDelivered enterprise AI architecture for K12 products...\nPROJECT: Enterprise AI Architecture & MLOps Platform\n• Architected **Python** NLP services on **AWS SageMaker**...';
