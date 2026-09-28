export type GeneratedMarker = '<skillVariable' | '<shopVariable' | '<questVariable';

export class InvalidGeneratedResultError extends Error {
  constructor(cause: unknown) {
    super(cause instanceof Error ? cause.message : '生成结果内容无效。', { cause });
    this.name = 'InvalidGeneratedResultError';
  }
}

export function latestGeneratedTag(text: string, marker: GeneratedMarker): string | undefined {
  const tagName = marker.slice(1);
  const tag = new RegExp(`${marker}>[\\s\\S]*?<\\/${tagName}>`, 'g');
  return [...text.matchAll(tag)].at(-1)?.[0];
}

export function removeGeneratedTag(text: string, tag: string): string {
  const index = text.lastIndexOf(tag);
  if (index < 0) throw new Error('出错的生成标签已被修改，无法自动清除。');
  return text.slice(0, index) + text.slice(index + tag.length);
}

export function isNewGenerationResult(
  message: ChatMessage | null | undefined,
  marker: GeneratedMarker,
  startId: number,
  startText: string,
): message is ChatMessage {
  if (!message || message.role !== 'assistant' || !message.message.includes(marker)) return false;
  if (message.message_id > startId) return true;
  if (message.message_id !== startId) return false;
  const currentResult = latestGeneratedTag(message.message, marker);
  return !!currentResult && currentResult !== latestGeneratedTag(startText, marker);
}
