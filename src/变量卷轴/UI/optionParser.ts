export function normalizeOptionText(rawText: string): string {
  return rawText
    .replace(/\r\n?/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .split('\n')
    .map(line => line.replace(/[ \t\f\v]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function parseMessageOptions(message: string): string[] {
  return [...message.matchAll(/<op>([\s\S]*?)<\/op>/gi)].map(match => normalizeOptionText(match[1])).filter(Boolean);
}
