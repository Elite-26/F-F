import type { CSSProperties } from 'react';
import {
  buildEducationItems,
  buildExperienceItems,
  parseContact,
} from '@/lib/resume/template2-model';
import { parseBoldMarkdown } from '@/lib/resume/rich-text';

function RichText({ text }: { text: string }) {
  return (
    <>
      {parseBoldMarkdown(text || '').map((segment, index) =>
        segment.bold ? <strong key={index}>{segment.text}</strong> : <span key={index}>{segment.text}</span>
      )}
    </>
  );
}

interface Template3PreviewProps {
  fullName: string;
  contact: string;
  summary: string;
  skills: string[];
  experienceStatic: string[];
  experienceDynamic: string[];
  education: string[][];
  certifications: string[];
}

const fontFamily = 'Arial, Helvetica, sans-serif';
const teal = '#31849B';
const orange = '#E36C0A';
const band = '#DAEEF3';

function SectionHeading({ title }: { title: string }) {
  return (
    <h2
      style={{
        margin: '10px 0 6px',
        padding: '2px 0',
        fontSize: '12pt',
        fontWeight: 700,
        color: orange,
        background: band,
        textAlign: 'center',
        fontFamily,
      }}
    >
      {title}
    </h2>
  );
}

function SplitLine({
  left,
  right,
  leftStyle,
  rightStyle,
}: {
  left: string;
  right: string;
  leftStyle?: CSSProperties;
  rightStyle?: CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', fontFamily }}>
      <span style={leftStyle}>{left}</span>
      <span style={{ textAlign: 'right', ...rightStyle }}>{right}</span>
    </div>
  );
}

function BulletLine({ text, level, glyph }: { text: string; level: number; glyph: string }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        marginLeft: level === 1 ? 18 : level === 2 ? 36 : 0,
        marginBottom: '1px',
        fontSize: '10pt',
        textAlign: 'justify',
      }}
    >
      <span>{glyph}</span>
      <span>
        <RichText text={text} />
      </span>
    </div>
  );
}

export function Template3Preview({
  fullName,
  contact,
  summary,
  skills,
  experienceStatic,
  experienceDynamic,
  education,
  certifications,
}: Template3PreviewProps) {
  const { location, phone, email } = parseContact(contact || '');
  const contactLine = [location, phone, email].filter(Boolean).join(' | ');
  const experiences = buildExperienceItems(experienceStatic || [], experienceDynamic || []);
  const educationItems = buildEducationItems(education || []);
  const skillLines = (skills || []).map((skill) => skill.trim()).filter(Boolean);
  const certificationLines = (certifications || []).map((item) => item.trim()).filter(Boolean);

  return (
    <div style={{ fontFamily, color: '#000', fontSize: '10pt' }}>
      <div
        style={{
          fontSize: '20pt',
          fontWeight: 700,
          color: teal,
          letterSpacing: '2px',
        }}
      >
        {fullName}
      </div>
      {contactLine ? (
        <div style={{ fontSize: '10pt', color: '#404040', marginTop: '2px' }}>{contactLine}</div>
      ) : null}

      <SectionHeading title="Professional Summary" />
      <p style={{ margin: 0, textAlign: 'justify', fontSize: '10pt' }}>
        <RichText text={summary} />
      </p>

      <SectionHeading title="Skills" />
      <div>
        {skillLines.map((skill, index) => (
          <BulletLine key={`${skill}-${index}`} text={skill} level={0} glyph="•" />
        ))}
      </div>

      <SectionHeading title="Experience" />
      {experiences.map((item, index) => (
        <div key={`${item.company}-${index}`} style={{ marginBottom: '4px' }}>
          <SplitLine
            left={item.company}
            right={item.timeline}
            leftStyle={{ fontWeight: 700, fontSize: '11pt', lineHeight: 1.15 }}
            rightStyle={{ fontStyle: 'italic', fontSize: '10pt', lineHeight: 1.15 }}
          />
          <SplitLine
            left={item.title}
            right={item.location}
            leftStyle={{ fontWeight: 700, fontSize: '11pt', color: teal, lineHeight: 1.15 }}
            rightStyle={{ fontStyle: 'italic', fontSize: '10pt', lineHeight: 1.15 }}
          />
          <div style={{ marginTop: '2px' }}>
            {item.lines.map((line, lineIndex) => (
              <BulletLine
                key={`${line.kind}-${lineIndex}`}
                text={line.text}
                level={line.kind === 'project' ? 1 : line.kind === 'projectDetail' ? 2 : 0}
                glyph={line.kind === 'project' ? 'o' : '•'}
              />
            ))}
          </div>
        </div>
      ))}

      <SectionHeading title="Education" />
      {educationItems.map((item, index) => (
        <div key={`${item.school}-${index}`} style={{ marginBottom: '6px' }}>
          <SplitLine
            left={item.school}
            right={item.timeline}
            leftStyle={{ fontWeight: 700, fontSize: '11pt', lineHeight: 1.15 }}
            rightStyle={{ fontSize: '10pt', lineHeight: 1.15 }}
          />
          <SplitLine
            left={item.degree}
            right={item.location}
            leftStyle={{ fontStyle: 'italic', fontSize: '10pt', lineHeight: 1.15 }}
            rightStyle={{ fontStyle: 'italic', fontSize: '10pt', lineHeight: 1.15 }}
          />
        </div>
      ))}

      {certificationLines.length > 0 ? (
        <>
          <SectionHeading title="Certifications" />
          <div>
            {certificationLines.map((item, index) => (
              <BulletLine key={`${item}-${index}`} text={item} level={0} glyph="•" />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
