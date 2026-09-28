import { z } from 'zod';
import type { stat_data, 任务 } from '../../types';
import { questSchema } from '../../store/initialDataSchema';
import { InvalidGeneratedResultError } from '../generationResult';

export type 任务评级 = 任务['评级'];
const ratings = ['D', 'C', 'B', 'A', 'S'] as const;
export const zeroRatingCounts = (): Record<任务评级, number> => ({ D: 0, C: 0, B: 0, A: 0, S: 0 });

const resultQuestSchema = questSchema.extend({ 当前进度: z.literal('未接取'), 已完成: z.literal(false) });
const resultSchema = z.record(z.string().trim().min(1), resultQuestSchema);
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

function nextMidnight(date: Date): string {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
  return `${dayKey(next)}T00:00[${((next.getUTCDay() + 6) % 7) + 1}]`;
}

export function taskRefreshState(data: stat_data): { available: boolean; next: string } {
  const now = worldDate(data.世界.时间);
  const next = data.系统.任务下次刷新时间;
  const count = data.系统.任务主动刷新次数;
  if (!Number.isSafeInteger(count) || count < 0 || count > 1) throw new Error('任务刷新次数无效。');
  return { available: !next || now >= worldDate(next) || count === 0, next: nextMidnight(now) };
}

function parseResult(message: string, active: stat_data['任务']): Record<string, 任务> {
  const tags = [...message.matchAll(/<questVariable>\s*([\s\S]*?)\s*<\/questVariable>/g)];
  if (tags.length !== 1 || [...message.matchAll(/<questVariable>/g)].length !== 1)
    throw new Error('任务生成结果必须包含且只包含一个完整的 questVariable 标签。');
  let raw: unknown;
  try {
    raw = JSON.parse(tags[0][1].replace(/&#x20;/gi, ' ').replace(/\\_/g, '_'));
  } catch {
    throw new Error('任务生成结果不是合法 JSON。');
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const item of Object.values(raw)) {
      if (!item || typeof item !== 'object' || Array.isArray(item) || !Object.hasOwn(item, 'current_progress'))
        continue;
      const quest = item as Record<string, unknown>;
      if (Object.hasOwn(quest, '当前进度')) throw new Error('任务生成结果同时包含两种进度字段。');
      quest.当前进度 = quest.current_progress;
      delete quest.current_progress;
    }
  }
  const result = resultSchema.safeParse(raw);
  if (!result.success) {
    console.error(
      '任务生成字段校验失败',
      result.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
    );
    const issue = result.error.issues[0];
    throw new Error(`任务生成字段无效：${issue.path.join('.')} ${issue.message}`);
  }
  if (Object.keys(result.data).length !== 6) throw new Error('任务生成结果必须恰好包含 6 个不同名称的任务。');
  for (const name of Object.keys(result.data))
    if (Object.hasOwn(active, name)) throw new Error(`任务「${name}」已接取，不能重复生成。`);
  return result.data;
}

export function refreshTasks(data: stat_data, message: string): void {
  const state = taskRefreshState(data);
  if (!state.available) throw new Error('今天的免费任务刷新次数已用完。');
  let result: Record<string, 任务>;
  try {
    result = parseResult(message, data.任务);
  } catch (error) {
    throw new InvalidGeneratedResultError(error);
  }
  data.任务候选 = result;
  data.系统.任务下次刷新时间 = state.next;
  data.系统.任务主动刷新次数 = 1;
}

export function emptyTaskWeek(week: string): stat_data['任务统计']['本周'] {
  return { 周起始: week, 完成: 0, 放弃: 0, 完成评级: zeroRatingCounts(), 放弃评级: zeroRatingCounts() };
}

export function taskWeekStats(data: stat_data): {
  current: stat_data['任务统计']['本周'];
  previous: stat_data['任务统计']['上周'];
} {
  const week = taskWeekKey(data.世界.时间);
  const previousWeek = previousTaskWeekKey(data.世界.时间);
  const current = data.任务统计.本周;
  const previous = data.任务统计.上周;
  const start = data.任务统计.开始周.split('-').map(Number);
  const previousParts = previousWeek.split('-').map(Number);
  const hasPrevious =
    start.length === 3 &&
    start.every(Number.isSafeInteger) &&
    Date.UTC(previousParts[0], previousParts[1] - 1, previousParts[2]) >= Date.UTC(start[0], start[1] - 1, start[2]);
  return {
    current: current.周起始 === week ? current : emptyTaskWeek(week),
    previous:
      current.周起始 === previousWeek
        ? current
        : previous?.周起始 === previousWeek
          ? previous
          : hasPrevious
            ? emptyTaskWeek(previousWeek)
            : null,
  };
}

function rollTaskStats(data: stat_data): void {
  const stats = taskWeekStats(data);
  data.任务统计 = { 开始周: data.任务统计.开始周, 本周: stats.current, 上周: stats.previous };
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
  rollTaskStats(data);
  data.任务统计.本周.放弃++;
  data.任务统计.本周.放弃评级[task.评级]++;
  delete data.任务[name];
}

export function claimTask(data: stat_data, name: string): number {
  const task = data.任务[name];
  if (!task) throw new Error('没有这项已接任务。');
  if (task.已完成 !== true) throw new Error('任务尚未完成，不能领取奖励。');
  if (!ratings.includes(task.评级)) throw new Error('任务评级无效。');
  const reward = task.奖励;
  const balance = data.角色.user.恶堕积分;
  if (!Number.isSafeInteger(reward) || reward <= 0) throw new Error('任务奖励无效。');
  if (!Number.isSafeInteger(balance) || balance < 0 || !Number.isSafeInteger(balance + reward))
    throw new Error('恶堕积分余额无效。');
  rollTaskStats(data);
  data.角色.user.恶堕积分 += reward;
  data.任务统计.本周.完成++;
  data.任务统计.本周.完成评级[task.评级]++;
  delete data.任务[name];
  return reward;
}
