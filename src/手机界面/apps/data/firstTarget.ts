import type { stat_data } from '../../types';
import { characterImages } from './characterImages';

export const firstTargetChoices = [
  { key: '鹭见凛', title: '『秩序』的魔女' },
  { key: '雨宫雫', title: '『支配』的魔女' },
  { key: '索菲亚', title: '『伤痕』的魔女' },
  { key: '小鸟游琉璃', title: '『预见』的魔女' },
] as const;
export type FirstTargetKey = (typeof firstTargetChoices)[number]['key'];
export const firstTargetKeys: readonly FirstTargetKey[] = firstTargetChoices.map(item => item.key);

export function hasDiscoveredRole(data: stat_data): boolean {
  return (data.系统.已发现目标 ?? []).some(
    key =>
      firstTargetKeys.includes(key as FirstTargetKey) ||
      Object.hasOwn(data.角色.主要角色, key) ||
      Object.hasOwn(data.角色.次要角色, key),
  );
}

export function assignFirstTarget(data: stat_data, key: string): void {
  if (!firstTargetKeys.includes(key as FirstTargetKey) || !Object.hasOwn(characterImages, key))
    throw new Error('这位角色不能作为初始接触目标。');
  if (hasDiscoveredRole(data)) throw new Error('已经有已发现目标，不能重复选择初始目标。');
  const questName = `初始接触：${key}`;
  if (Object.hasOwn(data.任务, questName)) throw new Error('初始接触任务已存在，请检查当前任务。');
  if (Object.keys(data.任务).length >= 4) throw new Error('已接任务已达上限，无法发放初始接触任务。');
  const identity = data.角色.user.物品['伪造身份凭证'];
  if (
    identity &&
    (!Number.isSafeInteger(identity.数量) || identity.数量 < 1 || identity.数量 === Number.MAX_SAFE_INTEGER)
  )
    throw new Error('已有伪造身份凭证的数量无效，无法发放新道具。');
  data.系统.已发现目标 = [...(data.系统.已发现目标 ?? []), key];
  data.任务[questName] = {
    描述: `使用伪造身份接近${key}，为组织建立第一条可靠的接触渠道。`,
    目标: `以伪造身份与${key}完成首次接触，并确认下一次联络方式。`,
    当前进度: '进行中',
    评级: 'D',
    奖励: 5,
    已完成: false,
  };
  if (identity) {
    identity.数量 += 1;
  } else {
    data.角色.user.物品['伪造身份凭证'] = {
      描述: '组织准备的伪造身份凭证，附有可用于日常核验的身份信息。',
      作用: '用于掩护初次接触目标；具体身份与接触方式由剧情决定。',
      评级: 'D',
      价格: 0,
      数量: 1,
      耐久: 100,
    };
  }
}

export function firstTargetSystemLog(key: string): string {
  if (!firstTargetKeys.includes(key as FirstTargetKey)) throw new Error('初始目标无效。');
  return `\n<systemLog>\n<user>在「魔女恶堕计划」中选择${key}作为首位接触目标，接下初始接触任务，并领取伪造身份凭证。\n</systemLog>\n`;
}

export function firstTargetUserMessage(key: string): string {
  if (!firstTargetKeys.includes(key as FirstTargetKey)) throw new Error('初始目标无效。');
  return `<user>选择了${key}作为第一个恶堕目标`;
}
