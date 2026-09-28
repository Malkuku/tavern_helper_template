import type { stat_data } from '../../types';
import { taskRefreshState } from '../quests/quests';

export type WitchNotice = {
  key: string;
  title: string;
  message: string;
  tab: 'tasks' | 'observe';
  target?: string;
  warning?: boolean;
};

export function witchStabilityNotices(data: stat_data | null): WitchNotice[] {
  if (!data) return [];
  return (data.系统?.已发现目标 ?? []).flatMap(key => {
    const level = data.角色?.主要角色?.[key]?.人设阶段?.创伤稳定度?.当前等级;
    if (typeof level !== 'number' || !Number.isFinite(level) || level > 2) return [];
    return [
      {
        key: `stability:${key}:${level}`,
        title: '创伤稳定度警告',
        message: `${key}当前为 ${level} 级，建议查看观测档案。`,
        tab: 'observe' as const,
        target: key,
        warning: true,
      },
    ];
  });
}

export function witchNotices(data: stat_data | null): WitchNotice[] {
  return [...witchStabilityNotices(data), ...witchTaskNotices(data)];
}

export function activeWitchNoticeHistory(history: string[], notices: WitchNotice[]): string[] {
  const active = new Set(notices.map(notice => notice.key));
  return history.filter(key => active.has(key));
}

export function nextWitchNotice(notices: WitchNotice[], history: string[]): WitchNotice | null {
  const seen = new Set(history);
  return notices.find(notice => !seen.has(notice.key)) ?? null;
}

export function witchTaskNotices(data: stat_data | null): WitchNotice[] {
  if (!data || !data.系统?.已发现目标?.length) return [];
  const claimable = Object.entries(data.任务 ?? {}).filter(([, task]) => task.已完成);
  const notices: WitchNotice[] = [];
  if (claimable.length)
    notices.push({
      key: `claim:${claimable
        .map(([name]) => name)
        .sort()
        .join('|')}`,
      title: '任务奖励待领取',
      message: `${claimable.length} 项任务已完成，打开任务页领取奖励。`,
      tab: 'tasks',
    });
  try {
    if (taskRefreshState(data).available)
      notices.push({
        key: `refresh:${data.世界.时间.split('T')[0]}`,
        title: '免费任务刷新可用',
        message: '今天可免费刷新 6 项候选任务。',
        tab: 'tasks',
      });
  } catch (error) {
    console.error('任务刷新提醒状态无效', error);
  }
  return notices;
}
