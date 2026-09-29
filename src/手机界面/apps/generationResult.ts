export type GeneratedMarker = '<skillVariable' | '<shopVariable' | '<questVariable';

function generatedTags(text: string, marker: GeneratedMarker): string[] {
  const tagName = marker.slice(1);
  const tag = new RegExp(`${marker}>(?:(?!${marker}>)[\\s\\S])*?<\\/${tagName}>`, 'g');
  return [...text.matchAll(tag)].map(match => match[0]);
}

export function latestGeneratedTag(text: string, marker: GeneratedMarker): string | undefined {
  return generatedTags(text, marker).at(-1);
}

export function latestGeneratedPayload(text: string, marker: GeneratedMarker): string | undefined {
  const tag = latestGeneratedTag(text, marker);
  if (!tag) return undefined;
  const tagName = marker.slice(1);
  return tag.slice(tagName.length + 2, -tagName.length - 3).trim();
}

export function removeGeneratedTag(text: string, tag: string, index = text.lastIndexOf(tag)): string {
  if (index < 0 || text.slice(index, index + tag.length) !== tag)
    throw new Error('出错的生成标签已被修改，无法自动清除。');
  return text.slice(0, index) + text.slice(index + tag.length);
}

export function isNewGenerationResult(
  message: ChatMessage | null | undefined,
  marker: GeneratedMarker,
  startId: number,
  startText: string,
): message is ChatMessage {
  if (!message || message.role !== 'assistant') return false;
  const currentResult = latestGeneratedTag(message.message, marker);
  if (!currentResult) return false;
  if (message.message_id > startId) return true;
  if (message.message_id !== startId) return false;
  const previousResults = generatedTags(startText, marker);
  return (
    currentResult !== previousResults.at(-1) || generatedTags(message.message, marker).length > previousResults.length
  );
}
