import type { stat_data, 物品 } from '../../types';

export type InventorySide = '随身物品' | '仓库';
export interface InventoryTransfer {
  from: InventorySide;
  name: string;
  quantity: number;
}

export function inventoryOf(data: stat_data, side: InventorySide): Record<string, 物品> {
  return side === '随身物品' ? (data.角色?.user?.物品 ?? {}) : (data.仓库 ?? {});
}

export function sameItemSpec(left: 物品, right: 物品): boolean {
  return left.描述 === right.描述 && left.作用 === right.作用 && left.评级 === right.评级 && left.价格 === right.价格;
}

export function mergeItemStack(target: 物品, incoming: 物品, quantity: number): void {
  if (!sameItemSpec(target, incoming)) throw new Error('同名道具的描述、作用、评级或价格不一致，无法合并。');
  const total = target.数量 + quantity;
  const durabilitySum = target.耐久 * target.数量 + incoming.耐久 * quantity;
  if (!Number.isSafeInteger(total) || !Number.isSafeInteger(durabilitySum))
    throw new Error('道具数量或耐久超出有效范围。');
  target.耐久 = Math.ceil(durabilitySum / total);
  target.数量 = total;
  if (!target.图标 && incoming.图标) target.图标 = incoming.图标;
}

/** 在一份可写副本上顺序执行，失败由调用方丢弃副本。 */
export function applyInventoryTransfers(data: stat_data, transfers: InventoryTransfer[]): void {
  if (transfers.length && (!data.角色?.user?.物品 || !data.仓库)) throw new Error('库存变量尚未初始化。');
  for (const { from, name, quantity } of transfers) {
    if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new Error('转移数量必须为正整数。');
    const source = inventoryOf(data, from);
    const target = inventoryOf(data, from === '仓库' ? '随身物品' : '仓库');
    const item = source[name];
    if (!item || !Number.isSafeInteger(item.数量) || item.数量 < quantity)
      throw new Error(`${name} 的来源数量已变化，请刷新后重试。`);
    if (target[name] && (!Number.isSafeInteger(target[name].数量) || target[name].数量 < 0))
      throw new Error(`${name} 的目标数量无效。`);
    if (target[name]) mergeItemStack(target[name], item, quantity);
    else target[name] = { ...item, 数量: quantity };
    item.数量 -= quantity;
    if (item.数量 === 0) delete source[name];
  }
}
