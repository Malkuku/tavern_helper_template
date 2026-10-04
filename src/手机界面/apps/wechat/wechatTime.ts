const dayMilliseconds = 24 * 60 * 60 * 1000;

// 世界时间是剧情日历时间；用 UTC 运算避免电脑时区和夏令时影响。
function parseTime(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{1,2}):(\d{2})\[([1-7])\]$/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match.map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, 0, 0);
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute
    ? date
    : null;
}

function calendarDay(date: Date): number {
  return Math.floor(date.getTime() / dayMilliseconds);
}

export function displayWeChatTime(value: string, worldTime: string): string {
  const date = parseTime(value);
  if (!date) return value;
  const clock = `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
  const now = parseTime(worldTime);
  if (now) {
    const daysAgo = calendarDay(now) - calendarDay(date);
    if (daysAgo === 0) return clock;
    if (daysAgo === 1) return `昨天 ${clock}`;
  }
  const year = !now || date.getUTCFullYear() !== now.getUTCFullYear() ? `${date.getUTCFullYear()}年` : '';
  return `${year}${date.getUTCMonth() + 1}月${date.getUTCDate()}日 ${clock}`;
}

export function weChatTimeDividers(messages: readonly { 时间: string }[]): boolean[] {
  let lastShown: Date | null = null;
  return messages.map((message, index) => {
    const current = parseTime(message.时间);
    const show =
      index === 0 ||
      !current ||
      !lastShown ||
      calendarDay(current) !== calendarDay(lastShown) ||
      current.getTime() - lastShown.getTime() >= 5 * 60 * 1000 ||
      current.getTime() < lastShown.getTime();
    if (show) lastShown = current;
    return show;
  });
}
