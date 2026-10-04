import type { CharacterKind } from '../手机界面/apps/data/profileUnlock';
import type { stat_data, 次要角色人设, 角色人设 } from '../手机界面/types';

export const bodyParts = ['小穴', '口穴', '菊穴', '胸部'] as const;
export const stageNames = ['创伤稳定度', '好感度', '恶堕度'] as const;

export interface PresentCharacter {
  id: string;
  name: string;
  kind: CharacterKind;
  role: 角色人设 | 次要角色人设;
}

export function presentCharacters(data?: stat_data): PresentCharacter[] {
  return (['主要角色', '次要角色'] as const).flatMap(kind =>
    Object.entries(data?.角色?.[kind] ?? {})
      .filter(([, role]) => role?.在场 === true)
      .map(([name, role]) => ({ id: JSON.stringify([kind, name]), name, kind, role })),
  );
}

export function canReadField(data: stat_data | undefined, character: PresentCharacter, field: string): boolean {
  if (field === '创伤稳定度') return character.kind === '主要角色';
  const unlocked = data?.手机?.档案解锁?.[character.kind];
  const fields = unlocked && Object.hasOwn(unlocked, character.name) ? unlocked[character.name] : [];
  return Array.isArray(fields) && fields.includes(field);
}

export function statusText(value: unknown): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value) ?? '未记录';
}
