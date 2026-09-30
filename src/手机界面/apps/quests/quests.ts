import { z } from 'zod';
import type { stat_data, 任务 } from '../../types';
import { questSchema } from '../../store/initialDataSchema';
import { latestGeneratedPayload } from '../generationResult';
import { isWithinGeneratedRating, ratingContribution, userRatingFromContribution } from '../../store/userRating';

export type 任务评级 = 任务['评级'];
const ratings = ['D', 'C', 'B', 'A', 'S'] as const;
export const zeroRatingCounts = (): Record<任务评级, number> => ({ D: 0, C: 0, B: 0, A: 0, S: 0 });

const resultQuestSchema = z.object(questSchema.shape).omit({ 当前进度: true, 已完成: true });
const generatedRecordSchema = z.record(z.string(), z.unknown());
const timePattern = /^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{2}):(\d{2})\[([1-7])\]$/;

function worldDate(value: string): Date {
  const match = timePattern.exec(value);
  if (!match) throw new Error('世界时间格式无效，无法处理任务。');
  const [, year, month, day, hour, minute, weekday] = match;
  const date = new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute));
  if (
    date.getUTCFullYear() !== +year ||
    date.getUTCMonth() !== +month - 1 ||
    date.getUTCDate() !== +day ||
    date.getUTCHours() !== +hour ||
    date.getUTCMinutes() !== +minute ||
    ((date.getUTCDay() + 6) % 7) + 1 !== +weekday
  )
    throw new Error('世界时间日期或星期无效，无法处理任务。');
  return date;
}

function dayKey(date: Date): string {
  return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
}

export function taskWeekKey(time: string): string {
  const date = worldDate(time);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return dayKey(date);
}

export function previousTaskWeekKey(time: string): string {
  const date = worldDate(time);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7) - 7);
  return dayKey(date);
}

function parseResult(message: string, active: stat_data['任务'], playerRating: 任务评级): Record<string, 任务> {
  const payload = latestGeneratedPayload(message, '<questVariable');
  if (payload === undefined) throw new Error('任务生成结果缺少完整的 questVariable 标签。');
  let raw: unknown;
  try {
    raw = JSON.parse(payload.replace(/&#x20;/gi, ' ').replace(/\\_/g, '_'));
  } catch {
    throw new Error('任务生成结果不是合法 JSON。');
  }
  const result = generatedRecordSchema.safeParse(raw);
  if (!result.success) throw new Error('任务生成结果必须是候选任务对象。');
  const accepted: [string, 任务][] = [];
  for (const [name, value] of Object.entries(result.data)) {
    if (!name.trim() || Object.hasOwn(active, name)) continue;
    const parsed = resultQuestSchema.safeParse(value);
    if (!parsed.success || !isWithinGeneratedRating(playerRating, parsed.data.评级)) continue;
    accepted.push([name, { ...parsed.data, 当前进度: '未接取', 已完成: false }]);
  }
  if (!accepted.length) throw new Error('任务生成结果没有可接取的候选任务。');
  return Object.fromEntries(accepted);
}

export function refreshTasks(data: stat_data, message: string): void {
  const result = parseResult(message, data.任务, userRatingFromContribution(data.角色.user.评级贡献));
  data.任务候选 = result;
}

export function emptyTaskWeek(week: string): stat_data['任务统计']['周记录'][string] {
  return { 周起始: week, 完成: 0, 放弃: 0, 完成评级: zeroRatingCounts(), 放弃评级: zeroRatingCounts() };
}

export function taskWeekStats(data: stat_data): {
  current: stat_data['任务统计']['周记录'][string];
  previous: stat_data['任务统计']['周记录'][string] | null;
} {
  const week = taskWeekKey(data.世界.时间);
  const previousWeek = previousTaskWeekKey(data.世界.时间);
  const records = data.任务统计.周记录;
  const start = data.任务统计.开始周.split('-').map(Number);
  const previousParts = previousWeek.split('-').map(Number);
  const hasPrevious =
    start.length === 3 &&
    start.every(Number.isSafeInteger) &&
    Date.UTC(previousParts[0], previousParts[1] - 1, previousParts[2]) >= Date.UTC(start[0], start[1] - 1, start[2]);
  return {
    current: records[week] ?? emptyTaskWeek(week),
    previous: hasPrevious ? (records[previousWeek] ?? emptyTaskWeek(previousWeek)) : null,
  };
}

export function taskWeekHistory(data: stat_data): stat_data['任务统计']['周记录'][string][] {
  const start = data.任务统计.开始周.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!start) throw new Error('任务统计开始周无效。');
  const cursor = new Date(Date.UTC(+start[1], +start[2] - 1, +start[3]));
  const [year, month, day] = taskWeekKey(data.世界.时间).split('-').map(Number);
  const end = Date.UTC(year, month - 1, day);
  const records: stat_data['任务统计']['周记录'][string][] = [];
  while (cursor.getTime() <= end) {
    const week = dayKey(cursor);
    records.push(data.任务统计.周记录[week] ?? emptyTaskWeek(week));
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return records.reverse();
}

function currentTaskWeek(data: stat_data): stat_data['任务统计']['周记录'][string] {
  const week = taskWeekKey(data.世界.时间);
  return (data.任务统计.周记录[week] ??= emptyTaskWeek(week));
}

export function acceptTask(data: stat_data, name: string): void {
  const task = data.任务候选[name];
  if (!task) throw new Error('候选列表中没有这项任务。');
  if (Object.hasOwn(data.任务, name)) throw new Error('这项任务已经接取。');
  if (Object.keys(data.任务).length >= 4) throw new Error('最多同时接取 4 项任务，已完成未领奖仍占名额。');
  data.任务[name] = { ...task, 当前进度: '进行中' };
  delete data.任务候选[name];
}

export function abandonTask(data: stat_data, name: string): void {
  const task = data.任务[name];
  if (!task) throw new Error('没有这项已接任务。');
  if (task.已完成) throw new Error('已完成任务只能领取奖励。');
  if (!ratings.includes(task.评级)) throw new Error('任务评级无效。');
  const week = currentTaskWeek(data);
  week.放弃++;
  week.放弃评级[task.评级]++;
  delete data.任务[name];
}

export function claimTask(data: stat_data, name: string): number {
  const task = data.任务[name];
  if (!task) throw new Error('没有这项已接任务。');
  if (task.已完成 !== true) throw new Error('任务尚未完成，不能领取奖励。');
  if (!ratings.includes(task.评级)) throw new Error('任务评级无效。');
  const reward = task.奖励;
  const balance = data.角色.user.恶堕积分;
  const total = data.角色.user.评级贡献;
  const gained = ratingContribution[task.评级];
  if (!Number.isSafeInteger(reward) || reward <= 0) throw new Error('任务奖励无效。');
  if (!Number.isSafeInteger(balance) || balance < 0 || !Number.isSafeInteger(balance + reward))
    throw new Error('恶堕积分余额无效。');
  if (!Number.isSafeInteger(total) || total < 0 || !Number.isSafeInteger(total + gained))
    throw new Error('累计评级贡献无效。');
  const week = currentTaskWeek(data);
  data.角色.user.恶堕积分 += reward;
  data.角色.user.评级贡献 += gained;
  data.角色.user.当前评级 = userRatingFromContribution(data.角色.user.评级贡献);
  week.完成++;
  week.完成评级[task.评级]++;
  delete data.任务[name];
  return reward;
}
