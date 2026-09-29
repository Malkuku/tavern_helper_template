import { z } from 'zod';
import type { stat_data, 物品 } from '../../types';
import { itemSchema } from '../../store/initialDataSchema';
import { inventoryOf, mergeItemStack, sameItemSpec, type InventorySide } from '../data/inventoryTransfer';
import { directedRefreshPrice, weeklyShopQuote } from '../shopRefresh';
import { isGeneratedShopIcon } from '../shopIcon';
import { latestGeneratedPayload } from '../generationResult';

const generatedItemSchema = z.object({
  ...itemSchema.shape,
  图标: z.preprocess(
    value =>
      typeof value === 'string' && itemSchema.shape.图标.safeParse(value).success && isGeneratedShopIcon(value)
        ? value
        : undefined,
    itemSchema.shape.图标,
  ),
});
const generatedRecordSchema = z.record(z.string(), z.unknown());

export function itemRefreshQuote(data: stat_data): { next: string; count: number; price: number } {
  return weeklyShopQuote(data, '道具');
}

export function parseItemResult(message: string, data: stat_data): Record<string, 物品> {
  const payload = latestGeneratedPayload(message, '<shopVariable');
  if (payload === undefined) throw new Error('道具生成结果缺少完整的 shopVariable 标签。');
  let raw: unknown;
  try {
    raw = JSON.parse(payload);
  } catch {
    throw new Error('道具生成结果不是合法 JSON。');
  }
  const parsed = generatedRecordSchema.safeParse(raw);
  if (!parsed.success) throw new Error('道具生成结果必须是商品对象。');
  const previous = [data.角色.user.物品, data.仓库, data.商店];
  const accepted: [string, 物品][] = [];
  for (const [name, value] of Object.entries(parsed.data)) {
    const result = generatedItemSchema.safeParse(value);
    if (!name.trim() || !result.success) continue;
    const item = result.data;
    if (!item.描述.trim() || !item.作用.trim() || item.耐久 <= 0 || item.价格 <= 0) continue;
    const old = previous.map(source => source[name]).filter((value): value is 物品 => !!value);
    if (old.some(value => !itemSchema.safeParse(value).success)) continue;
    if (old.length > 1 && old.some(value => !sameItemSpec(value, old[0]))) continue;
    if (old.length) {
      const source = old[0];
      item.描述 = source.描述;
      item.作用 = source.作用;
      item.评级 = source.评级;
      item.价格 = source.价格;
      item.图标 = source.图标 || item.图标;
    }
    accepted.push([name, item]);
  }
  if (!accepted.length) throw new Error('道具生成结果没有可上架的商品。');
  return Object.fromEntries(accepted);
}

export function applyItemRefresh(data: stat_data, message: string, directed = false): void {
  const shop = parseItemResult(message, data);
  const quote = itemRefreshQuote(data);
  const price = directed ? directedRefreshPrice(data, '道具', quote.price) : quote.price;
  const balance = data.角色.user.恶堕积分;
  if (!Number.isSafeInteger(balance) || balance < price) throw new Error(`恶堕积分不足，需要 ${price} 点。`);
  data.商店 = shop;
  data.角色.user.恶堕积分 -= price;
  data.系统.商店下次刷新时间 = quote.next;
  data.系统.商店主动刷新次数 = quote.count + 1;
  if (directed) data.手机.定向刷新 = null;
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
