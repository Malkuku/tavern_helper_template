export type InlineEmojiPart = { kind: 'text' | 'emoji'; value: string };

/** 只替换目录中存在的 [名称]；其余方括号文字保持原样。 */
export function splitInlineEmoji(text: string, hasEmoji: (name: string) => boolean): InlineEmojiPart[] {
  const parts: InlineEmojiPart[] = [];
  const pattern = /\[([^\]\r\n]+)\]/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const name = match[1];
    if (!hasEmoji(name)) continue;
    const index = match.index ?? 0;
    if (index > cursor) parts.push({ kind: 'text', value: text.slice(cursor, index) });
    parts.push({ kind: 'emoji', value: name });
    cursor = index + match[0].length;
  }
  if (cursor < text.length) parts.push({ kind: 'text', value: text.slice(cursor) });
  return parts;
}

export function insertInlineEmoji(
  text: string,
  start: number,
  end: number,
  name: string,
): { text: string; cursor: number } {
  const marker = `[${name}]`;
  return {
    text: text.slice(0, start) + marker + text.slice(end),
    cursor: start + marker.length,
  };
}
