import { z } from 'zod';
import type { 可购技能, stat_data } from '../../types';
import { skillSchema } from '../../store/initialDataSchema';
import { weeklyShopQuote } from '../shopRefresh';
import { isGeneratedShopIcon } from '../shopIcon';
import { userRatingFromSkills } from '../../store/userRating';
import { InvalidGeneratedResultError } from '../generationResult';

const shopSchema = z.record(z.string().min(1), skillSchema);

export function refreshQuote(data: stat_data): { next: string; count: number; price: number } {
  return weeklyShopQuote(data, '技能');
}

function validPrice(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export function parseSkillResult(message: string, owned: stat_data['角色']['user']['技能']): Record<string, 可购技能> {
  const tags = [...message.matchAll(/<skillVariable>\s*([\s\S]*?)\s*<\/skillVariable>/g)];
  if (tags.length !== 1 || [...message.matchAll(/<skillVariable>/g)].length !== 1)
    throw new Error('技能生成结果必须包含且只包含一个完整的 skillVariable 标签。');
  let raw: unknown;
  try {
    raw = JSON.parse(tags[0][1]);
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
  const overlap = entries.filter(([name]) => Object.hasOwn(owned, name));
  if (overlap.length < (Object.keys(owned).length ? 1 : 0) || overlap.length > Math.min(3, Object.keys(owned).length))
    throw new Error('升级技能数量必须为 1～3 个，且只能来自当前持有技能。');
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
    if (owned[name] && item.战力评级贡献 <= owned[name].战力评级贡献)
      throw new Error(`技能「${name}」的升级版战力评级贡献必须提高。`);
    if (!isGeneratedShopIcon(item.图标)) throw new Error(`技能「${name}」的图标必须使用正方形 viewBox。`);
  }
  return parsed.data;
}

export function applySkillRefresh(data: stat_data, message: string): void {
  let shop: Record<string, 可购技能>;
  try {
    shop = parseSkillResult(message, data.角色.user.技能);
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
  if (current && item.战力评级贡献 <= current.战力评级贡献) throw new Error('升级版战力评级贡献必须高于当前版本。');
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
