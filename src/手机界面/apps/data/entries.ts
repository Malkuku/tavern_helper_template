import type { 阶段状态 } from '../../types';
import type { StageKind } from '../../store/stageProgression';

export function entries<T extends object>(record: T | undefined | null): [Extract<keyof T, string>, T[keyof T]][] {
  return Object.entries(record ?? {}) as [Extract<keyof T, string>, T[keyof T]][];
}

export function currentLevelDescription(stage: Pick<阶段状态, '当前等级' | '描述'>): string | undefined {
  return stage.描述[String(stage.当前等级)];
}

export function adjacentLevelDescription(
  stage: 阶段状态,
  kind: StageKind,
): { level: number; direction: '前进' | '回退'; description: string } | undefined {
  const backward = stage.累计经验 < 0 && kind !== '恶堕度';
  const level = stage.当前等级 + (backward ? -1 : 1);
  const description = stage.描述[String(level)];
  return description === undefined ? undefined : { level, direction: backward ? '回退' : '前进', description };
}
