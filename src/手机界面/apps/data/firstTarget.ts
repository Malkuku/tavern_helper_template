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
      goal: '通过青叶学园的公开渠道找到可提供的实际协助，与鹭见凛建立后续联系。',
    },
    item: {
      name: '青叶学园公开事务简报',
      description: '组织汇总的青叶学园公开事务和学生会对外联络信息，不包含私人行程。',
      effect: '用于核实公开事务、准备具体协助，并通过正式渠道联系学生会。',
    },
  },
  {
    key: '雨宫雫',
    title: '魔法少女「绯丝舞者」',
    identity: '孤儿院的孩子',
    lead: '常借姐姐人偶表达自己；接触时应尊重她本人的意愿。',
    quest: {
      description: '雨宫雫住在孤儿院，平时安静谨慎，魔法少女活动时常借姐姐人偶与人交流。',
      goal: '确认孤儿院允许参与的公开活动，经工作人员同意后与雨宫雫本人进行一次自愿交流。',
    },
    item: {
      name: '基础缝补工具包',
      description: '装有针线、布片和小剪刀的普通缝补工具包。',
      effect: '可修补普通布偶、衣物和布制小物，也可用于手工活动。',
    },
  },
  {
    key: '索菲亚',
    title: '魔法少女「伤祷圣女」',
    identity: '白鹭大学二年级生',
    lead: '愿意帮助伤者；可靠的实际支援比求助表演更适合建立信任。',
    quest: {
      description: '索菲亚就读白鹭大学，遇到需要帮助的人时很难袖手旁观。',
      goal: '在真实的援助场合提供一次力所能及的协助，与索菲亚建立后续联系。',
    },
    item: {
      name: '便携急救包',
      description: '装有绷带、消毒用品和敷料的普通急救包。',
      effect: '可对轻微外伤进行基础处理，并在等待专业救治时提供临时支援。',
    },
  },
  {
    key: '小鸟游琉璃',
    title: '魔法少女「千见」',
    identity: '金融从业者',
    lead: '喜欢有风险和选择空间的局面；空洞的收益保证难以引起兴趣。',
    quest: {
      description: '小鸟游琉璃在金融行业积累了财富，擅长判断风险，也喜欢观察别人的选择。',
      goal: '利用公开资料准备一份能说明风险与选择的提案，争取与小鸟游琉璃再次交流。',
    },
    item: {
      name: '公开市场资料夹',
      description: '整理了公开行业信息、财务披露查阅入口和风险核对清单。',
      effect: '可核对公开市场信息，辅助准备有依据的提案；不提供内幕消息或收益保证。',
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
