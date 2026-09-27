import { z } from 'zod';
import type { stat_data, 物品 } from '../../types';
import { itemSchema } from '../../store/initialDataSchema';
import { inventoryOf, mergeItemStack, sameItemSpec, type InventorySide } from '../data/inventoryTransfer';
import { weeklyShopQuote } from '../shopRefresh';
import { isGeneratedShopIcon } from '../shopIcon';

const shopSchema = z.record(z.string().min(1), itemSchema);

export function itemRefreshQuote(data: stat_data): { next: string; count: number; price: number } {
  return weeklyShopQuote(data, '道具');
}

export function parseItemResult(message: string, data: stat_data): Record<string, 物品> {
  const tags = [...message.matchAll(/<shopVariable>\s*([\s\S]*?)\s*<\/shopVariable>/g)];
  if (tags.length !== 1 || [...message.matchAll(/<shopVariable>/g)].length !== 1)
    throw new Error('道具生成结果必须包含且只包含一个完整的 shopVariable 标签。');
  let raw: unknown;
  try {
    raw = JSON.parse(tags[0][1]);
  } catch {
    throw new Error('道具生成结果不是合法 JSON。');
  }
  const parsed = shopSchema.safeParse(raw);
  if (!parsed.success) throw new Error('道具生成字段无效。');
  const entries = Object.entries(parsed.data);
  if (entries.length !== 9) throw new Error('道具生成结果必须恰好包含 9 个不同名称的商品。');
  const previous = [data.角色.user.物品, data.仓库, data.商店];
  for (const [name, item] of entries) {
    if (!name.trim() || !item.描述.trim() || !item.作用.trim() || item.耐久 <= 0 || item.价格 <= 0)
      throw new Error(`道具「${name}」的内容或数值无效。`);
    if (!isGeneratedShopIcon(item.图标))
      throw new Error(`道具「${name}」必须提供不含文字、正方形 viewBox 的 SVG 图标。`);
    const old = previous.map(source => source[name]).filter((value): value is 物品 => !!value);
    if (old.some(value => !itemSchema.safeParse(value).success))
      throw new Error(`现有道具「${name}」的字段或图标无效。`);
    if (old.length > 1 && old.some(value => !sameItemSpec(value, old[0])))
      throw new Error(`现有道具「${name}」在随身、仓库或旧货架中的规格不一致。`);
    if (old.length) {
      const source = old[0];
      item.描述 = source.描述;
      item.作用 = source.作用;
      item.评级 = source.评级;
      item.价格 = source.价格;
      item.图标 = source.图标 || item.图标;
    }
  }
  return parsed.data;
}

export function applyItemRefresh(data: stat_data, message: string): void {
  const shop = parseItemResult(message, data);
  const quote = itemRefreshQuote(data);
  const balance = data.角色.user.恶堕积分;
  if (!Number.isSafeInteger(balance) || balance < quote.price)
    throw new Error(`恶堕积分不足，需要 ${quote.price} 点。`);
  data.商店 = shop;
  data.角色.user.恶堕积分 -= quote.price;
  data.系统.商店下次刷新时间 = quote.next;
  data.系统.商店主动刷新次数 = quote.count + 1;
}

export function buyItem(data: stat_data, name: string, quantity: number): void {
  const item = data.商店[name];
  if (!item) throw new Error('货架中没有这件道具。');
  if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > item.数量)
    throw new Error('购买数量无效或超过库存。');
  if (!Number.isSafeInteger(item.价格) || item.价格 <= 0) throw new Error('道具价格无效。');
  const cost = item.价格 * quantity;
  if (!Number.isSafeInteger(cost)) throw new Error('道具总价超出有效范围。');
  const balance = data.角色.user.恶堕积分;
  if (!Number.isSafeInteger(balance) || balance < cost) throw new Error('恶堕积分不足。');
  const owned = data.角色.user.物品[name];
  if (owned) mergeItemStack(owned, item, quantity);
  else data.角色.user.物品[name] = { ...item, 数量: quantity };
  item.数量 -= quantity;
  if (item.数量 === 0) delete data.商店[name];
  data.角色.user.恶堕积分 -= cost;
}

export function sellItem(data: stat_data, side: InventorySide, name: string, quantity: number): number {
  const inventory = inventoryOf(data, side);
  const item = inventory[name];
  if (!item) throw new Error(`${side}没有这件道具。`);
  if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > item.数量)
    throw new Error('出售数量无效或超过持有数量。');
  if (!Number.isSafeInteger(item.价格) || item.价格 < 0) throw new Error('道具单件基准价格无效。');
  const refund = Math.floor(item.价格 / 2) * quantity;
  if (!Number.isSafeInteger(refund)) throw new Error('出售返还超出有效范围。');
  const balance = data.角色.user.恶堕积分;
  if (!Number.isSafeInteger(balance) || !Number.isSafeInteger(balance + refund)) throw new Error('恶堕积分余额无效。');
  item.数量 -= quantity;
  if (item.数量 === 0) delete inventory[name];
  data.角色.user.恶堕积分 += refund;
  return refund;
}
