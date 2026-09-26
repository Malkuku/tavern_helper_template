import { klona } from 'klona';
import { z } from 'zod';
import { initialStatDataSchema } from './initialDataSchema';

type JsonRecord = Record<string, unknown>;
type ConfigEntry = Pick<WorldbookEntry, 'name' | 'content'>;

const scenarioSchema = z
  .object({
    author: z.string(),
    key: z.string().min(1),
    desc: z.string(),
    可用: z.literal(true),
    内容配置: z
      .object({
        世界: z.record(z.string(), z.unknown()),
        角色: z.array(z.uuid()).min(1),
        地图: z.uuid(),
        仓库: z.record(z.string(), z.unknown()),
      })
      .strict(),
  })
  .strict();
const openingSchema = z.record(z.uuid(), scenarioSchema);
const openingDocumentSchema = z.object({ 固定数据: z.record(z.string(), z.unknown()), 开场白: openingSchema }).strict();
const roleEntrySchema = z
  .object({
    author: z.string(),
    key: z.string().min(1),
    desc: z.string(),
    type: z.enum(['user', '主要角色', '次要角色']),
    data: z.record(z.string(), z.unknown()),
  })
  .strict();
const registrySchema = z.record(z.uuid(), roleEntrySchema);
const mapRegistrySchema = z.record(
  z.uuid(),
  z.object({ author: z.string(), desc: z.string(), data: z.record(z.string(), z.unknown()) }).strict(),
);

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readJsonEntry(entries: ConfigEntry[], name: string): unknown {
  const matches = entries.filter(entry => entry.name === name);
  if (matches.length !== 1) throw new Error(`主世界书需要且只能有一个 ${name} 条目。`);
  try {
    return JSON.parse(matches[0].content);
  } catch (cause) {
    throw new Error(`${name} 不是有效 JSON。`, { cause });
  }
}

function seedWechatFriends(data: JsonRecord): void {
  const phone = data.手机;
  const wechat = isRecord(phone) ? phone.微信 : undefined;
  const accountMap = isRecord(wechat) ? wechat.账号 : undefined;
  const sessions = isRecord(wechat) ? wechat.会话 : undefined;
  const mainRoles = (data.角色 as JsonRecord).主要角色 as JsonRecord;
  if (!isRecord(accountMap) || Object.keys(accountMap).length) throw new Error('唯一开局必须提供空的微信账号表。');
  if (!isRecord(sessions) || Object.keys(sessions).length || !isRecord(wechat) || wechat.准备发送 !== null)
    throw new Error('唯一开局必须提供空的微信会话与发送缓冲。');
  const mainIds = Object.keys(mainRoles);
  for (const id of ['user', ...mainIds]) {
    accountMap[id] = {
      昵称: id === 'user' ? '我' : id,
      头像: '',
      表情包: {},
      好友: id === 'user' ? mainIds : ['user'],
    };
  }
}

/** 仅为新聊天组装一次初始变量；已有运行状态保持原样。 */
export function reconcileWorldbookStatData(
  current: unknown,
  entries: ConfigEntry[],
): { data: JsonRecord; changed: boolean } {
  if (!isRecord(current)) throw new Error('当前楼层 stat_data 缺失或无效。');
  if (Object.keys(current).length !== 1 || current.作者 !== 987) return { data: klona(current), changed: false };
  const openingDocument = openingDocumentSchema.parse(readJsonEntry(entries, '<配置>唯一开局'));
  const fixed = openingDocument.固定数据;
  const openingEntries = Object.values(openingDocument.开场白);
  if (openingEntries.length !== 1) throw new Error('主世界书必须且只能有一个可用开局。');
  const opening = openingEntries[0];
  const registry = registrySchema.parse(readJsonEntry(entries, '<配置>角色资源'));
  const maps = mapRegistrySchema.parse(readJsonEntry(entries, '<配置>地图资源'));
  const map = maps[opening.内容配置.地图];
  if (!map) throw new Error(`唯一开局引用的地图资源不存在：${opening.内容配置.地图}。`);
  const selected = new Set<string>();
  const roles: JsonRecord = { 主要角色: {}, 次要角色: {} };
  for (const id of opening.内容配置.角色) {
    if (selected.has(id)) throw new Error(`唯一开局重复引用角色资源：${id}。`);
    selected.add(id);
    const entry = registry[id];
    if (!entry) throw new Error(`唯一开局引用的角色资源不存在：${id}。`);
    if (entry.type === 'user') {
      if (entry.key !== 'user' || roles.user) throw new Error('唯一开局必须且只能引用一个 user。');
      roles.user = klona(entry.data);
    } else {
      const bucket = roles[entry.type] as JsonRecord;
      if (bucket[entry.key]) throw new Error(`唯一开局重复角色身份：${entry.type}.${entry.key}。`);
      bucket[entry.key] = klona(entry.data);
    }
  }
  if (!roles.user) throw new Error('唯一开局缺少 user 角色。');
  if (fixed.世界 !== undefined || fixed.角色 !== undefined || fixed.地图 !== undefined)
    throw new Error('基础数据不能预置世界、角色或地图。');
  if (!isRecord(fixed.仓库) || Object.keys(fixed.仓库).length)
    throw new Error('基础数据必须提供空仓库；开局仓库由开场内容配置提供。');
  const data: JsonRecord = {
    ...klona(fixed),
    世界: klona(opening.内容配置.世界),
    角色: roles,
    地图: klona(map.data),
    仓库: klona(opening.内容配置.仓库),
  };
  seedWechatFriends(data);
  const parsed = initialStatDataSchema.safeParse(data);
  if (!parsed.success) throw new Error(`唯一开局组装结果不符合手机变量契约：${z.prettifyError(parsed.error)}`);
  return { data: parsed.data as unknown as JsonRecord, changed: true };
}
