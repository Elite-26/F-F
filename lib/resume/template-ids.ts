export const RESUME_TEMPLATES = ['template_1', 'template_2', 'template_3'] as const;

export type ResumeTemplateId = (typeof RESUME_TEMPLATES)[number];

const REPLACED_TEMPLATES = new Set(['template_4', 'template_5', 'template_6']);

export function normalizeResumeTemplate(value: unknown): ResumeTemplateId {
  if (value === 'template_3') {
    return 'template_3';
  }
  if (value === 'template_2' || REPLACED_TEMPLATES.has(String(value))) {
    return 'template_2';
  }
  if (typeof value === 'string' && (RESUME_TEMPLATES as readonly string[]).includes(value)) {
    return value as ResumeTemplateId;
  }
  return 'template_1';
}
