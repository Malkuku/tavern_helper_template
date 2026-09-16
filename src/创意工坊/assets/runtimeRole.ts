import { klona } from 'klona';

import type { TypedCollectionEntry } from '../scenario/types';

export type RuntimeRoleResult = 'added' | 'overwritten' | 'conflict';

export async function addRoleToRuntime(role: TypedCollectionEntry, overwrite = false): Promise<RuntimeRoleResult> {
  if (role.type !== '主要角色' && role.type !== '次要角色') throw new Error(`不支持的角色类型：${role.type}`);
  await waitGlobalInitialized('Mvu');
  const messageId = getLastMessageId();
  if (messageId < 0) throw new Error('当前聊天没有可写入的消息楼层。');
  const option = { type: 'message' as const, message_id: messageId };
  const previous = klona(Mvu.getMvuData(option));
  const statData = (previous as Record<string, any>).stat_data;
  const bucket = statData?.角色?.[role.type];
  if (!bucket || typeof bucket !== 'object') throw new Error(`当前运行数据缺少角色.${role.type}。`);
  const exists = Object.prototype.hasOwnProperty.call(bucket, role.key);
  if (exists && !overwrite) return 'conflict';
  const next = klona(previous) as Record<string, any>;
  next.stat_data.角色[role.type][role.key] = klona(role.data);
  try {
    await Mvu.replaceMvuData(next as Mvu.MvuData, option);
  } catch (error) {
    try { await Mvu.replaceMvuData(previous, option); }
    catch (rollbackError) { throw new AggregateError([error, rollbackError], '角色写入失败，且运行态回滚失败。'); }
    throw new Error('角色写入失败，运行态已恢复。', { cause: error });
  }
  return exists ? 'overwritten' : 'added';
}
