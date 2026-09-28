import type { stat_data, 微信数据 } from '../types';

export function isDiscoveredTarget(data: stat_data | null | undefined, key: string): boolean {
  return key === 'user' || data?.系统?.已发现目标?.includes(key) === true;
}

/** 只生成展示视图，不修改楼层变量或微信历史。 */
export function visibleWeChatData(data: stat_data | null | undefined, source = data?.手机?.微信): 微信数据 | null {
  if (!data || !source) return null;
  const accounts = Object.fromEntries(Object.entries(source.账号).filter(([id]) => isDiscoveredTarget(data, id)));
  const sessions = Object.fromEntries(
    Object.entries(source.会话).filter(([, session]) => session.成员.every(id => isDiscoveredTarget(data, id))),
  );
  return {
    ...source,
    账号: accounts,
    会话: sessions,
    准备发送: source.准备发送 && Object.hasOwn(sessions, source.准备发送.会话) ? source.准备发送 : null,
  };
}
