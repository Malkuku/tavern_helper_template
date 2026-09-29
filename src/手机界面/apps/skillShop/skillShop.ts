import { z } from 'zod';
import type { 可购技能, stat_data } from '../../types';
import { skillSchema } from '../../store/initialDataSchema';
import { directedRefreshPrice, weeklyShopQuote } from '../shopRefresh';
import { isGeneratedShopIcon } from '../shopIcon';
import { isWithinGeneratedRating, userRatingFromContribution } from '../../store/userRating';
import { latestGeneratedPayload } from '../generationResult';

const generatedSkillSchema = z.object({
  ...skillSchema.shape,
  图标: z.preprocess(
    value =>
      typeof value === 'string' && skillSchema.shape.图标.safeParse(value).success && isGeneratedShopIcon(value)
        ? value
        : undefined,
    skillSchema.shape.图标,
  ),
});
const generatedRecordSchema = z.record(z.string(), z.unknown());

export function refreshQuote(data: stat_data): { next: string; count: number; price: number } {
  return weeklyShopQuote(data, '技能');
}

function validPrice(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export const MAX_SKILL_SLOTS = 20;

export function skillSlotCount(data: stat_data): number {
  const slots = data.角色.user.技能栏位 ?? 6;
  if (!Number.isSafeInteger(slots) || slots < 6 || slots > MAX_SKILL_SLOTS) throw new Error('技能栏位数据无效。');
  return slots;
}

export function nextSkillSlotPrice(data: stat_data): number | null {
  const slots = skillSlotCount(data);
  return slots === MAX_SKILL_SLOTS ? null : (slots - 5) * 50;
}

export function unlockSkillSlot(data: stat_data): number {
  const price = nextSkillSlotPrice(data);
  if (price === null) throw new Error(`技能栏位已达到 ${MAX_SKILL_SLOTS} 格上限。`);
  const balance = data.角色.user.恶堕积分;
  if (!Number.isSafeInteger(balance) || balance < price) throw new Error(`恶堕积分不足，需要 ${price} 点。`);
  data.角色.user.恶堕积分 -= price;
  data.角色.user.技能栏位 = skillSlotCount(data) + 1;
  return price;
}

export function parseSkillResult(message: string, playerRating: 可购技能['评级']): Record<string, 可购技能> {
  const payload = latestGeneratedPayload(message, '<skillVariable');
  if (payload === undefined) throw new Error('技能生成结果缺少完整的 skillVariable 标签。');
  let raw: unknown;
  try {
    raw = JSON.parse(payload);
  } catch {
    throw new Error('技能生成结果不是合法 JSON。');
  }
  const parsed = generatedRecordSchema.safeParse(raw);
  if (!parsed.success) throw new Error('技能生成结果必须是技能对象。');
  const accepted: [string, 可购技能][] = [];
  for (const [name, value] of Object.entries(parsed.data)) {
    const result = generatedSkillSchema.safeParse(value);
    if (!result.success) continue;
    const item = result.data;
    if (
      !name.trim() ||
      !item.描述.trim() ||
      !item.作用.trim() ||
      !validPrice(item.价格) ||
      !isWithinGeneratedRating(playerRating, item.评级)
    )
      continue;
    accepted.push([name, item]);
  }
  if (!accepted.length) throw new Error('技能生成结果没有可上架的技能。');
  return Object.fromEntries(accepted);
}

export function applySkillRefresh(data: stat_data, message: string, directed = false): void {
  const shop = parseSkillResult(message, userRatingFromContribution(data.角色.user.评级贡献));
  const quote = refreshQuote(data);
  const price = directed ? directedRefreshPrice(data, '技能', quote.price) : quote.price;
  if (!Number.isSafeInteger(data.角色.user.恶堕积分) || data.角色.user.恶堕积分 < price)
    throw new Error(`恶堕积分不足，需要 ${price} 点。`);
  data.技能商店 = shop;
  data.角色.user.恶堕积分 -= price;
  data.系统.技能下次刷新时间 = quote.next;
  data.系统.技能主动刷新次数 = quote.count + 1;
  if (directed) data.手机.定向刷新 = null;
}

export function buySkill(data: stat_data, name: string): void {
  const item = data.技能商店[name];
  if (!item) throw new Error('商店中没有这项技能。');
  if (!validPrice(item.价格)) throw new Error('技能价格无效。');
  const current = data.角色.user.技能[name];
  if (!current && Object.keys(data.角色.user.技能).length >= skillSlotCount(data))
    throw new Error('技能栏位已满，请先解锁栏位或出售技能。');
  const balance = data.角色.user.恶堕积分;
  if (!Number.isSafeInteger(balance) || balance < item.价格) throw new Error('恶堕积分不足。');
  const price = (current?.价格 ?? 0) + item.价格;
  if (!validPrice(price)) throw new Error('累计技能价格无效。');
  const nextSkill = { ...item, 价格: price };
  data.角色.user.恶堕积分 -= item.价格;
  data.角色.user.技能[name] = nextSkill;
  delete data.技能商店[name];
}

export function sellSkill(data: stat_data, name: string): number {
  const item = data.角色.user.技能[name];
  if (!item) throw new Error('当前没有这项技能。');
  if (!validPrice(item.价格)) throw new Error('技能累计价格无效。');
  const refund = Math.floor(item.价格 / 2);
  const balance = data.角色.user.恶堕积分;
  if (!Number.isSafeInteger(balance) || !Number.isSafeInteger(balance + refund)) throw new Error('恶堕积分余额无效。');
  data.角色.user.恶堕积分 += refund;
  delete data.角色.user.技能[name];
  return refund;
}
