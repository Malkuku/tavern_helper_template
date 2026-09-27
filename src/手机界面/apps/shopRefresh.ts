import type { stat_data } from '../types';

const timePattern = /^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{2}):(\d{2})\[[1-7]\]$/;

function parseWorldTime(time: string): Date {
  const match = timePattern.exec(time);
  if (!match) throw new Error('世界时间格式无效，无法刷新商店。');
  const [, year, month, day, hour, minute] = match;
  const date = new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute));
  if (
    date.getUTCFullYear() !== +year ||
    date.getUTCMonth() !== +month - 1 ||
    date.getUTCDate() !== +day ||
    date.getUTCHours() !== +hour ||
    date.getUTCMinutes() !== +minute
  )
    throw new Error('世界时间日期无效，无法刷新商店。');
  return date;
}

function nextMonday(date: Date): string {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  next.setUTCDate(next.getUTCDate() + ((8 - next.getUTCDay()) % 7 || 7));
  return `${next.getUTCFullYear()}-${next.getUTCMonth() + 1}-${next.getUTCDate()}T00:00[1]`;
}

export function weeklyShopQuote(
  data: stat_data,
  kind: '技能' | '道具',
): { next: string; count: number; price: number } {
  const now = parseWorldTime(data.世界.时间);
  const next = kind === '技能' ? data.系统.技能下次刷新时间 : data.系统.商店下次刷新时间;
  const previousCount = kind === '技能' ? data.系统.技能主动刷新次数 : data.系统.商店主动刷新次数;
  const count = !next || now >= parseWorldTime(next) ? 0 : previousCount;
  if (!Number.isSafeInteger(count) || count < 0 || count === Number.MAX_SAFE_INTEGER)
    throw new Error(`${kind}刷新次数无效。`);
  const price = kind === '技能' ? (count === 0 ? 0 : Math.min(20 * 2 ** (count - 1), 80)) : Math.min(count * 5, 20);
  if (!Number.isSafeInteger(price)) throw new Error(`${kind}刷新价格超出有效范围。`);
  return { next: nextMonday(now), count, price };
}
