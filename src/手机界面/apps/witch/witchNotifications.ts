import type { stat_data } from '../../types';

export type WitchNotice = {
  key: string;
  title: string;
  message: string;
  tab: 'tasks' | 'observe' | 'shop';
  target?: string;
  shop?: '技能商店' | '道具商店';
  warning?: boolean;
};

export function refreshSuccessNotice(kind: '任务' | '技能' | '道具'): WitchNotice {
  if (kind === '任务')
    return { key: 'refresh:任务', title: '任务刷新成功', message: '新的任务候选已更新，点击查看。', tab: 'tasks' };
  return {
    key: `refresh:${kind}`,
    title: `${kind}商店刷新成功`,
    message: '货架已更新，点击查看。',
    tab: 'shop',
    shop: kind === '技能' ? '技能商店' : '道具商店',
  };
}

type StageLevel = {
  kind: '主要角色' | '次要角色';
  key: string;
  stage: '创伤稳定度' | '好感度' | '恶堕度';
  level: number;
};

export function stageLevelSnapshot(data: stat_data): Map<string, StageLevel> {
  const levels = new Map<string, StageLevel>();
  for (const [key, role] of Object.entries(data.角色?.主要角色 ?? {})) {
    for (const stage of ['创伤稳定度', '好感度', '恶堕度'] as const) {
      const level = role.人设阶段?.[stage]?.当前等级;
      if (typeof level === 'number' && Number.isSafeInteger(level))
        levels.set(`主要角色:${key}:${stage}`, { kind: '主要角色', key, stage, level });
    }
  }
  for (const [key, role] of Object.entries(data.角色?.次要角色 ?? {})) {
    for (const stage of ['好感度', '恶堕度'] as const) {
      const level = role.人设阶段?.[stage]?.当前等级;
      if (typeof level === 'number' && Number.isSafeInteger(level))
        levels.set(`次要角色:${key}:${stage}`, { kind: '次要角色', key, stage, level });
    }
  }
  return levels;
}

export function stageChangeNotices(before: Map<string, StageLevel>, after: Map<string, StageLevel>): WitchNotice[] {
  const notices: WitchNotice[] = [];
  for (const [id, current] of after) {
    const previous = before.get(id);
    if (!previous || previous.level === current.level) continue;
    notices.push({
      key: `stage:${id}:${previous.level}:${current.level}`,
      title: `${current.key}的${current.stage}等级${current.level > previous.level ? '提升' : '下降'}`,
      message: `${previous.level} 级 → ${current.level} 级，点击查看当前状态。`,
      tab: 'observe',
      target: current.key,
      warning: current.stage === '创伤稳定度' && current.level < previous.level,
    });
  }
  return notices;
}

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
  return notices;
}
