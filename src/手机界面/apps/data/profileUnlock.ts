export const unlockPrices = {
  主要角色: { 好感度: 2, 恶堕度: 2, 身体状态: 2, 性格: 3, 背景: 4, 核心能力: 6, 核心创伤: 8 },
  次要角色: { 恶堕度: 2, 身体状态: 2, 性格侧写: 3, 能力描述: 4 },
} as const;

export type CharacterKind = keyof typeof unlockPrices;
export type UnlockField = keyof (typeof unlockPrices)['主要角色'] | keyof (typeof unlockPrices)['次要角色'];

export function unlockPrice(kind: CharacterKind, field: string): number | undefined {
  return (unlockPrices[kind] as Record<string, number>)[field];
}

/** 同一份数据中同时校验角色、扣费和登记解锁；调用方负责一次性写回。 */
export function applyCharacterUnlock(data: stat_data, kind: CharacterKind, key: string, field: string): boolean {
  const price = unlockPrice(kind, field);
  if (price === undefined) throw new Error('该档案项目无法解锁。');
  if (!Object.hasOwn(data.角色[kind], key)) throw new Error('角色已不存在，请刷新档案。');
  const existing = data.手机.档案解锁?.[kind];
  const fields = existing && Object.hasOwn(existing, key) ? existing[key] : [];
  if (fields.includes(field)) return false;
  const balance = data.角色.user.恶堕积分;
  if (!Number.isSafeInteger(balance) || balance < price) throw new Error(`恶堕积分不足，需要 ${price} 点。`);
  data.角色.user.恶堕积分 -= price;
  const unlocked = data.手机.档案解锁 ?? (data.手机.档案解锁 = {});
  const byKind = unlocked[kind] ?? (unlocked[kind] = {});
  byKind[key] = [...fields, field];
  return true;
}
import type { stat_data } from '../../types';
