import type { 阶段状态 } from '../../types';

export function entries<T extends object>(record: T | undefined | null): [Extract<keyof T, string>, T[keyof T]][] {
  return Object.entries(record ?? {}) as [Extract<keyof T, string>, T[keyof T]][];
}

export function currentLevelDescription(stage: Pick<阶段状态, '当前等级' | '描述'>): string | undefined {
  return stage.描述[String(stage.当前等级)];
}
