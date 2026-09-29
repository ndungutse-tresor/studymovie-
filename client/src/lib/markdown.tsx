import { Fragment, type ReactNode } from 'react';

/**
 * A deliberately small markdown subset for lesson content: headings, paragraphs,
 * bullet and ordered lists, fenced code, pipe tables, inline code and bold.
 *
 * Everything is produced as React elements, so no lesson text is ever passed
 * through `dangerouslySetInnerHTML`.
 */

export function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Split on inline code first so bold markers inside code are left alone.
  const segments = text.split(/(`[^`]+`)/g);

  segments.forEach((segment, segmentIndex) => {
    if (segment.startsWith('`') && segment.endsWith('`') && segment.length > 2) {
      nodes.push(<code key={`${keyPrefix}-c${segmentIndex}`}>{segment.slice(1, -1)}</code>);
      return;
    }

    segment.split(/(\*\*[^*]+\*\*)/g).forEach((piece, pieceIndex) => {
      if (!piece) return;
      if (piece.startsWith('**') && piece.endsWith('**') && piece.length > 4) {
        nodes.push(<strong key={`${keyPrefix}-b${segmentIndex}-${pieceIndex}`}>{piece.slice(2, -2)}</strong>);
        return;
      }

      // Single-asterisk emphasis, only when it hugs a word, so "5 * 3" stays literal.
      piece.split(/(\*[^*\s](?:[^*]*[^*\s])?\*)/g).forEach((part, partIndex) => {
        if (!part) return;
        const key = `${keyPrefix}-t${segmentIndex}-${pieceIndex}-${partIndex}`;
        if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
          nodes.push(<em key={key}>{part.slice(1, -1)}</em>);
        } else {
          nodes.push(<Fragment key={key}>{part}</Fragment>);
        }
      });
    });
  });

  return nodes;
}

/** A stable anchor for a heading, from its text with inline markup removed. */
export function headingId(text: string): string {
  return text
    .replace(/[`*]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** The lesson's section headings, in order, for an outline. */
export function extractHeadings(source: string): { id: string; text: string }[] {
  const headings: { id: string; text: string }[] = [];
  let inFence = false;
  for (const line of source.replace(/\r\n/g, '\n').split('\n')) {
    if (line.trimStart().startsWith('```')) inFence = !inFence;
    if (inFence) continue;
    const match = /^(#{2,4})\s+(.*)$/.exec(line);
    if (match) headings.push({ id: headingId(match[2]), text: match[2].replace(/[`*]/g, '') });
  }
  return headings;
}

function isTableDivider(line: string): boolean {
  return /^\|?[\s:|-]+\|[\s:|-]*$/.test(line) && line.includes('-');
}

function splitRow(line: string): string[] {
  return line
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim());
}

export function renderMarkdown(source: string): ReactNode[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];

  let index = 0;
  let key = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    // Fenced code
    if (line.trimStart().startsWith('```')) {
      const language = line.trim().slice(3).trim();
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trimStart().startsWith('```')) {
        body.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push(
        <pre key={`pre-${key++}`} data-language={language || undefined}>
          <code>{body.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    // Heading
    const heading = /^(#{2,4})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push(
        <h2 key={`h-${key++}`} id={headingId(heading[2])}>
          {renderInline(heading[2], `h${key}`)}
        </h2>,
      );
      index += 1;
      continue;
    }

    // Table
    if (line.trim().startsWith('|') && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
      const headerCells = splitRow(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim().startsWith('|')) {
        rows.push(splitRow(lines[index]));
        index += 1;
      }
      blocks.push(
        <div key={`tw-${key++}`} className="mb-5 overflow-x-auto">
          <table>
            <thead>
              <tr>
                {headerCells.map((cell, cellIndex) => (
                  <th key={cellIndex}>{renderInline(cell, `th${cellIndex}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{renderInline(cell, `td${rowIndex}-${cellIndex}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/, ''));
        index += 1;
      }
      blocks.push(
        <ul key={`ul-${key++}`}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item, `ui${itemIndex}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+\.\s+/, ''));
        index += 1;
      }
      blocks.push(
        <ol key={`ol-${key++}`}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item, `oi${itemIndex}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    // Paragraph: consume until a blank line or the start of another block.
    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{2,4})\s/.test(lines[index]) &&
      !/^\s*[-*]\s+/.test(lines[index]) &&
      !/^\s*\d+\.\s+/.test(lines[index]) &&
      !lines[index].trimStart().startsWith('```') &&
      !lines[index].trim().startsWith('|')
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }

    if (paragraph.length > 0) {
      blocks.push(<p key={`p-${key++}`}>{renderInline(paragraph.join(' '), `pi${key}`)}</p>);
    } else {
      index += 1;
    }
  }

  return blocks;
}
