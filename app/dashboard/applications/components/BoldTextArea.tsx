'use client';

import { useRef } from 'react';

interface BoldTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  readOnly?: boolean;
  className?: string;
  placeholder?: string;
}

/** Wrap the current selection (or insert markers) with ** for resume highlights. */
export function wrapBoldSelection(
  value: string,
  start: number,
  end: number
): { next: string; selectionStart: number; selectionEnd: number } {
  if (start !== end) {
    const selected = value.slice(start, end);
    const next = `${value.slice(0, start)}**${selected}**${value.slice(end)}`;
    return {
      next,
      selectionStart: start + 2,
      selectionEnd: end + 2,
    };
  }
  const insert = '****';
  const next = `${value.slice(0, start)}${insert}${value.slice(end)}`;
  return {
    next,
    selectionStart: start + 2,
    selectionEnd: start + 2,
  };
}

/**
 * Convert pasted HTML (e.g. from Claude) into plain text with **bold** markers.
 * Falls back to plain text when HTML has no bold tags.
 */
export function htmlToBoldMarkdown(html: string): string {
  if (typeof window === 'undefined' || !html.trim()) {
    return '';
  }

  const template = document.createElement('template');
  template.innerHTML = html.trim();

  const walk = (node: Node, bold = false): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (!text) {
        return '';
      }
      return bold ? `**${text}**` : text;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === 'br') {
      return '\n';
    }

    const isBold = bold || tag === 'strong' || tag === 'b';
    let out = '';
    el.childNodes.forEach((child) => {
      out += walk(child, isBold);
    });

    if (tag === 'li') {
      const line = out.replace(/^\n+|\n+$/g, '');
      return `${line}\n`;
    }

    if (tag === 'p' || tag === 'div' || tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'tr') {
      return `${out.replace(/^\n+|\n+$/g, '')}\n`;
    }

    if (tag === 'ul' || tag === 'ol') {
      return `${out}\n`;
    }

    return out;
  };

  let result = '';
  template.content.childNodes.forEach((child) => {
    result += walk(child, false);
  });

  return result
    .replace(/\*\*\s*\*\*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/^\s*[•·●▪◦\-\*]\s+/, '').trimEnd())
    .join('\n')
    .trim();
}

function clipboardHasBoldHtml(html: string): boolean {
  return /<(strong|b)\b/i.test(html);
}

export function BoldTextArea({
  value,
  onChange,
  rows = 4,
  readOnly = false,
  className = '',
  placeholder,
}: BoldTextAreaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const applyBold = () => {
    if (readOnly || !ref.current) {
      return;
    }
    const start = ref.current.selectionStart;
    const end = ref.current.selectionEnd;
    const { next, selectionStart, selectionEnd } = wrapBoldSelection(value, start, end);
    onChange(next);
    requestAnimationFrame(() => {
      if (!ref.current) {
        return;
      }
      ref.current.focus();
      ref.current.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (readOnly || !ref.current) {
      return;
    }

    const html = event.clipboardData.getData('text/html');
    if (!html || !clipboardHasBoldHtml(html)) {
      return;
    }

    event.preventDefault();
    const converted = htmlToBoldMarkdown(html);
    const start = ref.current.selectionStart;
    const end = ref.current.selectionEnd;
    const next = `${value.slice(0, start)}${converted}${value.slice(end)}`;
    onChange(next);
    const caret = start + converted.length;
    requestAnimationFrame(() => {
      if (!ref.current) {
        return;
      }
      ref.current.focus();
      ref.current.setSelectionRange(caret, caret);
    });
  };

  return (
    <div className="space-y-1">
      {!readOnly ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-gray-500">
            Paste from Claude keeps bold. Or select text and click Bold.
          </p>
          <button
            type="button"
            onClick={applyBold}
            className="px-2 py-0.5 text-xs font-semibold border border-gray-300 rounded hover:bg-gray-50"
            title="Bold selection"
          >
            Bold
          </button>
        </div>
      ) : null}
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={handlePaste}
        rows={rows}
        readOnly={readOnly}
        className={className}
        placeholder={placeholder}
      />
    </div>
  );
}
