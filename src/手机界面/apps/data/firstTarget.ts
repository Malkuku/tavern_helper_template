import type { stat_data, 物品 } from '../../types';
import { characterImages } from './characterImages';
import { mergeItemStack } from './inventoryTransfer';

export const firstTargetChoices = [
  {
    key: '鹭见凛',
    title: '魔法少女「白金裁定」',
    identity: '青叶学园学生会长',
    lead: '重视守规则与具体帮助；空泛恭维很难打动她。',
    quest: {
      description: '鹭见凛是青叶学园学生会长，做事认真，习惯以规则和事实判断来人。',
      goal: '以转学生身份进入青叶学园，参与学生会公开事务，与鹭见凛建立后续联系。',
    },
    item: {
      name: '青叶学园转学生证明',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 17h8M12 9l.8 1.6 1.8.3-1.3 1.3.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.3 1.8-.3L12 9Z"/></svg>',
      description: '组织为玩家安排的转学生掩护身份与配套入学证明，资料可供青叶学园核验。',
      effect: '用于以转学生身份进入青叶学园，参加公开校园活动；不能直接获得学生会权限或鹭见凛的信任。',
    },
  },
  {
    key: '雨宫雫',
    title: '魔法少女「绯丝舞者」',
    identity: '孤儿院的孩子',
    lead: '常借姐姐人偶表达自己；接触时应尊重她本人的意愿。',
    quest: {
      description: '雨宫雫住在孤儿院，平时安静谨慎，魔法少女活动时常借姐姐人偶与人交流。',
      goal: '以登记志愿者身份参加孤儿院获准的公开活动，经工作人员同意后与雨宫雫本人进行一次自愿交流。',
    },
    item: {
      name: '孤儿院志愿者登记函',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l3 3v15H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M15 3v4h3M8 17h6M11 14.5l-2.6-2.6a1.8 1.8 0 0 1 2.6-2.5 1.8 1.8 0 0 1 2.6 2.5L11 14.5Z"/></svg>',
      description: '组织为玩家准备的志愿者掩护身份及活动登记函，记载可报名的公开活动。',
      effect: '用于向孤儿院工作人员申请参加公开活动；进入院内及接触孩子仍须取得工作人员同意。',
    },
  },
  {
    key: '索菲亚',
    title: '魔法少女「伤祷圣女」',
    identity: '白鹭大学二年级生',
    lead: '愿意帮助伤者；可靠的实际支援比求助表演更适合建立信任。',
    quest: {
      description: '索菲亚就读白鹭大学，遇到需要帮助的人时很难袖手旁观。',
      goal: '以白鹭大学交换生身份参加校园公益活动，在真实的援助场合提供协助，与索菲亚建立后续联系。',
    },
    item: {
      name: '白鹭大学交换生证明',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="m7 10 5-2.5 5 2.5-5 2.5-5-2.5ZM9 12v3c2 1.5 4 1.5 6 0v-3M17 10v4M8 18h8"/></svg>',
      description: '组织为玩家安排的交换生掩护身份与配套入学证明，资料可供白鹭大学核验。',
      effect: '用于以交换生身份进入白鹭大学并报名公开的校园公益活动。',
    },
  },
  {
    key: '小鸟游琉璃',
    title: '魔法少女「千见」',
    identity: '金融从业者',
    lead: '喜欢有风险和选择空间的局面；空洞的收益保证难以引起兴趣。',
    quest: {
      description: '小鸟游琉璃在金融行业积累了财富，擅长判断风险，也喜欢观察别人的选择。',
      goal: '以投资研究助理身份参加公开行业活动，准备一份说明风险与选择的提案，争取与小鸟游琉璃再次交流。',
    },
    item: {
      name: '投资研究助理工作证明',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="15" rx="2"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M7 17l3-3 2 1 4-4M15 11h2v2"/></svg>',
      description: '组织为玩家安排的投资研究助理掩护身份与配套工作证明，附公开行业活动报名信息。',
      effect: '用于以研究助理身份报名公开行业活动；不能获取内部资料或保证与小鸟游琉璃见面。',
    },
  },
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
  const choice = firstTargetChoices.find(item => item.key === key);
  if (!choice || !Object.hasOwn(characterImages, key)) throw new Error('这位角色不能作为初始接触目标。');
  if (hasDiscoveredRole(data)) throw new Error('已经有已发现目标，不能重复选择初始目标。');
  const questName = `初始接触：${key}`;
  if (Object.hasOwn(data.任务, questName)) throw new Error('初始接触任务已存在，请检查当前任务。');
  if (Object.keys(data.任务).length >= 4) throw new Error('已接任务已达上限，无法发放初始接触任务。');
  const grant: 物品 = {
    图标: choice.item.icon,
    描述: choice.item.description,
    作用: choice.item.effect,
    评级: 'D',
    价格: 0,
    数量: 1,
    耐久: 100,
  };
  const existing = data.角色.user.物品[choice.item.name];
  if (existing && (!Number.isSafeInteger(existing.数量) || existing.数量 < 1))
    throw new Error(`已有${choice.item.name}的数量无效，无法发放新道具。`);
  const nextItem = existing ? { ...existing } : grant;
  if (existing) mergeItemStack(nextItem, grant, 1);
  data.系统.已发现目标 = [...(data.系统.已发现目标 ?? []), key];
  data.任务[questName] = {
    描述: choice.quest.description,
    目标: choice.quest.goal,
    当前进度: '进行中',
    评级: 'D',
    奖励: 5,
    已完成: false,
  };
  data.角色.user.物品[choice.item.name] = nextItem;
}

export function firstTargetSystemLog(key: string): string {
  const choice = firstTargetChoices.find(item => item.key === key);
  if (!choice) throw new Error('初始目标无效。');
  return `\n<systemLog>\n<user>在「魔女恶堕计划」中选择${key}作为首位接触目标，接下初始接触任务，并领取${choice.item.name}。\n</systemLog>\n`;
}
