import { z } from 'zod';
import type { 可购技能, stat_data } from '../../types';
import { skillSchema } from '../../store/initialDataSchema';
import { weeklyShopQuote } from '../shopRefresh';
import { isGeneratedShopIcon } from '../shopIcon';
import { userRatingFromSkills } from '../../store/userRating';
import { InvalidGeneratedResultError, latestGeneratedPayload } from '../generationResult';

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
const shopSchema = z.record(z.string().min(1), generatedSkillSchema);

export function refreshQuote(data: stat_data): { next: string; count: number; price: number } {
  return weeklyShopQuote(data, '技能');
}

function validPrice(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export const MAX_SKILL_SLOTS = 12;

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
  if (price === null) throw new Error('技能栏位已达到 12 格上限。');
  const balance = data.角色.user.恶堕积分;
  if (!Number.isSafeInteger(balance) || balance < price) throw new Error(`恶堕积分不足，需要 ${price} 点。`);
  data.角色.user.恶堕积分 -= price;
  data.角色.user.技能栏位 = skillSlotCount(data) + 1;
  return price;
}

export function parseSkillResult(message: string): Record<string, 可购技能> {
  const payload = latestGeneratedPayload(message, '<skillVariable');
  if (payload === undefined) throw new Error('技能生成结果缺少完整的 skillVariable 标签。');
  let raw: unknown;
  try {
    raw = JSON.parse(payload);
  } catch {
    throw new Error('技能生成结果不是合法 JSON。');
  }
  const parsed = shopSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(
      '技能生成字段校验失败',
      parsed.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
    );
    const issue = parsed.error.issues[0];
    throw new Error(`技能生成字段无效：${issue.path.join('.')} ${issue.message}`);
  }
  const entries = Object.entries(parsed.data);
  if (entries.length !== 6) throw new Error('技能生成结果必须恰好包含 6 个不同名称的技能。');
  for (const [name, item] of entries) {
    if (
      !name.trim() ||
      !item.描述.trim() ||
      !item.作用.trim() ||
      !item.适用评级.trim() ||
      !validPrice(item.价格) ||
      !Number.isFinite(item.战力评级贡献) ||
      item.战力评级贡献 < 0
    )
      throw new Error(`技能「${name}」的内容或数值无效。`);
  }
  return parsed.data;
}

export function applySkillRefresh(data: stat_data, message: string): void {
  let shop: Record<string, 可购技能>;
  try {
    shop = parseSkillResult(message);
  } catch (error) {
    throw new InvalidGeneratedResultError(error);
  }
  const quote = refreshQuote(data);
  if (!Number.isSafeInteger(data.角色.user.恶堕积分) || data.角色.user.恶堕积分 < quote.price)
    throw new Error(`恶堕积分不足，需要 ${quote.price} 点。`);
  data.技能商店 = shop;
  data.角色.user.恶堕积分 -= quote.price;
  data.系统.技能下次刷新时间 = quote.next;
  data.系统.技能主动刷新次数 = quote.count + 1;
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
  const rating = userRatingFromSkills({ ...data.角色.user.技能, [name]: nextSkill });
  data.角色.user.恶堕积分 -= item.价格;
  data.角色.user.技能[name] = nextSkill;
  data.角色.user.当前评级 = rating;
  delete data.技能商店[name];
}

export function sellSkill(data: stat_data, name: string): number {
  const item = data.角色.user.技能[name];
  if (!item) throw new Error('当前没有这项技能。');
  if (!validPrice(item.价格)) throw new Error('技能累计价格无效。');
  const refund = Math.floor(item.价格 / 2);
  const balance = data.角色.user.恶堕积分;
  if (!Number.isSafeInteger(balance) || !Number.isSafeInteger(balance + refund)) throw new Error('恶堕积分余额无效。');
  const remaining = { ...data.角色.user.技能 };
  delete remaining[name];
  const rating = userRatingFromSkills(remaining);
  data.角色.user.恶堕积分 += refund;
  delete data.角色.user.技能[name];
  data.角色.user.当前评级 = rating;
  return refund;
}
