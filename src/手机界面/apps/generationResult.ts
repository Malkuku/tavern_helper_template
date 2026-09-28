export function isNewGenerationResult(
  message: ChatMessage | null | undefined,
  marker: '<skillVariable' | '<shopVariable' | '<questVariable',
  startId: number,
  startText: string,
): message is ChatMessage {
  if (!message || message.role !== 'assistant' || !message.message.includes(marker)) return false;
  if (message.message_id > startId) return true;
  if (message.message_id !== startId) return false;
  const tagName = marker.slice(1);
  const tag = new RegExp(`${marker}>[\\s\\S]*?<\\/${tagName}>`, 'g');
  const latestResult = (text: string) => [...text.matchAll(tag)].at(-1)?.[0];
  const currentResult = latestResult(message.message);
  return !!currentResult && currentResult !== latestResult(startText);
}
