import type { stat_data } from '../../types';

export const additionalTargetPrice = 20;

export function selectAdditionalTarget(data: stat_data, kind: '主要角色' | '次要角色', key: string): void {
  if (!data.系统.已发现目标?.length) throw new Error('请先选择首位接触目标。');
  if (!Object.hasOwn(data.角色[kind], key)) throw new Error('角色已不存在，请刷新观测页。');
  if (data.系统.已发现目标.includes(key)) throw new Error('这位角色已经是目标。');
  const balance = data.角色.user.恶堕积分;
  if (!Number.isSafeInteger(balance) || balance < additionalTargetPrice)
    throw new Error(`恶堕积分不足，需要 ${additionalTargetPrice} 点。`);
  data.角色.user.恶堕积分 = balance - additionalTargetPrice;
  data.系统.已发现目标 = [...data.系统.已发现目标, key];
}
