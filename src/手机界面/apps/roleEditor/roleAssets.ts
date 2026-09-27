import { klona } from 'klona';
import { z } from 'zod';
import { MvuUtil } from '../../../Utils/MvuUtil';
import { mainRoleSchema, minorRoleSchema, roleMetaSchema, userRoleSchema } from '../../store/initialDataSchema';
import type { 角色元数据, 次要角色人设, stat_data } from '../../types';
import { wechatRoleAvatar } from '../../../尘史使徒/UI/components/common/roleAvatarFallback';

export const ROLE_ENTRY_NAME = '<配置>角色资源';
export type PhoneRoleType = 'user' | '主要角色' | '次要角色';
export interface PhoneRoleAsset {
  author: string;
  key: string;
  desc: string;
  type: PhoneRoleType;
  meta?: 角色元数据;
  data: Record<string, any>;
}
export type PhoneRoleRegistry = Record<string, PhoneRoleAsset>;

const schemas = {
  user: userRoleSchema.omit({ meta: true }),
  主要角色: mainRoleSchema.omit({ meta: true }),
  次要角色: minorRoleSchema.omit({ meta: true }),
};
const assetSchema = z.strictObject({
  author: z.string(),
  key: z.string().min(1),
  desc: z.string(),
  type: z.enum(['user', '主要角色', '次要角色']),
  meta: roleMetaSchema.optional(),
  data: z.record(z.string(), z.unknown()),
});
const registrySchema = z.record(z.uuid(), assetSchema);

export function validateRoleAsset(asset: PhoneRoleAsset): PhoneRoleAsset {
  const result = assetSchema.parse(asset);
  if (result.type === 'user' && result.key !== 'user') throw new Error('主角资源的身份必须为 user。');
  const parsed = schemas[result.type].safeParse(result.data);
  if (!parsed.success) throw new Error(`角色数据不符合 ${result.type} 结构：${z.prettifyError(parsed.error)}`);
  return { ...result, data: parsed.data };
}

export function parseRoleRegistry(content: string): PhoneRoleRegistry {
  const registry = registrySchema.parse(JSON.parse(content));
  for (const asset of Object.values(registry)) validateRoleAsset(asset);
  return registry;
}

function roleEntry(entries: WorldbookEntry[]): WorldbookEntry {
  const matches = entries.filter(entry => entry.name === ROLE_ENTRY_NAME);
  if (matches.length !== 1) throw new Error(`主世界书需要且只能有一个 ${ROLE_ENTRY_NAME} 条目。`);
  return matches[0];
}

export async function loadPhoneRoleAssets(): Promise<PhoneRoleRegistry> {
  const { primary } = getCharWorldbookNames('current');
  if (!primary) throw new Error('当前角色没有绑定主世界书。');
  return parseRoleRegistry(roleEntry(await getWorldbook(primary)).content);
}

export async function savePhoneRoleAsset(id: string, asset: PhoneRoleAsset, original?: PhoneRoleAsset): Promise<void> {
  const checked = validateRoleAsset(asset);
  const { primary } = getCharWorldbookNames('current');
  if (!primary) throw new Error('当前角色没有绑定主世界书。');
  const previous = await getWorldbook(primary);
  const next = klona(previous);
  const entry = roleEntry(next);
  const registry = parseRoleRegistry(entry.content);
  if (original) {
    if (JSON.stringify(registry[id]) !== JSON.stringify(original))
      throw new Error('角色资源已被其他编辑修改，请重新载入。');
  } else if (registry[id]) throw new Error('新角色的资源 ID 已存在，请重试。');
  registry[id] = checked;
  entry.content = JSON.stringify(registry, null, 2);
  try {
    await replaceWorldbook(primary, next, { render: 'immediate' });
  } catch (error) {
    try {
      await replaceWorldbook(primary, previous, { render: 'immediate' });
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], '角色资源保存失败，且世界书回滚失败。');
    }
    throw new Error('角色资源保存失败，世界书已恢复。', { cause: error });
  }
}

export function runtimeRoleOf(asset: PhoneRoleAsset): Record<string, unknown> {
  return { ...klona(asset.data), meta: klona(asset.meta ?? { avatar: '', color: '#C9B485', avatarStyle: 'auto' }) };
}

export function changeRuntimeMinorRole(data: stat_data, key: string, original: 次要角色人设, next: 次要角色人设 | null): void {
  const roles = data.角色.次要角色;
  if (JSON.stringify(roles[key]) !== JSON.stringify(original))
    throw new Error('次要角色已被其他操作修改，请刷新后重试。');
  if (next === null) delete roles[key];
  else roles[key] = minorRoleSchema.parse(next);
}

export function applyPhoneRoleToStatData(
  current: Record<string, any>,
  asset: PhoneRoleAsset,
  overwrite: boolean,
): Record<string, any> {
  const next = klona(current);
  const roles = next.角色;
  const wechat = next.手机?.微信;
  if (!roles || !wechat?.账号) throw new Error('当前剧情缺少角色或微信数据。');
  const bucket = roles[asset.type];
  if (!bucket || typeof bucket !== 'object') throw new Error(`当前剧情缺少角色.${asset.type}。`);
  const exists = asset.type === 'user' ? Object.keys(bucket).length > 0 : Object.hasOwn(bucket, asset.key);
  if (exists && !overwrite) throw new Error('角色已经在当前剧情中，请选择替换。');
  const runtime = runtimeRoleOf(asset);
  if (asset.type === 'user') roles.user = runtime;
  else bucket[asset.key] = runtime;
  const id = asset.type === 'user' ? 'user' : asset.key;
  const avatar = wechatRoleAvatar(asset.meta, id);
  if (wechat.账号[id]) wechat.账号[id].头像 = avatar;
  else wechat.账号[id] = { 昵称: id === 'user' ? '我' : id, 头像: avatar, 表情包: {}, 好友: [] };
  if (asset.type === '主要角色') {
    const user = wechat.账号.user;
    if (user && !user.好友.includes(id)) user.好友.push(id);
    const account = wechat.账号[id];
    if (!account.好友.includes('user')) account.好友.push('user');
  }
  return next;
}

export async function getPhoneRuntimeRoles(): Promise<Record<string, any>> {
  await waitGlobalInitialized('Mvu');
  if (getLastMessageId() < 0) throw new Error('当前聊天没有可读取的消息楼层。');
  const current = Mvu.getMvuData({ type: 'message', message_id: -1 }) as Record<string, any>;
  if (!current?.stat_data?.角色) throw new Error('当前剧情缺少角色数据。');
  return klona(current.stat_data.角色);
}

export async function applyPhoneRoleToRuntime(asset: PhoneRoleAsset, overwrite: boolean): Promise<void> {
  validateRoleAsset(asset);
  await waitGlobalInitialized('Mvu');
  if (getLastMessageId() < 0) throw new Error('当前聊天没有可写入的消息楼层。');
  const previous = klona(Mvu.getMvuData({ type: 'message', message_id: -1 }) as Record<string, any>);
  if (!previous?.stat_data) throw new Error('当前剧情缺少角色数据。');
  const next = applyPhoneRoleToStatData(previous.stat_data, asset, overwrite);
  try {
    await MvuUtil.updateMvuDataByObj(next);
  } catch (error) {
    try {
      await MvuUtil.updateMvuDataByObj(previous.stat_data);
    } catch (rollbackError) {
      throw new AggregateError([error, rollbackError], '角色写入失败，且当前剧情回滚失败。');
    }
    throw new Error('角色写入失败，当前剧情已恢复。', { cause: error });
  }
}
