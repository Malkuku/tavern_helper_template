import type { stat_data, 阶段状态 } from '../types';

export type StageKind = '恶堕度' | '好感度' | '创伤稳定度';

function levelRange(stage: 阶段状态, path: string): { min: number; max: number } {
  if (!stage || typeof stage !== 'object' || !stage.描述 || typeof stage.描述 !== 'object')
    throw new Error(`${path} 缺少阶段描述。`);
  const levels = Object.keys(stage.描述).map(key => {
    const level = Number(key);
    if (!/^-?(0|[1-9]\d*)$/.test(key) || !Number.isSafeInteger(level))
      throw new Error(`${path} 的描述等级“${key}”无效。`);
    return level;
  });
  if (!levels.length) throw new Error(`${path} 没有可用的阶段描述。`);
  levels.sort((a, b) => a - b);
  if (levels.some((level, index) => index > 0 && level !== levels[index - 1] + 1))
    throw new Error(`${path} 的描述等级必须连续。`);
  if (!Number.isSafeInteger(stage.当前等级) || !Object.hasOwn(stage.描述, String(stage.当前等级)))
    throw new Error(`${path} 的当前等级没有对应描述。`);
  if (!Number.isFinite(stage.累计经验)) throw new Error(`${path} 的累计经验无效。`);
  return { min: levels[0], max: levels[levels.length - 1] };
}

export function stageExperienceCost(kind: StageKind, lowerLevel: number, min: number, max: number): number {
  if (!Number.isSafeInteger(lowerLevel) || !Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min >= max)
    throw new Error('人设阶段等级范围无效。');
  let cost: number;
  if (kind === '恶堕度') cost = Math.ceil(30 * 1.55 ** Math.max(lowerLevel, 0));
  else if (kind === '好感度') {
    const distance = Math.max(Math.abs(lowerLevel), Math.abs(lowerLevel + 1));
    cost = Math.ceil(16 * (1 + 0.25 * distance ** 2));
  } else {
    const position = (lowerLevel + 0.5 - min) / (max - min);
    cost = Math.ceil(25 + 120 * (position - 0.65) ** 2);
  }
  if (!Number.isSafeInteger(cost) || cost <= 0) throw new Error('人设阶段经验需求超出可计算范围。');
  return cost;
}

export function stageExperienceProgress(
  stage: 阶段状态,
  kind: StageKind,
): {
  direction: 'forward' | 'backward' | 'none';
  percent: number;
} {
  const { min, max } = levelRange(stage, kind);
  const level = stage.当前等级;
  const experience = stage.累计经验;
  if (experience < 0) {
    if (kind === '恶堕度' || level <= min) return { direction: 'none', percent: 0 };
    return {
      direction: 'backward',
      percent: Math.min((-experience / stageExperienceCost(kind, level - 1, min, max)) * 100, 100),
    };
  }
  if (level >= max) return { direction: 'forward', percent: 100 };
  return {
    direction: 'forward',
    percent: Math.min((experience / stageExperienceCost(kind, level, min, max)) * 100, 100),
  };
}

function settleStage(stage: 阶段状态, kind: StageKind, path: string): boolean {
  const { min, max } = levelRange(stage, path);
  let level = stage.当前等级;
  let experience = stage.累计经验;
  while (level < max && Object.hasOwn(stage.描述, String(level + 1))) {
    const cost = stageExperienceCost(kind, level, min, max);
    if (experience < cost) break;
    experience -= cost;
    level++;
  }
  if (kind !== '恶堕度') {
    while (level > min && Object.hasOwn(stage.描述, String(level - 1))) {
      const cost = stageExperienceCost(kind, level - 1, min, max);
      if (experience > -cost) break;
      experience += cost;
      level--;
    }
  }
  if (level === stage.当前等级 && experience === stage.累计经验) return false;
  stage.当前等级 = level;
  stage.累计经验 = experience;
  return true;
}

export function settleCharacterStages(data: stat_data): boolean {
  let changed = false;
  for (const [key, role] of Object.entries(data.角色?.主要角色 ?? {})) {
    for (const kind of ['创伤稳定度', '好感度', '恶堕度'] as const) {
      const path = `角色.主要角色.${key}.人设阶段.${kind}`;
      if (!role.人设阶段?.[kind]) throw new Error(`${path} 缺少阶段数据。`);
      changed = settleStage(role.人设阶段[kind], kind, path) || changed;
    }
  }
  for (const [key, role] of Object.entries(data.角色?.次要角色 ?? {})) {
    for (const kind of ['好感度', '恶堕度'] as const) {
      const value = role.人设阶段?.[kind];
      if (!value) continue; // 旧存档中的次要角色可缺少该字段。
      changed = settleStage(value, kind, `角色.次要角色.${key}.人设阶段.${kind}`) || changed;
    }
  }
  return changed;
}
