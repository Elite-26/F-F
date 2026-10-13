import { parseExperienceGroup } from '@/lib/resume/experience-option';

export interface ExperienceLine {
  kind: 'detail' | 'project' | 'projectDetail';
  text: string;
}

export interface ExperienceItem {
  company: string;
  location: string;
  title: string;
  timeline: string;
  lines: ExperienceLine[];
}

export interface EducationItem {
  school: string;
  location: string;
  degree: string;
  timeline: string;
}

export function parseContact(contact: string): { location: string; phone: string; email: string } {
  const emailMatch = contact.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const email = emailMatch?.[0] || '';
  let rest = email ? contact.replace(email, ' ') : contact;
  const phoneMatch = rest.match(/(\+?\(?\d[\d\s().-]{7,}\d\)?)/);
  const phone = phoneMatch?.[1]?.replace(/\s+/g, ' ').trim() || '';
  if (phone) {
    rest = rest.replace(phoneMatch![1], ' ');
  }
  const location = rest
    .replace(/[•·|]/g, ' ')
    .replace(/\(\s*\)/g, ' ')
    .replace(/(^|\s)[()]+(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { location, phone, email };
}

export function buildExperienceItems(
  experienceStatic: string[],
  experienceDynamic: string[]
): ExperienceItem[] {
  const groups: string[][] = [];
  let current: string[] = [];
  experienceDynamic.forEach((entry) => {
    if (entry === 'EXPERIENCE_END') {
      groups.push(current);
      current = [];
    } else {
      current.push(entry);
    }
  });
  if (current.length > 0) {
    groups.push(current);
  }

  const count = Math.max(groups.length, Math.floor(experienceStatic.length / 3));
  const items: ExperienceItem[] = [];
  for (let index = 0; index < count; index += 1) {
    const bullets = groups[index] || [];
    const { title, company, location, timeline, content } = parseExperienceGroup(
      bullets,
      experienceStatic,
      index
    );
    const lines: ExperienceLine[] = [];
    let inProject = false;
    content.forEach((bullet) => {
      if (bullet === 'PROJECT_END') {
        inProject = false;
        return;
      }
      if (bullet.startsWith('PROJECT:')) {
        inProject = true;
        const text = bullet.slice('PROJECT:'.length).trim();
        if (text) {
          lines.push({ kind: 'project', text });
        }
        return;
      }
      const text = bullet.trim();
      if (!text) {
        return;
      }
      lines.push({ kind: inProject ? 'projectDetail' : 'detail', text });
    });

    // Skip static-only shells (company/dates with no tailored title or bullets)
    if (!title && lines.length === 0) {
      continue;
    }
    if (!company && !location && !title && !timeline && lines.length === 0) {
      continue;
    }
    items.push({ company, location, title, timeline, lines });
  }
  return items;
}

export function buildEducationItems(education: string[][]): EducationItem[] {
  return education
    .map((entry) => ({
      school: entry?.[0] || '',
      location: '',
      degree: entry?.[1] || '',
      timeline: entry?.[2] || '',
    }))
    .filter((entry) => entry.school || entry.degree || entry.timeline);
}
