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
    if (target[name]) target[name].数量 += quantity;
    else target[name] = { ...item, 数量: quantity };
    item.数量 -= quantity;
    if (item.数量 === 0) delete source[name];
  }
}
