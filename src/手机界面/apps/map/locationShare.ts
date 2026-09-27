/** 位置消息只携带地图节点 key；JSON 字符串转义保证特殊字符可往返。 */
export function locationShare(key: string): string {
  return `<位置 key=${JSON.stringify(key)}>`;
}

export function parseLocationShare(content: string): string | null {
  const match = /^<位置 key=("(?:\\.|[^"\\])*")>$/.exec(content);
  if (!match) return null;
  try {
    const key = JSON.parse(match[1]);
    return typeof key === 'string' && key.length > 0 ? key : null;
  } catch {
    return null;
  }
}
