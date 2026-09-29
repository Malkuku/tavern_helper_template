import type { stat_data } from '../手机界面/types';

export interface ProgressNotice {
  key: string;
  kind: '任务进度' | '角色阶段';
  title: string;
  detail: string;
}

type Snapshot = Pick<stat_data, '任务' | '角色'>;

/** 只比较上一楼已经存在的业务对象，避免开局初始化与新角色收录产生误报。 */
export function progressNotices(before?: Snapshot, after?: Snapshot): ProgressNotice[] {
  if (!before || !after) return [];
  const notices: ProgressNotice[] = [];

  for (const [name, task] of Object.entries(after.任务 ?? {})) {
    const previous = before.任务?.[name];
    if (!previous || (previous.当前进度 === task.当前进度 && previous.已完成 === task.已完成)) continue;
    const from = previous.已完成 ? `${previous.当前进度} · 已完成` : previous.当前进度;
    const to = task.已完成 ? `${task.当前进度} · 已完成` : task.当前进度;
    notices.push({ key: `task:${name}`, kind: '任务进度', title: name, detail: `${from} → ${to}` });
  }

  function addStage(kind: string, name: string, stageName: string, oldLevel?: number, newLevel?: number) {
    if (!Number.isFinite(oldLevel) || !Number.isFinite(newLevel) || oldLevel === newLevel) return;
    notices.push({
      key: `${kind}:${name}:${stageName}`,
      kind: '角色阶段',
      title: `${name} · ${stageName}`,
      detail: `${oldLevel} 级 → ${newLevel} 级`,
    });
  }

  for (const [name, role] of Object.entries(after.角色?.主要角色 ?? {})) {
    const previous = before.角色?.主要角色?.[name];
    if (!previous) continue;
    for (const stageName of ['创伤稳定度', '好感度', '恶堕度'] as const) {
      addStage(
        '主要角色',
        name,
        stageName,
        previous.人设阶段?.[stageName]?.当前等级,
        role.人设阶段?.[stageName]?.当前等级,
      );
    }
  }
  for (const [name, role] of Object.entries(after.角色?.次要角色 ?? {})) {
    const previous = before.角色?.次要角色?.[name];
    if (!previous) continue;
    addStage('次要角色', name, '恶堕度', previous.人设阶段?.恶堕度?.当前等级, role.人设阶段?.恶堕度?.当前等级);
  }

  return notices;
}
