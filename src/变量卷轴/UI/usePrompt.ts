import type { stat_data } from '@/手机界面/types';

export function buildUsePrompt(
  data: stat_data | undefined,
  kind: 'skills' | 'items',
  name: string,
  quantity: number,
): string {
  const skill = kind === 'skills' ? data?.角色?.user?.技能?.[name] : undefined;
  const item = kind === 'items' ? data?.角色?.user?.物品?.[name] : undefined;
  if (!skill && !item) throw new Error('当前已不持有该技能或道具，请重新选择。');
  if (skill?.启用 === false) throw new Error('该技能尚未启用，请先在技能商店启用。');
  if (item && (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > item.数量)) {
    throw new Error(`请输入 1 到 ${item.数量} 之间的整数。`);
  }
  const details = skill
    ? { 技能名称: name, 描述: skill.描述, 作用: skill.作用 }
    : { 物品名称: name, 使用数量: quantity, 当前耐久: item!.耐久, 作用: item!.作用 };
  return `<user>决定使用${name}。\n<list>\n${JSON.stringify(details, null, 2)}\n</list>\n`;
}
