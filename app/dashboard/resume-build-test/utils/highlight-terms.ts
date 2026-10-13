/**
 * Inline bold markers for resume text.
 * Users wrap highlights as **like this** in Summary, Skills, Experience, Certifications, and Cover letter.
 */

export interface HighlightedText {
  text: string;
  bold: boolean;
}

/**
 * Split text on **bold** markers into plain/bold segments.
 * Unmatched markers are left as literal text.
 */
export function parseBoldMarkdown(text: string): HighlightedText[] {
  if (!text) {
    return [{ text: '', bold: false }];
  }

  const result: HighlightedText[] = [];
  const re = /\*\*([\s\S]+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text))) {
    if (match.index > lastIndex) {
      result.push({ text: text.slice(lastIndex, match.index), bold: false });
    }
    if (match[1].length > 0) {
      result.push({ text: match[1], bold: true });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    result.push({ text: text.slice(lastIndex), bold: false });
  }

  return result.length > 0 ? result : [{ text, bold: false }];
}

/** Remove ** markers for plain-text measurement or fallbacks. */
export function stripBoldMarkers(text: string): string {
  return text.replace(/\*\*([\s\S]+?)\*\*/g, '$1');
}

/**
 * @deprecated Use parseBoldMarkdown. Kept so older call sites keep working;
 * the terms list is ignored — bold comes from **markers** in the text.
 */
export function highlightTermsInText(text: string, _terms?: string[]): HighlightedText[] {
  return parseBoldMarkdown(text);
}

/** @deprecated Term lists are no longer used. */
export function parseHighlightTerms(_content: string): string[] {
  return [];
}
