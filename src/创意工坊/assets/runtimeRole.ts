import { klona } from 'klona';

import type { TypedCollectionEntry } from '../scenario/types';
import { applyRoleDerivedStats } from './roleStats';

export type RuntimeRoleResult = 'added' | 'overwritten' | 'conflict';

export interface RuntimeRoleSnapshot {
  user: Record<string, unknown>;
  主要角色: Record<string, unknown>;
  次要角色: Record<string, unknown>;
}

export function runtimeRoleExists(snapshot: RuntimeRoleSnapshot, type: string, key: string): boolean {
  if (type === 'user') return Object.keys(snapshot.user ?? {}).length > 0;
  if (type !== '主要角色' && type !== '次要角色') return false;
  return Object.prototype.hasOwnProperty.call(snapshot[type], key);
}

export async function getRuntimeRoles(): Promise<RuntimeRoleSnapshot> {
  await waitGlobalInitialized('Mvu');
  if (getLastMessageId() < 0) throw new Error('当前聊天没有可读取的消息楼层。');
  const value = klona(Mvu.getMvuData({ type: 'message', message_id: -1 })) as Record<string, any>;
  const roles = value.stat_data?.角色;
  if (!roles || typeof roles !== 'object') throw new Error('当前运行数据缺少角色。');
  return {
    user: roles.user && typeof roles.user === 'object' ? roles.user : {},
    主要角色: roles.主要角色 && typeof roles.主要角色 === 'object' ? roles.主要角色 : {},
    次要角色: roles.次要角色 && typeof roles.次要角色 === 'object' ? roles.次要角色 : {},
  };
}

export async function addRoleToRuntime(role: TypedCollectionEntry, overwrite = false): Promise<RuntimeRoleResult> {
  if (!['user', '主要角色', '次要角色'].includes(role.type)) throw new Error(`不支持的角色类型：${role.type}`);
  await waitGlobalInitialized('Mvu');
  const messageId = getLastMessageId();
  if (messageId < 0) throw new Error('当前聊天没有可写入的消息楼层。');
  const option = { type: 'message' as const, message_id: messageId };
  const previous = klona(Mvu.getMvuData({ type: 'message', message_id: -1 }));
  const statData = (previous as Record<string, any>).stat_data;
  const bucket = statData?.角色?.[role.type];
  if (!bucket || typeof bucket !== 'object') throw new Error(`当前运行数据缺少角色.${role.type}。`);
  const exists =
    role.type === 'user' ? Object.keys(bucket).length > 0 : Object.prototype.hasOwnProperty.call(bucket, role.key);
  if (exists && !overwrite) return 'conflict';
  const next = klona(previous) as Record<string, any>;
  const runtimeRole = {
    ...(klona(role.data) as Record<string, unknown>),
    meta: klona(role.meta ?? { avatar: '', color: '#C9B485' }),
  };
  applyRoleDerivedStats(runtimeRole);
  if (role.type === 'user') next.stat_data.角色.user = runtimeRole;
  else next.stat_data.角色[role.type][role.key] = runtimeRole;
  try {
    await Mvu.replaceMvuData(next as Mvu.MvuData, option);
  } catch (error) {
    try {
      await Mvu.replaceMvuData(previous, option);
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], '角色写入失败，且运行态回滚失败。');
    }
    throw new Error('角色写入失败，运行态已恢复。', { cause: error });
  }
  return exists ? 'overwritten' : 'added';
}
